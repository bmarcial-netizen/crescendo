import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, ledgerAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

export async function register(
  email: string,
  password: string,
  role: 'investor' | 'artist' | 'admin',
  displayName?: string
) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new BadRequestError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user + wallet account in a transaction
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash, role, displayName })
      .returning();

    // Create wallet ledger account for non-admin users
    if (role !== 'admin') {
      await tx.insert(ledgerAccounts).values({
        name: `user:${user.id}:wallet`,
        accountType: 'liability',
        userId: user.id,
      });
    }

    return user;
  });

  const token = generateToken(result.id, result.role);
  return {
    user: { id: result.id, email: result.email, role: result.role, displayName: result.displayName },
    token,
  };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = generateToken(user.id, user.role);
  return {
    user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    token,
  };
}

function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '24h' });
}
