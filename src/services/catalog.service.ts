import { db } from '../db';
import { lenses } from '../db/schema';
import { eq } from 'drizzle-orm';
 
export const CatalogService = {
  async getAllLenses() {
    return db.select().from(lenses);
  },
  async getLensById(id: string) {
    const results = await db.select().from(lenses).where(eq(lenses.id, id));
    return results[0] || null;
  },
};
