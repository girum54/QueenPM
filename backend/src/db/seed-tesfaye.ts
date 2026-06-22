import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { hashPassword } from 'better-auth/crypto';

async function seedTesfaye() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

  const client = (postgres as any)(databaseUrl);
  const db = drizzle(client, { schema });

  console.log('👤 Seeding user: Tesfaye Migbar...');

  const testPassword = process.env.SEED_PASSWORD;
  if (!testPassword) throw new Error('SEED_PASSWORD is not set in .env');
  const hashedPassword = await hashPassword(testPassword);

  const targetUserId = 'u4';
  const targetEmail = 'tesfaye@queenpm.dev';

  // 1. Insert or Update User
  await db
    .insert(schema.user)
    .values({
      id: targetUserId,
      name: 'Tesfaye Migbar',
      email: targetEmail,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      username: '@tesfaye',
      color: 'bg-blue-500',
      isAi: false,
    })
    .onConflictDoUpdate({
      target: schema.user.id,
      set: { updatedAt: new Date() },
    });

  // 2. Insert or Update Better Auth Password Account
  await db
    .insert(schema.account)
    .values({
      id: `${targetUserId}-credential`,
      accountId: targetEmail,
      providerId: 'credential',
      userId: targetUserId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.account.id,
      set: { password: hashedPassword, updatedAt: new Date() },
    });

  // 3. Add Tesfaye to existing projects automatically
  console.log('👥 Adding Tesfaye to existing projects...');
  const existingProjects = await db.select().from(schema.projects);
  
  if (existingProjects.length > 0) {
    const projectMemberships = existingProjects.map((p) => ({
      projectId: p.id,
      userId: targetUserId,
    }));
    
    await db
      .insert(schema.projectMembers)
      .values(projectMemberships)
      .onConflictDoNothing(); // Prevents crashes if already a member
  }

  // 4. Add Tesfaye to existing channels automatically
  console.log('📢 Adding Tesfaye to existing channels...');
  const existingChannels = await db.select().from(schema.channels);

  if (existingChannels.length > 0) {
    const channelMemberships = existingChannels.map((c) => ({
      channelId: c.id,
      userId: targetUserId,
    }));

    await db
      .insert(schema.channelMembers)
      .values(channelMemberships)
      .onConflictDoNothing();
  }

  console.log('✅ Seed complete for Tesfaye Migbar!');
  console.log(`\n🔐 New User Credentials:`);
  console.log(`   Email: ${targetEmail} / Password: ${testPassword}`);

  await client.end();
}

seedTesfaye().catch((err) => {
  console.error('❌ Tesfaye seed failed:', err);
  process.exit(1);
});
