import { db } from '../db';
import { ledgerAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createDoubleEntry, getUserWalletAccount, getPlatformAccount } from './ledger.service';
import { NotFoundError, InsufficientFundsError, BadRequestError } from '../utils/errors';

/**
 * Ensure the user has a wallet account; create one if missing.
 * Returns the wallet row.
 */
async function ensureWallet(userId: string) {
  let wallet = await getUserWalletAccount(userId);
  if (!wallet) {
    // Auto-create wallet for users that don't have one yet
    const [created] = await db
      .insert(ledgerAccounts)
      .values({
        name: `user:${userId}:wallet`,
        accountType: 'liability',
        userId,
        balance: '0',
      })
      .onConflictDoNothing()
      .returning();
    wallet = created ?? await getUserWalletAccount(userId);
  }
  if (!wallet) throw new NotFoundError('Could not create wallet');
  return wallet;
}

/**
 * Ensure the platform:cash account exists; create if missing.
 */
async function ensurePlatformCash() {
  let account = await getPlatformAccount('platform:cash');
  if (!account) {
    const [created] = await db
      .insert(ledgerAccounts)
      .values({
        name: 'platform:cash',
        accountType: 'asset',
        balance: '0',
      })
      .onConflictDoNothing()
      .returning();
    account = created ?? await getPlatformAccount('platform:cash');
  }
  if (!account) throw new NotFoundError('Could not create platform cash account');
  return account;
}

export async function getBalance(userId: string) {
  const wallet = await ensureWallet(userId);
  return { balance: wallet.balance, accountId: wallet.id };
}

export async function deposit(userId: string, amount: string) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new BadRequestError('Amount must be positive');
  }

  const wallet = await ensureWallet(userId);
  const platformCash = await ensurePlatformCash();

  const transactionId = await db.transaction(async (tx) => {
    return createDoubleEntry(tx, {
      debitAccountId: platformCash.id,
      creditAccountId: wallet.id,
      amount,
      txnType: 'deposit',
      description: `Deposit of $${amount}`,
    });
  });

  const updatedWallet = await getUserWalletAccount(userId);
  return {
    transactionId,
    balance: updatedWallet!.balance,
  };
}

export async function withdraw(userId: string, amount: string) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new BadRequestError('Amount must be positive');
  }

  const wallet = await ensureWallet(userId);

  if (parseFloat(wallet.balance) < numAmount) {
    throw new InsufficientFundsError();
  }

  const platformCash = await ensurePlatformCash();

  const transactionId = await db.transaction(async (tx) => {
    return createDoubleEntry(tx, {
      debitAccountId: wallet.id,
      creditAccountId: platformCash.id,
      amount,
      txnType: 'withdrawal',
      description: `Withdrawal of $${amount}`,
    });
  });

  const updatedWallet = await getUserWalletAccount(userId);
  return {
    transactionId,
    balance: updatedWallet!.balance,
  };
}
