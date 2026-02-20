import Stripe from 'stripe';
import { config } from '../config';
import { db } from '../db';
import { artists, stripeWebhookEvents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../utils/errors';

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey)
  : null;

export async function createConnectedAccount(artistId: string, returnUrl: string, refreshUrl: string) {
  if (!stripe) throw new BadRequestError('Stripe not configured');

  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new NotFoundError('Artist not found');

  if (artist.stripeAccountId) {
    // Already has account, create new onboarding link
    const link = await stripe.accountLinks.create({
      account: artist.stripeAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return { url: link.url, accountId: artist.stripeAccountId };
  }

  // Create new Express connected account
  const account = await stripe.accounts.create({
    type: 'express',
    metadata: { artistId },
  });

  await db
    .update(artists)
    .set({
      stripeAccountId: account.id,
      stripeOnboardingStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));

  const link = await stripe.accountLinks.create({
    account: account.id,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return { url: link.url, accountId: account.id };
}

export async function handleWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new BadRequestError('Stripe not configured');

  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );

  // Dedup check
  const [existing] = await db
    .select()
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.stripeEventId, event.id))
    .limit(1);

  if (existing) {
    return { status: 'duplicate', eventId: event.id };
  }

  // Record event
  await db.insert(stripeWebhookEvents).values({
    stripeEventId: event.id,
    eventType: event.type,
    processed: true,
  });

  // Handle specific events
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await db
          .update(artists)
          .set({
            stripeOnboardingStatus: 'complete',
            updatedAt: new Date(),
          })
          .where(eq(artists.stripeAccountId, account.id));
      }
      break;
    }
  }

  return { status: 'processed', eventId: event.id, type: event.type };
}
