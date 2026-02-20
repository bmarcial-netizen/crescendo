import { db } from '../db';
import { ledgerAccounts, ledgerEntries } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DoubleEntryParams } from '../types';
import type { PgTransaction } from 'drizzle-orm/pg-core';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Core double-entry ledger function.
 * Creates a debit and credit pair that net to zero.
 *
 * Accounting sign conventions:
 * - ASSET accounts:     debit increases (+), credit decreases (-)
 * - LIABILITY accounts:  debit decreases (-), credit increases (+)
 * - REVENUE accounts:    debit decreases (-), credit increases (+)
 * - EXPENSE accounts:    debit increases (+), credit decreases (-)
 */
export async function createDoubleEntry(
  tx: Tx,
  params: DoubleEntryParams
): Promise<string> {
  const { debitAccountId, creditAccountId, amount, txnType, referenceId, description, idempotencyKey } = params;
  const transactionId = uuidv4();

  // Insert debit entry
  await tx.insert(ledgerEntries).values({
    transactionId,
    accountId: debitAccountId,
    entryType: 'debit',
    amount,
    txnType: txnType as any,
    referenceId,
    description,
    idempotencyKey: idempotencyKey ? `${idempotencyKey}:debit` : null,
  });

  // Insert credit entry
  await tx.insert(ledgerEntries).values({
    transactionId,
    accountId: creditAccountId,
    entryType: 'credit',
    amount,
    txnType: txnType as any,
    referenceId,
    description,
    idempotencyKey: idempotencyKey ? `${idempotencyKey}:credit` : null,
  });

  // Update balances with correct sign rules
  // Debit account: determine sign based on account type
  await tx
    .update(ledgerAccounts)
    .set({
      balance: sql`
        CASE
          WHEN ${ledgerAccounts.accountType} IN ('asset', 'expense')
          THEN ${ledgerAccounts.balance} + ${amount}::decimal
          ELSE ${ledgerAccounts.balance} - ${amount}::decimal
        END
      `,
    })
    .where(eq(ledgerAccounts.id, debitAccountId));

  // Credit account: determine sign based on account type
  await tx
    .update(ledgerAccounts)
    .set({
      balance: sql`
        CASE
          WHEN ${ledgerAccounts.accountType} IN ('asset', 'expense')
          THEN ${ledgerAccounts.balance} - ${amount}::decimal
          ELSE ${ledgerAccounts.balance} + ${amount}::decimal
        END
      `,
    })
    .where(eq(ledgerAccounts.id, creditAccountId));

  return transactionId;
}

/**
 * Get the wallet ledger account for a user
 */
export async function getUserWalletAccount(userId: string) {
  const [account] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.name, `user:${userId}:wallet`))
    .limit(1);
  return account;
}

/**
 * Get platform account by name
 */
export async function getPlatformAccount(name: string) {
  const [account] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.name, name))
    .limit(1);
  return account;
}
