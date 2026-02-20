import { db } from '../db';
import { artists } from '../db/schema';
import { updateArtistPrice } from '../services/pricing.service';
import { getArtistAlbums, computeAlbumVelocityScore, computeCatalogSizeScore } from '../services/spotify.service';

/**
 * Compute traction index for all artists.
 * Called manually via admin route (no cron for hackathon).
 */
export async function computeAllTractionIndices(overrides?: {
  revenueGrowth?: number;
  socialFollowers?: number;
  externalPopularity?: number;
}) {
  const allArtists = await db.select().from(artists);
  const results = [];

  for (const artist of allArtists) {
    let albumVelocity = 50;
    let catalogSize = 50;

    if (artist.spotifyArtistId) {
      try {
        const albums = await getArtistAlbums(artist.spotifyArtistId);
        albumVelocity = computeAlbumVelocityScore(albums);
        catalogSize = computeCatalogSizeScore(albums.length);
      } catch (err) {
        console.error(`Spotify fetch failed for ${artist.stageName}:`, err);
      }
    }

    const result = await updateArtistPrice(artist.id, {
      albumVelocity,
      catalogSize,
      revenueGrowth: overrides?.revenueGrowth ?? 50,
      socialFollowers: overrides?.socialFollowers ?? 50,
      externalPopularity: overrides?.externalPopularity ?? 50,
    });

    results.push({
      artistId: artist.id,
      stageName: artist.stageName,
      ...result,
    });
  }

  return results;
}
