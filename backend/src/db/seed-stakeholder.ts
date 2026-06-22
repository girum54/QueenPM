import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { hashPassword } from 'better-auth/crypto';

async function seedStakeholder() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

  const client = (postgres as any)(databaseUrl);
  const db = drizzle(client, { schema });

  console.log('👤 Seeding user: Executive Stakeholder...');

  const testPassword = process.env.SEED_PASSWORD;
  if (!testPassword) throw new Error('SEED_PASSWORD is not set in .env');
  const hashedPassword = await hashPassword(testPassword);

  const targetUserId = 'u-stake';
  const targetEmail = 'stakeholder@queenpm.dev';

  // 1. Insert or Update User
  await db
    .insert(schema.user)
    .values({
      id: targetUserId,
      name: 'Executive Stakeholder',
      email: targetEmail,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      username: '@stakeholder',
      color: 'bg-violet-500',
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

  // 3. Add Stakeholder to existing projects automatically
  console.log('👥 Adding Stakeholder to existing projects...');
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

  // 4. Add Stakeholder to existing channels automatically
  console.log('📢 Adding Stakeholder to existing channels...');
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

  console.log('✅ Seed complete for Executive Stakeholder!');
  console.log(`\n🔐 New User Credentials:`);
  console.log(`   Email: ${targetEmail} / Password: ${testPassword}`);

  await client.end();
}

seedStakeholder().catch((err) => {
  console.error('❌ Stakeholder seed failed:', err);
  process.exit(1);
});
