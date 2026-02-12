import { vi } from "vitest";
import dotenv from "dotenv";

// Load .env file for database connection
dotenv.config();

// Mock server-only (Next.js stub that prevents client imports)
vi.mock("server-only", () => ({}));

// Mock next/headers (not available outside Next.js runtime)
vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

// Mock react cache (just pass through the function)
vi.mock("react", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});
