import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as postgres from 'postgres';
import * as schema from './schema';
import { hashPassword } from 'better-auth/crypto';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

  const client = (postgres as any)(databaseUrl);
  const db = drizzle(client, { schema });

  const DAY = 86400000;

  // ── 1. Wipe (children first due to FK constraints) ──────────────────────────
  console.log('🗑️  Wiping existing data...');
  await db.delete(schema.messages);
  await db.delete(schema.tasks);
  await db.delete(schema.sprintDeliverables);
  await db.delete(schema.boards);
  await db.delete(schema.sprints);
  await db.delete(schema.channels);
  await db.delete(schema.projects);
  
  // Clear auth-related data
  await db.delete(schema.session);
  await db.delete(schema.verification);
  await db.delete(schema.account);
  await db.delete(schema.user);

  // ── 2. Users (upsert — preserve auth sessions) ──────────────────────────────
  console.log('👤 Seeding users...');
  const testPassword = process.env.SEED_PASSWORD;
  const hashedPassword = await hashPassword(testPassword);
  
  await db
    .insert(schema.user)
    .values([
      { id: 'u1', name: 'Girum Tilahun',    email: 'girum@queenpm.dev',  emailVerified: false, createdAt: new Date(), updatedAt: new Date(), username: '@girum',       color: 'bg-rose-500',    isAi: false },
      { id: 'u2', name: 'Abenezer Hailu',   email: 'abenezer@queenpm.dev', emailVerified: false, createdAt: new Date(), updatedAt: new Date(), username: '@abenezer',   color: 'bg-amber-500',   isAi: false },
      { id: 'u3', name: 'Samrawit Amare',   email: 'samrawit@queenpm.dev', emailVerified: false, createdAt: new Date(), updatedAt: new Date(), username: '@samrawit',   color: 'bg-emerald-500', isAi: false },
      { id: 'uq', name: 'Queen PM',     email: 'queen@queenpm.dev', emailVerified: false, createdAt: new Date(), updatedAt: new Date(), username: '@queen', color: 'bg-gradient-to-br from-fuchsia-500 to-violet-600', isAi: true },
    ])
    .onConflictDoUpdate({ target: schema.user.id, set: { updatedAt: new Date() } });

  // Seed password accounts - create accounts for Better Auth
  const users = [
    { id: 'u1', name: 'Girum Tilahun', email: 'girum@queenpm.dev', username: '@girum', color: 'bg-rose-500' },
    { id: 'u2', name: 'Abenezer Hailu', email: 'abenezer@queenpm.dev', username: '@abenezer', color: 'bg-amber-500' },
    { id: 'u3', name: 'Samrawit Amare', email: 'samrawit@queenpm.dev', username: '@samrawit', color: 'bg-emerald-500' },
  ];

  // Create password accounts - Better Auth expects accountId to be email for credential provider
  for (const user of users) {
    await db.insert(schema.account).values({
      id: `${user.id}-credential`,
      accountId: user.email,
      providerId: 'credential',
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── 3. Projects ─────────────────────────────────────────────────────────────
  console.log('📁 Seeding projects...');
  const [projX, projAlpha, projDelta] = await db
    .insert(schema.projects)
    .values([
      { name: 'Project X',     color: 'from-fuchsia-500 to-violet-600', ownerId: 'u1' },
      { name: 'Project Alpha', color: 'from-sky-500 to-cyan-600',       ownerId: 'u1' },
      { name: 'Project Delta', color: 'from-emerald-500 to-teal-600',   ownerId: 'u1' },
    ])
    .returning();

  // ── 4. Channels (Project X) ─────────────────────────────────────────────────
  console.log('📢 Seeding channels...');
  const [chanGeneral, chanEng, chanDesign, chanSprint, chanIncidents, chanWater] = await db
    .insert(schema.channels)
    .values([
      { name: 'general',      projectId: projX.id, aiActive: false },
      { name: 'eng-platform', projectId: projX.id, aiActive: true  },
      { name: 'design-crit',  projectId: projX.id, aiActive: false },
      { name: 'sprint-q3',    projectId: projX.id, aiActive: true  },
      { name: 'incidents',    projectId: projX.id, aiActive: true  },
      { name: 'watercooler',  projectId: projX.id, aiActive: false },
    ])
    .returning();

  // Also seed a general channel for the other projects
  await db.insert(schema.channels).values([
    { name: 'general', projectId: projAlpha.id, aiActive: false },
    { name: 'general', projectId: projDelta.id, aiActive: false },
  ]);

  // ── 5. Tasks (parent tasks first) ───────────────────────────────────────────
  console.log('✅ Seeding tasks...');
  const [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12] = await db
    .insert(schema.tasks)
    .values([
      { title: 'Fix race condition in checkout webhook',    description: 'Reproduced under concurrent load — needs idempotency key.', assigneeId: 'u2', priority: 'urgent', column: 'active',   createdBy: 'ai',    originChannelId: chanEng.id, projectId: projX.id, createdAt: new Date(Date.now() - 4  * DAY) },
      { title: 'Refactor auth middleware for edge runtime', assigneeId: 'u3', priority: 'high',   column: 'new',      createdBy: 'ai',    originChannelId: chanEng.id, projectId: projX.id, createdAt: new Date(Date.now() - 3  * DAY) },
      { title: 'Design system: token migration to OKLCH',  assigneeId: 'u3', priority: 'medium', column: 'staging',  createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 6  * DAY) },
      { title: 'Q3 launch: payments overhaul',             assigneeId: 'u1', priority: 'high',   column: 'active',   createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 9  * DAY) },
      { title: 'Add Sentry breadcrumbs to ingest pipeline',               priority: 'low',    column: 'new',      createdBy: 'slash', originChannelId: chanEng.id, projectId: projX.id, createdAt: new Date(Date.now() - 1  * DAY) },
      { title: 'Onboarding revamp epic',                   assigneeId: 'u3', priority: 'medium', column: 'new',      createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 2  * DAY) },
      { title: 'Ship rate limiter to prod',                assigneeId: 'u2', priority: 'high',   column: 'deployed', createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 14 * DAY), completedAt: new Date(Date.now() - 2  * DAY) },
      { title: 'Audit log retention policy',               assigneeId: 'u3', priority: 'medium', column: 'deployed', createdBy: 'ai',    projectId: projX.id, createdAt: new Date(Date.now() - 11 * DAY), completedAt: new Date(Date.now() - 4  * DAY) },
      { title: 'Postgres pooler upgrade',                  assigneeId: 'u2', priority: 'high',   column: 'staging',  createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 5  * DAY) },
      { title: 'Triage AI-flagged 500s on /v2/orders',                    priority: 'urgent', column: 'new',      createdBy: 'ai',    originChannelId: chanEng.id, projectId: projX.id, createdAt: new Date(Date.now() - 6  * 3600000) },
      { title: 'Migrate billing webhook to v2',            assigneeId: 'u1', priority: 'high',   column: 'deployed', createdBy: 'ai',    projectId: projX.id, createdAt: new Date(Date.now() - 18 * DAY), completedAt: new Date(Date.now() - 7  * DAY) },
      { title: 'Customer SSO: Okta integration',           assigneeId: 'u3', priority: 'high',   column: 'active',   createdBy: 'ui',    projectId: projX.id, createdAt: new Date(Date.now() - 8  * DAY) },
    ])
    .returning();

  // Subtasks (reference real parent IDs)
  await db.insert(schema.tasks).values([
    { title: 'Verify webhook signature validation',    assigneeId: 'u2', priority: 'high',   column: 'deployed', createdBy: 'ui', projectId: projX.id, parentId: t1.id, createdAt: new Date(Date.now() - 3.5 * DAY) },
    { title: 'Add unit tests for deduplication cache', assigneeId: 'u1', priority: 'medium', column: 'active',   createdBy: 'ui', projectId: projX.id, parentId: t1.id, createdAt: new Date(Date.now() - 3   * DAY) },
  ]);

  // ── 6. Messages ─────────────────────────────────────────────────────────────
  console.log('💬 Seeding messages...');
  const [m1, m2, m3, m4, m5, m6, m7] = await db
    .insert(schema.messages)
    .values([
      { authorId: 'u1', channelId: chanEng.id,     text: 'morning team — pushing the new ingest worker to staging in ~30', pinned: true,  createdAt: new Date(Date.now() - 5 * 3600000) },
      { authorId: 'u2', channelId: chanEng.id,     text: 'nice. fyi the checkout webhook is flaky again, saw two 500s overnight',          createdAt: new Date(Date.now() - 4 * 3600000 - 2700000) },
      { authorId: 'u2', channelId: chanEng.id,     text: 'yeah it\'s the same race we hit last month. I can repro locally',                createdAt: new Date(Date.now() - 4 * 3600000 - 2600000) },
      { authorId: 'uq', channelId: chanEng.id,     taskRef: t1.id,                                                                          createdAt: new Date(Date.now() - 4 * 3600000 - 2590000) },
      { authorId: 'u1', channelId: chanEng.id,     text: '@queen we should also get the auth middleware ported to edge before Q3 launch, can you track that', createdAt: new Date(Date.now() - 4 * 3600000 - 2100000) },
      { authorId: 'uq', channelId: chanEng.id,     taskRef: t2.id,                                                                          createdAt: new Date(Date.now() - 4 * 3600000 - 2090000) },
      { authorId: 'u3', channelId: chanEng.id,     text: 'design crit at 2, will share the token migration prototype',                      createdAt: new Date(Date.now() - 3 * 3600000) },
    ])
    .returning();

  // Thread replies
  await db.insert(schema.messages).values([
    { authorId: 'u2', channelId: chanEng.id, text: 'small thing — we should add sentry breadcrumbs to the ingest pipeline so we can actually debug these', parentId: m1.id, createdAt: new Date(Date.now() - 3 * 3600000 - 1200000) },
    { authorId: 'uq', channelId: chanEng.id, taskRef: t5.id, parentId: m1.id, createdAt: new Date(Date.now() - 3 * 3600000 - 1190000) },
    { authorId: 'u2', channelId: chanEng.id, text: 'repro confirmed. patch incoming, will tag the PR to the task', parentId: m3.id, createdAt: new Date(Date.now() - 2 * 3600000) },
    { authorId: 'u1', channelId: chanSprint.id, text: 'sprint kickoff in 15 — agenda in the pinned doc', pinned: true, createdAt: new Date(Date.now() - 6 * 3600000) },
    { authorId: 'u3', channelId: chanGeneral.id, text: 'lunch order goes in at 12:30 sharp', createdAt: new Date(Date.now() - 2 * 3600000) },
  ]);

  console.log('✅ Seed complete!');
  console.log(`   Projects : 3  (Project X, Alpha, Delta)`);
  console.log(`   Channels : 8`);
  console.log(`   Tasks    : 14 (12 main + 2 subtasks)`);
  console.log(`   Messages : 12`);
  console.log(`\n🔐 Test User Credentials:`);
  console.log(`   Email: girum@queenpm.dev / Password: ${testPassword}`);
  console.log(`   Email: abenezer@queenpm.dev / Password: ${testPassword}`);
  console.log(`   Email: samrawit@queenpm.dev / Password: ${testPassword}`);

  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
