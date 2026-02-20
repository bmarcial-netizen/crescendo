import { db } from '../db';
import { ledgerAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createDoubleEntry, getUserWalletAccount, getPlatformAccount } from './ledger.service';
import { NotFoundError, InsufficientFundsError, BadRequestError } from '../utils/errors';

export async function getBalance(userId: string) {
  const wallet = await getUserWalletAccount(userId);
  if (!wallet) throw new NotFoundError('Wallet not found');
  return { balance: wallet.balance, accountId: wallet.id };
}

export async function deposit(userId: string, amount: string) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new BadRequestError('Amount must be positive');
  }

  const wallet = await getUserWalletAccount(userId);
  if (!wallet) throw new NotFoundError('Wallet not found');

  const platformCash = await getPlatformAccount('platform:cash');
  if (!platformCash) throw new NotFoundError('Platform cash account not found');

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

  const wallet = await getUserWalletAccount(userId);
  if (!wallet) throw new NotFoundError('Wallet not found');

  if (parseFloat(wallet.balance) < numAmount) {
    throw new InsufficientFundsError();
  }

  const platformCash = await getPlatformAccount('platform:cash');
  if (!platformCash) throw new NotFoundError('Platform cash account not found');

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
