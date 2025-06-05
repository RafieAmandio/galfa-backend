import {
  pgTable,
  serial,
  varchar,
  timestamp,
  decimal,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// Role assignments table
export const roleAssignments = pgTable("role_assignments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  role_id: integer("role_id").references(() => roles.id),
});

// Account types table
export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  account_type_id: integer("account_type_id").references(() => accountTypes.id),
  account_number: varchar("account_number", { length: 255 }).notNull().unique(),
  capital: decimal("capital", { precision: 20, scale: 2 }).notNull(),
  transaction_date: timestamp("transaction_date").notNull(),
  end_date: timestamp("end_date"),
  status: varchar("status", { length: 50 }).notNull(),
  is_rollover: boolean("is_rollover").default(false),
  parent_account_id: integer("parent_account_id"),
  admin_fee_applied: boolean("admin_fee_applied").default(true),
  rollover_sequence: integer("rollover_sequence").default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Fix rate accounts table
export const fixRateAccounts = pgTable("fix_rate_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  annual_rate: decimal("annual_rate", { precision: 5, scale: 4 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Floating rate accounts table
export const floatingRateAccounts = pgTable("floating_rate_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  hurdle_rate: decimal("hurdle_rate", { precision: 5, scale: 4 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Installment accounts table
export const installmentAccounts = pgTable("installment_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  period_months: integer("period_months").notNull(),
  monthly_rate: decimal("monthly_rate", { precision: 5, scale: 4 }).notNull(),
  monthly_principle: decimal("monthly_principle", {
    precision: 20,
    scale: 2,
  }).notNull(),
  monthly_cof: decimal("monthly_cof", { precision: 20, scale: 2 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// VC Performance table
export const vcPerformance = pgTable("vc_performance", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  aum: decimal("aum", { precision: 20, scale: 2 }).notNull(),
  // gross_profit: decimal("gross_profit", { precision: 20, scale: 2 }).notNull(),
  roi_percentage: decimal("roi_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  cof_fix_rate: decimal("cof_fix_rate", { precision: 5, scale: 4 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Floating rate calculations table
export const floatingRateCalculations = pgTable("floating_rate_calculations", {
  id: serial("id").primaryKey(),
  floating_rate_account_id: integer("floating_rate_account_id").references(
    () => floatingRateAccounts.id
  ),
  vc_performance_id: integer("vc_performance_id").references(
    () => vcPerformance.id
  ),
  gross_profit_for_floating: decimal("gross_profit_for_floating", {
    precision: 20,
    scale: 2,
  }).notNull(),
  performance_percentage: decimal("performance_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  calculated_rate: decimal("calculated_rate", {
    precision: 5,
    scale: 4,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Mutations table
export const mutations = pgTable("mutations", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  type: varchar("type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull(),
  transaction_date: timestamp("transaction_date").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  roleAssignments: many(roleAssignments),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.user_id],
    references: [users.id],
  }),
  accountType: one(accountTypes, {
    fields: [accounts.account_type_id],
    references: [accountTypes.id],
  }),
  parentAccount: one(accounts, {
    fields: [accounts.parent_account_id],
    references: [accounts.id],
    relationName: "rollover",
  }),
  childAccounts: many(accounts, {
    relationName: "rollover",
  }),
  fixRateAccount: one(fixRateAccounts),
  floatingRateAccount: one(floatingRateAccounts),
  installmentAccount: one(installmentAccounts),
  mutations: many(mutations),
}));
