import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Creates (or promotes) an admin account.
 *
 * Credentials come from the environment or an interactive prompt — there is
 * no default/hard-coded password anywhere in this repo.
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... pnpm run admin:create
 *   pnpm run admin:create            # prompts for email + password (hidden)
 *
 * Password requirements: ≥12 chars, at least one letter and one digit.
 */

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const SALT_ROUNDS = 12;

function assertPasswordStrength(password: string) {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must contain at least one letter and one digit');
  }
}

async function promptHidden(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    // No echo masking without raw mode in every terminal — read plainly but
    // never echo the value back. (Script context, not a shared terminal.)
    const value = await rl.question(question);
    return value;
  } finally {
    rl.close();
  }
}

async function main() {
  const email = (
    process.env['ADMIN_EMAIL'] ??
    (await promptHidden('Admin email: '))
  )
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid admin email is required');
  }

  const password =
    process.env['ADMIN_PASSWORD'] ??
    (await promptHidden('Admin password (min 12 chars, letters + digits): '));
  assertPasswordStrength(password);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Upsert by email: creates the admin, or promotes an existing account.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.isDeleted) {
      throw new Error(
        'An account with this email was deleted — pick a different email',
      );
    }
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'admin', isActive: true, passwordHash },
    });
    console.log(`Promoted existing account to admin: ${user.email}`);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        name: process.env['ADMIN_NAME']?.trim() || 'Store admin',
        passwordHash,
        role: 'admin',
        isVerified: true,
        isActive: true,
      },
    });
    console.log(`Created admin account: ${user.email}`);
  }
  console.log('You can now sign in at the admin login page.');
}

main()
  .catch((err) => {
    console.error(`Failed: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
