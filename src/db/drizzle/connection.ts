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
    const connStr = process.env.SUPABASE_CONNECTION_STRING;
    const urlWithSSL =
      connStr.includes("sslmode=")
        ? connStr
        : connStr + (connStr.includes("?") ? "&" : "?") + "sslmode=require";
    globalConnection.connection = postgres(urlWithSSL, {
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      max: 3,
      max_lifetime: 60 * 5,
    });
    try {
      const now = new Date();
      console.info("DB connect init", {
        host: new URL(urlWithSSL).hostname,
        port: new URL(urlWithSSL).port || "5432",
        database: (new URL(urlWithSSL).pathname || "").replace(/^\//, ""),
        sslmode: new URL(urlWithSSL).searchParams.get("sslmode") || "require",
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        tzEnv: process.env.TZ || "",
        tzIntl: Intl.DateTimeFormat().resolvedOptions().timeZone,
        nowIso: now.toISOString(),
        offsetMin: -now.getTimezoneOffset(),
      });
    } catch {}
  }

  connection = globalConnection.connection;

  return drizzle({
    client: connection,
    schema: config.schema,
  });
}

export function getDbConnectionDebug() {
  const connStr = process.env.SUPABASE_CONNECTION_STRING || "";
  let host = "";
  let port = "";
  let database = "";
  let sslmode = "require";
  try {
    const u = new URL(connStr);
    host = u.hostname || "";
    port = u.port || "5432";
    database = (u.pathname || "").replace(/^\//, "");
    sslmode = u.searchParams.get("sslmode") || "require";
  } catch {
  }
  return {
    nodeEnv: process.env.NODE_ENV || "",
    hostnameEnv: process.env.HOSTNAME || "",
    portEnv: process.env.PORT || "",
    supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    dbHost: host,
    dbPort: port,
    dbName: database,
    sslmode,
  };
}

export function getRuntimeDebug() {
  const now = new Date();
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    tzEnv: process.env.TZ || "",
    tzIntl: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nowIso: now.toISOString(),
    offsetMin: -now.getTimezoneOffset(),
  };
}
