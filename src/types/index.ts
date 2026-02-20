import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  role: 'investor' | 'artist' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface DoubleEntryParams {
  debitAccountId: string;
  creditAccountId: string;
  amount: string;
  txnType: string;
  referenceId?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface TradeRequest {
  artistId: string;
  quantity: number;
}

export interface PriceQuote {
  mid: number;
  bid: number;
  ask: number;
  spreadBps: number;
}

export interface TractionComponents {
  albumVelocity: number;
  catalogSize: number;
  revenueGrowth: number;
  socialFollowers: number;
  externalPopularity: number;
}
