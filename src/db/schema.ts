import { pgTable, uuid, varchar, integer, numeric, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
 
export const lenses = pgTable('lenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: varchar('model_name', { length: 255 }).notNull(),
  manufacturerName: varchar('manufacturer_name', { length: 255 }).notNull(),
  minFocalLength: integer('min_focal_length').notNull(),
  maxFocalLength: integer('max_focal_length').notNull(),
  maxAperture: numeric('max_aperture', { precision: 4, scale: 1 }).notNull(),
  mountType: varchar('mount_type', { length: 50 }).notNull(),
  dayPrice: numeric('day_price', { precision: 12, scale: 2 }).notNull(),
  weekendPrice: numeric('weekend_price', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
});

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  lensId: uuid('lens_id').references(() => lenses.id).notNull(),
  branchCode: varchar('branch_code', { length: 20 }).references(() => branches.code).notNull(),
  totalQuantity: integer('total_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
 
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'active',     // lensa sedang disewakan
  'returned',
  'cancelled',
]);
 
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  lensId: uuid('lens_id').references(() => lenses.id).notNull(),
  branchCode: varchar('branch_code', { length: 20 }).references(() => branches.code).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
 
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  message: text('message').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});
