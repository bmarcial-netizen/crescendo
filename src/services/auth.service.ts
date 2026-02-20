import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { users, ledgerAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

const googleClient = new OAuth2Client(config.google.clientId);

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

    // Create wallet ledger account for non-admin users with starting balance
    if (role !== 'admin') {
      await tx.insert(ledgerAccounts).values({
        name: `user:${user.id}:wallet`,
        accountType: 'liability',
        userId: user.id,
        balance: config.defaultStartingBalance,
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

  if (!user.passwordHash) {
    throw new UnauthorizedError('This account uses Google Sign-In. Please sign in with Google.');
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

export async function googleAuth(credential: string) {
  if (!config.google.clientId) {
    throw new BadRequestError('Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in .env');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new BadRequestError('Invalid Google token');
  }

  const { sub: googleId, email, name, email_verified } = payload;

  if (!email_verified) {
    throw new BadRequestError('Google email not verified');
  }

  if (!googleId) {
    throw new BadRequestError('Invalid Google token: missing user ID');
  }

  // Check if user with this googleId already exists
  const [existingByGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId!))
    .limit(1);

  if (existingByGoogleId) {
    const token = generateToken(existingByGoogleId.id, existingByGoogleId.role);
    return {
      user: {
        id: existingByGoogleId.id,
        email: existingByGoogleId.email,
        role: existingByGoogleId.role,
        displayName: existingByGoogleId.displayName,
      },
      token,
    };
  }

  // Check if user with this email exists (link Google to existing account)
  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingByEmail) {
    await db
      .update(users)
      .set({ googleId, updatedAt: new Date() })
      .where(eq(users.id, existingByEmail.id));

    const token = generateToken(existingByEmail.id, existingByEmail.role);
    return {
      user: {
        id: existingByEmail.id,
        email: existingByEmail.email,
        role: existingByEmail.role,
        displayName: existingByEmail.displayName,
      },
      token,
    };
  }

  // New user — create account with wallet
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        googleId,
        role: 'investor',
        displayName: name || email.split('@')[0],
      })
      .returning();

    await tx.insert(ledgerAccounts).values({
      name: `user:${user.id}:wallet`,
      accountType: 'liability',
      userId: user.id,
      balance: config.defaultStartingBalance,
    });

    return user;
  });

  const token = generateToken(result.id, result.role);
  return {
    user: {
      id: result.id,
      email: result.email,
      role: result.role,
      displayName: result.displayName,
    },
    token,
  };
}

export async function spotifyAuth(code: string) {
  const { clientId, clientSecret, callbackUrl } = config.spotify;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Spotify Sign-In is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env');
  }

  // Exchange authorization code for access token
  const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    console.error('Spotify token exchange failed:', err);
    throw new BadRequestError('Spotify authentication failed');
  }

  const tokenData = await tokenResp.json() as { access_token: string };

  // Get Spotify user profile
  const profileResp = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileResp.ok) {
    throw new BadRequestError('Failed to fetch Spotify profile');
  }

  const profile = await profileResp.json() as {
    id: string;
    email?: string;
    display_name?: string;
  };

  const spotifyId = profile.id;
  const email = profile.email;
  const displayName = profile.display_name;

  if (!email) {
    throw new BadRequestError('Spotify account has no email. Please ensure the "user-read-email" scope is granted.');
  }

  // Check if user with this spotifyId already exists
  const [existingBySpotifyId] = await db
    .select()
    .from(users)
    .where(eq(users.spotifyId, spotifyId))
    .limit(1);

  if (existingBySpotifyId) {
    const token = generateToken(existingBySpotifyId.id, existingBySpotifyId.role);
    return {
      user: {
        id: existingBySpotifyId.id,
        email: existingBySpotifyId.email,
        role: existingBySpotifyId.role,
        displayName: existingBySpotifyId.displayName,
      },
      token,
    };
  }

  // Check if user with this email exists (link Spotify to existing account)
  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingByEmail) {
    await db
      .update(users)
      .set({ spotifyId, updatedAt: new Date() })
      .where(eq(users.id, existingByEmail.id));

    const token = generateToken(existingByEmail.id, existingByEmail.role);
    return {
      user: {
        id: existingByEmail.id,
        email: existingByEmail.email,
        role: existingByEmail.role,
        displayName: existingByEmail.displayName,
      },
      token,
    };
  }

  // New user — create account with wallet
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        spotifyId,
        role: 'investor',
        displayName: displayName || email.split('@')[0],
      })
      .returning();

    await tx.insert(ledgerAccounts).values({
      name: `user:${user.id}:wallet`,
      accountType: 'liability',
      userId: user.id,
      balance: config.defaultStartingBalance,
    });

    return user;
  });

  const token = generateToken(result.id, result.role);
  return {
    user: {
      id: result.id,
      email: result.email,
      role: result.role,
      displayName: result.displayName,
    },
    token,
  };
}

function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '24h' });
}
