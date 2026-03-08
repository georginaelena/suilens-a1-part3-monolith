// src/routes/inventory.routes.ts
import { Elysia, t } from 'elysia';
import { InventoryService } from '../services/inventory.service';

export const inventoryRoutes = new Elysia({ prefix: '/api/inventory' })
  // Get all branches
  .get('/branches', async () => {
    return InventoryService.getAllBranches();
  })

  // Get branch by code
  .get('/branches/:code', async ({ params }) => {
    const branch = await InventoryService.getBranchByCode(params.code);
    if (!branch) {
      return new Response(JSON.stringify({ error: 'Branch not found' }), { status: 404 });
    }
    return branch;
  })

  // Get stock for a specific lens across all branches
  .get('/lenses/:lensId', async ({ params }) => {
    const stocks = await InventoryService.getStockByLens(params.lensId);
    return stocks;
  })

  // Get all stock at a specific branch
  .get('/branches/:code/stock', async ({ params }) => {
    const stocks = await InventoryService.getStockByBranch(params.code);
    return stocks;
  })

  // Reserve stock (called by order service)
  .post('/reserve', async ({ body }) => {
    try {
      const result = await InventoryService.reserveStock(body);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Stock reserved successfully',
          inventory: result 
        }),
        { status: 200 }
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient stock')) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 409 } // Conflict
        );
      }
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }
  }, {
    body: t.Object({
      orderId: t.String({ format: 'uuid' }),
      lensId: t.String({ format: 'uuid' }),
      branchCode: t.String(),
      quantity: t.Number({ minimum: 1 }),
    }),
  })

  // Release stock (called when order is cancelled)
  .post('/release', async ({ body }) => {
    try {
      const result = await InventoryService.releaseStock(body);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Stock released successfully',
          inventory: result 
        }),
        { status: 200 }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }
  }, {
    body: t.Object({
      orderId: t.String({ format: 'uuid' }),
      lensId: t.String({ format: 'uuid' }),
      branchCode: t.String(),
      quantity: t.Number({ minimum: 1 }),
    }),
  });
