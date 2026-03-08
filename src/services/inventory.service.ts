// src/services/inventory.service.ts
import { db } from '../db';
import { inventory, branches, lenses } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ReserveStockInput {
  orderId: string;
  lensId: string;
  branchCode: string;
  quantity: number;
}

interface ReleaseStockInput {
  orderId: string;
  lensId: string;
  branchCode: string;
  quantity: number;
}

export const InventoryService = {
  async getStockByLens(lensId: string) {
    // Get stock across all branches for a specific lens
    const stocks = await db
      .select({
        branchCode: inventory.branchCode,
        branchName: branches.name,
        branchLocation: branches.location,
        totalQuantity: inventory.totalQuantity,
        availableQuantity: inventory.availableQuantity,
      })
      .from(inventory)
      .leftJoin(branches, eq(inventory.branchCode, branches.code))
      .where(eq(inventory.lensId, lensId));

    return stocks;
  },

  async getStockByBranch(branchCode: string) {
    // Get all lens stock at a specific branch
    const stocks = await db
      .select({
        lensId: inventory.lensId,
        lensModel: lenses.modelName,
        lensManufacturer: lenses.manufacturerName,
        totalQuantity: inventory.totalQuantity,
        availableQuantity: inventory.availableQuantity,
      })
      .from(inventory)
      .leftJoin(lenses, eq(inventory.lensId, lenses.id))
      .where(eq(inventory.branchCode, branchCode));

    return stocks;
  },

  async reserveStock(input: ReserveStockInput) {
    return db.transaction(async (tx) => {
      // Find inventory record
      const [inventoryRecord] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.lensId, input.lensId),
            eq(inventory.branchCode, input.branchCode)
          )
        );

      if (!inventoryRecord) {
        throw new Error(`No inventory found for lens ${input.lensId} at branch ${input.branchCode}`);
      }

      if (inventoryRecord.availableQuantity < input.quantity) {
        throw new Error(
          `Insufficient stock. Available: ${inventoryRecord.availableQuantity}, Requested: ${input.quantity}`
        );
      }

      // Decrease available quantity
      const [updated] = await tx
        .update(inventory)
        .set({
          availableQuantity: sql`${inventory.availableQuantity} - ${input.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryRecord.id))
        .returning();

      return updated;
    });
  },

  async releaseStock(input: ReleaseStockInput) {
    return db.transaction(async (tx) => {
      // Find inventory record
      const [inventoryRecord] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.lensId, input.lensId),
            eq(inventory.branchCode, input.branchCode)
          )
        );

      if (!inventoryRecord) {
        throw new Error(`No inventory found for lens ${input.lensId} at branch ${input.branchCode}`);
      }

      // Increase available quantity (return stock)
      const [updated] = await tx
        .update(inventory)
        .set({
          availableQuantity: sql`${inventory.availableQuantity} + ${input.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryRecord.id))
        .returning();

      return updated;
    });
  },

  async getAllBranches() {
    return db.select().from(branches);
  },

  async getBranchByCode(code: string) {
    const [branch] = await db.select().from(branches).where(eq(branches.code, code));
    return branch || null;
  },
};
