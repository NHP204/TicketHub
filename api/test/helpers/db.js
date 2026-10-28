import { createPool } from '../../src/config/db.js';

export const testPool = createPool(process.env.DATABASE_URL);

export async function resetDb() {
  await testPool.query(`
    TRUNCATE users, refresh_tokens, events, sections, seats,
      bookings, booking_items, tickets, payments
    RESTART IDENTITY CASCADE
  `);
}

export async function closeDb() {
  await testPool.end();
}
