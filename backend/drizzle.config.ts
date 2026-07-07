import drizzleKit from "drizzle-kit";
const { defineConfig } = drizzleKit as any;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",

  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
