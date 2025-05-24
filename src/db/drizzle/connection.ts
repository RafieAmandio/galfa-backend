import * as schema from "@/db/drizzle/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let connection: postgres.Sql;

const globalConnection = global as typeof globalThis & {
  connection: postgres.Sql;
};

const dbDefaultConfig = {
  schema,
};

export type DrizzleConnection = ReturnType<typeof drizzle>;

export function createDrizzleConnection(config = dbDefaultConfig) {
  if (!process.env.SUPABASE_CONNECTION_STRING) {
    throw new Error(
      "Environment variables not found for SUPABASE_CONNECTION_STRING"
    );
  }

  if (!globalConnection.connection) {
    globalConnection.connection = postgres(
      process.env.SUPABASE_CONNECTION_STRING,
      {
        prepare: false,
      }
    );
  }

  connection = globalConnection.connection;

  return drizzle({
    client: connection,
    schema: config.schema,
  });
}
