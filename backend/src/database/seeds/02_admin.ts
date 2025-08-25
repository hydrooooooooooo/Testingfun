import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';
  const phone = process.env.ADMIN_PHONE || null;

  if (!email || !password) {
    console.warn('[seed:admin] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.');
    return;
  }

  const existing = await knex('users').where({ email }).first();
  if (existing) {
    console.log(`[seed:admin] Admin user already exists: ${email}`);
    if (existing.role !== 'admin') {
      await knex('users').where({ id: existing.id }).update({ role: 'admin' });
      console.log(`[seed:admin] Upgraded existing user to admin: ${email}`);
    }
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  await knex('users').insert({
    email,
    password_hash,
    name,
    phone_number: phone,
    role: 'admin',
    credits: 0,
    subscription_status: 'free',
    email_verified_at: new Date(),
  });

  console.log(`[seed:admin] Admin user created: ${email}`);
}
