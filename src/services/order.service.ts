// src/services/order.service.ts
import { db } from '../db';
import { orders, lenses, notifications } from '../db/schema';
import { eq } from 'drizzle-orm';
import { InventoryService } from './inventory.service';

interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  lensId: string;
  branchCode: string;
  startDate: string;
  endDate: string;
}

export const OrderService = {
  async createOrder(input: CreateOrderInput) {
    return db.transaction(async (tx) => {
      // 1. Validate lens exists
      const lens = await tx.select().from(lenses).where(eq(lenses.id, input.lensId));
      if (!lens[0]) {
        throw new Error('Lens not found');
      }

      // 2. Calculate rental duration & price
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) throw new Error('End date must be after start date');
      const totalPrice = (days * parseFloat(lens[0].dayPrice)).toFixed(2);

      // 3. Create order first (pending status)
      const [order] = await tx.insert(orders).values({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        lensId: input.lensId,
        branchCode: input.branchCode,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'pending',
      }).returning();
      
      if (!order) {
        throw new Error('Failed to create order');
      }

      // 4. Reserve stock (this will throw if insufficient stock)
      try {
        await InventoryService.reserveStock({
          orderId: order.id,
          lensId: input.lensId,
          branchCode: input.branchCode,
          quantity: 1,
        });
      } catch (error: any) {
        // If stock reservation fails, rollback order creation
        throw new Error(`Stock reservation failed: ${error.message}`);
      }

      // 5. Update order status to confirmed
      const [confirmedOrder] = await tx
        .update(orders)
        .set({ status: 'confirmed' })
        .where(eq(orders.id, order.id))
        .returning();

      // 6. Send notification
      await tx.insert(notifications).values({
        orderId: order.id,
        type: 'order_placed',
        recipient: input.customerEmail,
        message: `Hi ${input.customerName}, your rental order for ${lens[0].modelName} has been placed at branch ${input.branchCode}. Order ID: ${order.id}`,
      });

      return confirmedOrder;
    });
  },

  async cancelOrder(orderId: string) {
    return db.transaction(async (tx) => {
      // 1. Get order
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled') {
        throw new Error('Order is already cancelled');
      }

      if (order.status === 'returned') {
        throw new Error('Cannot cancel a returned order');
      }

      // 2. Update order status to cancelled
      const [cancelledOrder] = await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, orderId))
        .returning();

      // 3. Release stock
      try {
        await InventoryService.releaseStock({
          orderId: order.id,
          lensId: order.lensId,
          branchCode: order.branchCode,
          quantity: 1,
        });
      } catch (error: any) {
        // Log error but don't fail the cancellation
        console.error('Failed to release stock:', error.message);
      }

      // 4. Send cancellation notification
      await tx.insert(notifications).values({
        orderId: order.id,
        type: 'order_cancelled',
        recipient: order.customerEmail,
        message: `Hi ${order.customerName}, your order ${order.id} has been cancelled. Stock has been released at branch ${order.branchCode}.`,
      });

      return cancelledOrder;
    });
  },

  async getOrderById(id: string) {
    const results = await db.select().from(orders).where(eq(orders.id, id));
    return results[0] || null;
  },

  async getAllOrders() {
    return db.select().from(orders);
  },
};
