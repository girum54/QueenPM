import 'dotenv/config';
import { db } from '../src/db/db';

async function check() {
  try {
    const channels = await db.query.channels.findMany();
    console.log('Channels in DB:', channels);
  } catch (err: any) {
    console.error('Error:', err);
  }
}

check().then(() => process.exit(0));
