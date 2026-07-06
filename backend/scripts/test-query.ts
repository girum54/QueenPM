import 'dotenv/config';
import { db } from '../src/db/db';
import * as schema from '../src/db/schema';
import { eq, asc } from 'drizzle-orm';

async function test() {
  try {
    const result = await db
      .select()
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.channelId, 'music-lounge'))
      .orderBy(asc(schema.playlistTracks.position), asc(schema.playlistTracks.createdAt));
    console.log('Success:', result);
  } catch (err: any) {
    console.error('Database query error:', err);
  }
}

test().then(() => process.exit(0));
