import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      color: {
        type: "string",
        required: false,
      },
            isAi: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "developer",
      },
    },
  },
  trustedOrigins: [
    "http://localhost:5173", // Frontend origin
    "http://localhost:8080",
  ],
});
