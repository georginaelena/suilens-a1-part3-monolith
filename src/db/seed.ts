import { db } from './index';
import { lenses, branches, inventory } from './schema';
 
const seedBranches = [
  {
    code: 'KB-JKT-S',
    name: 'Komet Biru Kebayoran Baru',
    location: 'Jakarta Selatan',
    address: 'Jl. Kebayoran Baru No. 123, Jakarta Selatan 12345',
  },
  {
    code: 'KB-JKT-E',
    name: 'Komet Biru Jatinegara',
    location: 'Jakarta Timur',
    address: 'Jl. Jatinegara No. 456, Jakarta Timur 13350',
  },
  {
    code: 'KB-JKT-N',
    name: 'Komet Biru Kelapa Gading',
    location: 'Jakarta Utara',
    address: 'Jl. Kelapa Gading No. 789, Jakarta Utara 14240',
  },
];

const seedLenses = [
  {
    modelName: 'Summilux-M 35mm f/1.4 ASPH.',
    manufacturerName: 'Leica',
    minFocalLength: 35, maxFocalLength: 35,
    maxAperture: '1.4', mountType: 'Leica M',
    dayPrice: '450000.00', weekendPrice: '750000.00',
    description: 'Lensa 35mm legendaris yang terkenal akan rendering dan karakternya.',
  },
  {
    modelName: 'Art 24-70mm f/2.8 DG DN',
    manufacturerName: 'Sigma',
    minFocalLength: 24, maxFocalLength: 70,
    maxAperture: '2.8', mountType: 'Sony E',
    dayPrice: '200000.00', weekendPrice: '350000.00',
    description: 'Zoom standar kelas profesional untuk sistem mirrorless.',
  },
  {
    modelName: 'RF 70-200mm f/2.8L IS USM',
    manufacturerName: 'Canon',
    minFocalLength: 70, maxFocalLength: 200,
    maxAperture: '2.8', mountType: 'Canon RF',
    dayPrice: '350000.00', weekendPrice: '600000.00',
    description: 'Lensa telephoto profesional dengan stabilisasi optik.',
  },
  {
    modelName: 'Z 14-24mm f/2.8 S',
    manufacturerName: 'Nikon',
    minFocalLength: 14, maxFocalLength: 24,
    maxAperture: '2.8', mountType: 'Nikon Z',
    dayPrice: '300000.00', weekendPrice: '500000.00',
    description: 'Lensa ultra wide-angle untuk landscape dan arsitektur.',
  },
];
 
async function seed() {
  try {
    console.log('🌱 Starting seed...');
    
    // 1. Seed branches
    console.log('Seeding branches...');
    const insertedBranches = await db.insert(branches).values(seedBranches).returning();
    console.log(`✅ Seeded ${insertedBranches.length} branches.`);
    
    // 2. Seed lenses
    console.log('Seeding lenses...');
    const insertedLenses = await db.insert(lenses).values(seedLenses).returning();
    console.log(`✅ Seeded ${insertedLenses.length} lenses.`);
    
    // 3. Seed inventory (stock per branch)
    console.log('Seeding inventory...');
    const inventoryData = [];
    
    // For each lens, add stock at each branch with varying quantities
    for (const lens of insertedLenses) {
      // KB-JKT-S (main branch) - highest stock
      inventoryData.push({
        lensId: lens.id,
        branchCode: 'KB-JKT-S',
        totalQuantity: 5,
        availableQuantity: 5,
      });
      
      // KB-JKT-E (secondary branch) - medium stock
      inventoryData.push({
        lensId: lens.id,
        branchCode: 'KB-JKT-E',
        totalQuantity: 3,
        availableQuantity: 3,
      });
      
      // KB-JKT-N (new branch) - limited stock
      inventoryData.push({
        lensId: lens.id,
        branchCode: 'KB-JKT-N',
        totalQuantity: 1,
        availableQuantity: 1,
      });
    }
    
    const insertedInventory = await db.insert(inventory).values(inventoryData).returning();
    console.log(`✅ Seeded ${insertedInventory.length} inventory records.`);
    
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}
 
seed();
