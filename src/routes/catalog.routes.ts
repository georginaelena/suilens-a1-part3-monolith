import { Elysia } from 'elysia';
import { CatalogService } from '../services/catalog.service';

export const catalogRoutes = new Elysia({ prefix: '/api/lenses' })
  .get('/', async () => {
    return CatalogService.getAllLenses();
  })
  .get('/:id', async ({ params }) => {
    const lens = await CatalogService.getLensById(params.id);
    if (!lens) {
      return new Response(JSON.stringify({ error: 'Lens not found' }), { status: 404 });
    }
    return lens;
  });

