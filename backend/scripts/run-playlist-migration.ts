/**
 * run-playlist-migration.ts
 * One-shot script to create the playlist_tracks table in the DB.
 * Run with: npx ts-node -r dotenv/config scripts/run-playlist-migration.ts
 */
import 'dotenv/config';
import { queryClient } from '../src/db/db';

async function main() {
  console.log('Running playlist_tracks migration...');

  await queryClient`
    CREATE TABLE IF NOT EXISTS "playlist_tracks" (
      "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "channel_id"  uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
      "video_id"    text NOT NULL,
      "title"       text NOT NULL,
      "author"      text NOT NULL,
      "thumbnail"   text NOT NULL,
      "added_by"    text NOT NULL DEFAULT 'Unknown',
      "position"    integer NOT NULL DEFAULT 0,
      "created_at"  timestamp DEFAULT now() NOT NULL
    );
  `;

  console.log('✅ playlist_tracks table created (or already exists).');
  await queryClient.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
