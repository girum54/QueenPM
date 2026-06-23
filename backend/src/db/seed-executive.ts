import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
const postgres = require('postgres');
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function seedExecutiveData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  console.log('🌱 Seeding realistic executive data...');

  // 1. Get all projects
  const projects = await db.select().from(schema.projects);
  if (projects.length === 0) {
    console.log('❌ No projects found to seed sprints into.');
    process.exit(1);
  }

  for (const project of projects) {
    console.log(`\n📦 Processing Project: ${project.name}`);

    // Check if sprint exists
    const existingSprints = await db
      .select()
      .from(schema.sprints)
      .where(eq(schema.sprints.projectId, project.id));

    let sprintId = '';

    if (existingSprints.length === 0) {
      console.log(`   ➕ Creating new sprint for ${project.name}`);
      const [newSprint] = await db.insert(schema.sprints).values({
        projectId: project.id,
        name: `Sprint 1: Core Features`,
        durationWeeks: 2,
        startDate: new Date(),
        isActive: true,
      }).returning();
      sprintId = newSprint.id;
    } else {
      console.log(`   ✅ Using existing active sprint`);
      const active = existingSprints.find(s => s.isActive) || existingSprints[0];
      sprintId = active.id;
    }

    // Clear existing deliverables
    await db.delete(schema.sprintDeliverables).where(eq(schema.sprintDeliverables.sprintId, sprintId));

    // Determine realistic progress based on project name
    let doneCount = 0;
    const deliverables = [];

    if (project.name === 'Project X') {
      // 80% progress
      deliverables.push(
        { sprintId, text: 'Migrate to Edge Runtime', done: true },
        { sprintId, text: 'Implement Stripe Webhooks', done: true },
        { sprintId, text: 'Fix Payment Gateway Latency', done: true },
        { sprintId, text: 'Design new Dashboard UI', done: true },
        { sprintId, text: 'Write E2E Tests for Auth', done: false },
      );
    } else if (project.name === 'Project Alpha') {
      // 40% progress (Delayed/At Risk)
      // Set start date to a week ago to simulate delay
      await db.update(schema.sprints).set({ 
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) 
      }).where(eq(schema.sprints.id, sprintId));

      deliverables.push(
        { sprintId, text: 'Setup CI/CD Pipelines', done: true },
        { sprintId, text: 'Database Schema Design', done: true },
        { sprintId, text: 'User Profile API', done: false },
        { sprintId, text: 'Email Notification Service', done: false },
        { sprintId, text: 'Role-based Access Control', done: false },
      );
    } else {
      // 10% progress (New)
      deliverables.push(
        { sprintId, text: 'Kickoff Meeting & Requirements', done: true },
        { sprintId, text: 'Wireframing', done: false },
        { sprintId, text: 'Architecture Review', done: false },
        { sprintId, text: 'Provision AWS Resources', done: false },
      );
    }

    console.log(`   📝 Adding ${deliverables.length} deliverables...`);
    await db.insert(schema.sprintDeliverables).values(deliverables);
  }

  console.log('\n✅ Executive data seeded successfully!');
  await client.end();
}

seedExecutiveData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
