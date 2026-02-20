import { config } from '../config';

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  album_type: string;
}

interface SpotifyAlbumsResponse {
  items: SpotifyAlbum[];
  total: number;
  next: string | null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = config.spotify;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json() as { access_token: string; expires_in: number };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export async function getArtistAlbums(spotifyArtistId: string): Promise<SpotifyAlbum[]> {
  const token = await getAccessToken();
  const resp = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?include_groups=album,single&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) throw new Error(`Spotify API error: ${resp.status}`);
  const data = await resp.json() as SpotifyAlbumsResponse;
  return data.items;
}

export function computeAlbumVelocityScore(albums: SpotifyAlbum[]): number {
  // Count albums released in last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const recentCount = albums.filter((a) => new Date(a.release_date) >= cutoff).length;

  // Normalize: 0 releases = 0, 1 = 40, 2 = 60, 3 = 75, 4+ = 90-100
  if (recentCount === 0) return 0;
  if (recentCount === 1) return 40;
  if (recentCount === 2) return 60;
  if (recentCount === 3) return 75;
  return Math.min(100, 80 + recentCount * 5);
}

export function computeCatalogSizeScore(totalAlbums: number): number {
  // Normalize: 0 = 0, 1 = 20, 5 = 50, 10 = 70, 20+ = 90-100
  if (totalAlbums === 0) return 0;
  return Math.min(100, Math.round(20 + 40 * Math.log10(totalAlbums)));
}
