import {
  pgTable,
  serial,
  varchar,
  timestamp,
  decimal,
  integer,
  text,
  boolean,
  uuid,
  pgSchema,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Supabase Auth Schema
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  encrypted_password: varchar("encrypted_password", { length: 255 }),
  email_confirmed_at: timestamp("email_confirmed_at"),
  invited_at: timestamp("invited_at"),
  confirmation_token: varchar("confirmation_token", { length: 255 }),
  confirmation_sent_at: timestamp("confirmation_sent_at"),
  recovery_token: varchar("recovery_token", { length: 255 }),
  recovery_sent_at: timestamp("recovery_sent_at"),
  email_change_token_new: varchar("email_change_token_new", { length: 255 }),
  email_change: varchar("email_change", { length: 255 }),
  email_change_sent_at: timestamp("email_change_sent_at"),
  last_sign_in_at: timestamp("last_sign_in_at"),
  raw_app_meta_data: text("raw_app_meta_data"),
  raw_user_meta_data: text("raw_user_meta_data"),
  is_super_admin: boolean("is_super_admin"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  phone: text("phone"),
  phone_confirmed_at: timestamp("phone_confirmed_at"),
  phone_change: text("phone_change"),
  phone_change_token: varchar("phone_change_token", { length: 255 }),
  phone_change_sent_at: timestamp("phone_change_sent_at"),
  confirmed_at: timestamp("confirmed_at"),
  email_change_token_current: varchar("email_change_token_current", {
    length: 255,
  }),
  email_change_confirm_status: integer("email_change_confirm_status"),
  banned_until: timestamp("banned_until"),
  reauthentication_token: varchar("reauthentication_token", { length: 255 }),
  reauthentication_sent_at: timestamp("reauthentication_sent_at"),
  is_sso_user: boolean("is_sso_user"),
  deleted_at: timestamp("deleted_at"),
});

// Profiles table (Supabase Auth integration)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users.id
  updated_at: timestamp("updated_at", { withTimezone: true }),
  username: text("username"),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  website: text("website"),
});

// Role assignments table
export const roleAssignments = pgTable("role_assignments", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  role_name: text("role_name").notNull(),
});

// Account types table
export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  account_type_id: integer("account_type_id").references(() => accountTypes.id),
  account_number: varchar("account_number", { length: 255 }).notNull(),
  capital: decimal("capital").notNull(),
  transaction_date: timestamp("transaction_date", {
    withTimezone: true,
  }).notNull(),
  end_date: timestamp("end_date", { withTimezone: true }),
  status: varchar("status", { length: 50 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  is_rollover: boolean("is_rollover"),
  parent_account_id: integer("parent_account_id"),
  admin_fee_applied: boolean("admin_fee_applied"),
  rollover_sequence: integer("rollover_sequence"),
  user_id: uuid("user_id").references(() => profiles.id),
});

// Fix rate accounts table
export const fixRateAccounts = pgTable("fix_rate_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  annual_rate: decimal("annual_rate").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Floating rate accounts table
export const floatingRateAccounts = pgTable("floating_rate_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  admin_fee: decimal("admin_fee").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Installment accounts table
export const installmentAccounts = pgTable("installment_accounts", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  monthly_cof: decimal("monthly_cof").notNull(),
  admin_fee: decimal("admin_fee").notNull(),
  investment_type: varchar("investment_type", { length: 20 }).notNull(), // 'principle' or 'interest_only'
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Performance table
export const vcPerformance = pgTable("vc_performance", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  aum: numeric("aum").notNull(),
  profitTaken: numeric("profit_taken").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Mutations table
export const mutations = pgTable("mutations", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").references(() => accounts.id),
  type: varchar("type", { length: 50 }).notNull(),
  amount: decimal("amount").notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull(),
  transaction_date: timestamp("transaction_date", {
    withTimezone: true,
  }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Relations
export const authUsersRelations = relations(authUsers, ({ one }) => ({
  profile: one(profiles, {
    fields: [authUsers.id],
    references: [profiles.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  authUser: one(authUsers, {
    fields: [profiles.id],
    references: [authUsers.id],
  }),
  accounts: many(accounts),
  roleAssignments: many(roleAssignments),
}));

export const roleAssignmentsRelations = relations(
  roleAssignments,
  ({ one }) => ({
    user: one(profiles, {
      fields: [roleAssignments.user_id],
      references: [profiles.id],
    }),
  })
);

export const accountTypesRelations = relations(accountTypes, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(profiles, {
    fields: [accounts.user_id],
    references: [profiles.id],
  }),
  accountType: one(accountTypes, {
    fields: [accounts.account_type_id],
    references: [accountTypes.id],
  }),
  fixRateAccount: one(fixRateAccounts),
  floatingRateAccount: one(floatingRateAccounts),
  installmentAccount: one(installmentAccounts),
  mutations: many(mutations),
}));

export const fixRateAccountsRelations = relations(
  fixRateAccounts,
  ({ one }) => ({
    account: one(accounts, {
      fields: [fixRateAccounts.account_id],
      references: [accounts.id],
    }),
  })
);

export const floatingRateAccountsRelations = relations(
  floatingRateAccounts,
  ({ one }) => ({
    account: one(accounts, {
      fields: [floatingRateAccounts.account_id],
      references: [accounts.id],
    }),
  })
);

export const installmentAccountsRelations = relations(
  installmentAccounts,
  ({ one }) => ({
    account: one(accounts, {
      fields: [installmentAccounts.account_id],
      references: [accounts.id],
    }),
  })
);

export const mutationsRelations = relations(mutations, ({ one }) => ({
  account: one(accounts, {
    fields: [mutations.account_id],
    references: [accounts.id],
  }),
}));
