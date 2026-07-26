"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createUserByAdmin } from "@/features/admin/actions/create-user";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  accountTypes,
  authUsers,
  profiles,
  mutations,
} from "@/db/drizzle/schema";
import { eq, inArray } from "drizzle-orm";

interface FixedRateImportRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  annualRate: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  isRollover: boolean;
  parentAccountNumber: string;
  description: string;
}

interface FloatingRateImportRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  isRollover: boolean;
  parentAccountNumber: string;
  description: string;
}

interface InstallmentImportRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  monthlyCoF: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  investmentType: string;
  isRollover: boolean;
  parentAccountNumber: string;
  description: string;
}

interface RedemptionImportRow {
  accountNumber: string;
  redemptionAmount: number;
  redemptionDate: string;
  description: string;
}

interface RowResult {
  type: string;
  rowIndex: number;
  accountNumber: string;
  success: boolean;
  message: string;
}

interface BulkImportResult {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  results: RowResult[];
}

async function getOrCreateAccountType(
  db: ReturnType<typeof createDrizzleConnection>,
  name: string,
  description: string
): Promise<number> {
  const existing = await db
    .select({ id: accountTypes.id })
    .from(accountTypes)
    .where(eq(accountTypes.name, name))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(accountTypes)
    .values({ name, description, created_at: new Date(), updated_at: new Date() })
    .returning({ id: accountTypes.id });

  return created.id;
}

export async function bulkImportAccounts(
  fixedRateRows: FixedRateImportRow[],
  floatingRateRows: FloatingRateImportRow[],
  installmentRows: InstallmentImportRow[],
  redemptionRows: RedemptionImportRow[] = []
): Promise<BulkImportResult> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      results: [
        {
          type: "auth",
          rowIndex: -1,
          accountNumber: "",
          success: false,
          message: "Unauthorized: Admin access required",
        },
      ],
    };
  }

  const totalRows =
    fixedRateRows.length + floatingRateRows.length + installmentRows.length + redemptionRows.length;

  const db = createDrizzleConnection();

  // --- Phase 1: Auto-create investors (outside transaction, uses Supabase Admin API) ---
  const allEmails = [
    ...fixedRateRows.map((r) => r.investorEmail),
    ...floatingRateRows.map((r) => r.investorEmail),
    ...installmentRows.map((r) => r.investorEmail),
  ];
  const uniqueEmails = [...new Set(allEmails.filter(Boolean))];
  const preValidationErrors: RowResult[] = [];

  if (uniqueEmails.length > 0) {
    const existingUsers = await db
      .select({ id: authUsers.id, email: authUsers.email })
      .from(authUsers)
      .where(inArray(authUsers.email, uniqueEmails));
    const existingEmailSet = new Set(existingUsers.map((u) => u.email));

    for (const email of uniqueEmails) {
      if (!existingEmailSet.has(email)) {
        const tempPassword = `Import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const namePart = email.split("@")[0].replace(/[._-]/g, " ");
        const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        const createResult = await createUserByAdmin(email, tempPassword, fullName, "investor");
        if (!createResult.success) {
          // Mark all rows with this email as failed
          const addError = (type: string, rows: { investorEmail: string; accountNumber: string }[]) => {
            rows.forEach((row, i) => {
              if (row.investorEmail === email) {
                preValidationErrors.push({
                  type,
                  rowIndex: i,
                  accountNumber: row.accountNumber,
                  success: false,
                  message: `Failed to create investor ${email}: ${createResult.message}`,
                });
              }
            });
          };
          addError("Fixed Rate", fixedRateRows);
          addError("Floating Rate", floatingRateRows);
          addError("Installment", installmentRows);
        }
      }
    }

    // Ensure profiles exist for all auth users
    for (const user of existingUsers) {
      if (!user.id || !user.email) continue;
      const existingProfile = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      if (existingProfile.length === 0) {
        const namePart = user.email.split("@")[0].replace(/[._-]/g, " ");
        const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        await db
          .insert(profiles)
          .values({ id: user.id, full_name: fullName, updated_at: new Date() })
          .onConflictDoNothing();
      }
    }
  }

  if (preValidationErrors.length > 0) {
    return {
      totalProcessed: preValidationErrors.length,
      totalSuccess: 0,
      totalFailed: preValidationErrors.length,
      results: preValidationErrors,
    };
  }

  // --- Phase 2: Pre-fetch all lookup data ---
  const [fixTypeId, floatingTypeId, installmentTypeId] = await Promise.all([
    fixedRateRows.length > 0
      ? getOrCreateAccountType(db, "fix", "Fixed annual rate investment accounts with monthly compounding")
      : Promise.resolve(0),
    floatingRateRows.length > 0
      ? getOrCreateAccountType(db, "floating", "Floating rate investment accounts with variable performance-based returns")
      : Promise.resolve(0),
    installmentRows.length > 0
      ? getOrCreateAccountType(db, "installment", "Installment investment accounts")
      : Promise.resolve(0),
  ]);

  // Build investor email -> id map
  const investorLookup = await db
    .select({ id: profiles.id, email: authUsers.email })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(inArray(authUsers.email, uniqueEmails));
  const investorMap = new Map(investorLookup.map((i) => [i.email, i.id]));

  // Build parent account number -> id map
  const allParentNumbers = [
    ...fixedRateRows.map((r) => r.parentAccountNumber),
    ...floatingRateRows.map((r) => r.parentAccountNumber),
    ...installmentRows.map((r) => r.parentAccountNumber),
  ].filter(Boolean);
  const uniqueParentNumbers = [...new Set(allParentNumbers)];

  const parentMap = new Map<string, number>();
  if (uniqueParentNumbers.length > 0) {
    const parentAccounts = await db
      .select({ id: accounts.id, account_number: accounts.account_number })
      .from(accounts)
      .where(inArray(accounts.account_number, uniqueParentNumbers));
    for (const p of parentAccounts) {
      parentMap.set(p.account_number, p.id);
    }
  }

  // --- Phase 3: Validate all rows before starting the transaction ---
  const validationErrors: RowResult[] = [];

  for (let i = 0; i < fixedRateRows.length; i++) {
    const row = fixedRateRows[i];
    if (!investorMap.has(row.investorEmail)) {
      validationErrors.push({
        type: "Fixed Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Investor with email ${row.investorEmail} not found`,
      });
    }
    if (row.parentAccountNumber && !parentMap.has(row.parentAccountNumber)) {
      validationErrors.push({
        type: "Fixed Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Parent account "${row.parentAccountNumber}" not found`,
      });
    }
  }

  for (let i = 0; i < floatingRateRows.length; i++) {
    const row = floatingRateRows[i];
    if (!investorMap.has(row.investorEmail)) {
      validationErrors.push({
        type: "Floating Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Investor with email ${row.investorEmail} not found`,
      });
    }
    if (row.parentAccountNumber && !parentMap.has(row.parentAccountNumber)) {
      validationErrors.push({
        type: "Floating Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Parent account "${row.parentAccountNumber}" not found`,
      });
    }
  }

  for (let i = 0; i < installmentRows.length; i++) {
    const row = installmentRows[i];
    if (!investorMap.has(row.investorEmail)) {
      validationErrors.push({
        type: "Installment",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Investor with email ${row.investorEmail} not found`,
      });
    }
    if (row.parentAccountNumber && !parentMap.has(row.parentAccountNumber)) {
      validationErrors.push({
        type: "Installment",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: `Parent account "${row.parentAccountNumber}" not found`,
      });
    }
  }

  if (validationErrors.length > 0) {
    return {
      totalProcessed: validationErrors.length,
      totalSuccess: 0,
      totalFailed: validationErrors.length,
      results: validationErrors,
    };
  }

  // --- Phase 4: Single transaction for all inserts ---
  try {
    await db.transaction(async (tx) => {
      // Fixed Rate
      for (let i = 0; i < fixedRateRows.length; i++) {
        const row = fixedRateRows[i];
        const investorId = investorMap.get(row.investorEmail)!;
        const annualRate = row.annualRate / 100;
        const adminFeeRate =
          row.adminFeePercentage > 0 ? row.adminFeePercentage / 100 : 0;
        const parentAccountId = row.parentAccountNumber
          ? parentMap.get(row.parentAccountNumber) ?? null
          : null;

        const [newAccount] = await tx
          .insert(accounts)
          .values({
            user_id: investorId,
            account_type_id: fixTypeId,
            account_number: row.accountNumber,
            capital: row.capital.toString(),
            transaction_date: new Date(row.startDate + "T00:00:00"),
            end_date: new Date(row.endDate + "T00:00:00"),
            status: "active",
            is_rollover: row.isRollover,
            parent_account_id: parentAccountId,
            admin_fee_applied: adminFeeRate > 0,
            rollover_sequence: row.isRollover && parentAccountId ? 1 : null,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning({ id: accounts.id });

        await tx.insert(fixRateAccounts).values({
          account_id: newAccount.id,
          annual_rate: annualRate.toString(),
          admin_fee: adminFeeRate.toString(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        const mutationDesc = row.isRollover
          ? `Rollover investment from account ${parentAccountId || "N/A"}${row.description ? ` - ${row.description}` : ""}`
          : `Initial investment${row.description ? ` - ${row.description}` : ""}`;

        await tx.insert(mutations).values({
          account_id: newAccount.id,
          type: "inbound",
          amount: row.capital.toString(),
          description: mutationDesc,
          status: "completed",
          transaction_date: new Date(row.startDate + "T00:00:00"),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Floating Rate
      for (let i = 0; i < floatingRateRows.length; i++) {
        const row = floatingRateRows[i];
        const investorId = investorMap.get(row.investorEmail)!;
        const adminFeeDecimal = row.adminFeePercentage / 100;
        const adminFee = row.capital * adminFeeDecimal;
        const parentAccountId = row.parentAccountNumber
          ? parentMap.get(row.parentAccountNumber) ?? null
          : null;

        const [newAccount] = await tx
          .insert(accounts)
          .values({
            user_id: investorId,
            account_type_id: floatingTypeId,
            account_number: row.accountNumber,
            capital: row.capital.toString(),
            transaction_date: new Date(row.startDate + "T00:00:00"),
            end_date: new Date(row.endDate + "T00:00:00"),
            status: "active",
            is_rollover: row.isRollover,
            parent_account_id: parentAccountId,
            admin_fee_applied: true,
            rollover_sequence: row.isRollover && parentAccountId ? 1 : null,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning({ id: accounts.id });

        await tx.insert(floatingRateAccounts).values({
          account_id: newAccount.id,
          admin_fee: adminFee.toString(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        const mutationDesc = `Initial floating rate investment${row.description ? ` - ${row.description}` : ""}`;

        await tx.insert(mutations).values({
          account_id: newAccount.id,
          type: "inbound",
          amount: row.capital.toString(),
          description: mutationDesc,
          status: "completed",
          transaction_date: new Date(row.startDate + "T00:00:00"),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Installment
      for (let i = 0; i < installmentRows.length; i++) {
        const row = installmentRows[i];
        const investorId = investorMap.get(row.investorEmail)!;
        const adminFee = row.capital * (row.adminFeePercentage / 100);
        const monthlyCoFDecimal = row.monthlyCoF / 100;
        const parentAccountId = row.parentAccountNumber
          ? parentMap.get(row.parentAccountNumber) ?? null
          : null;

        const [newAccount] = await tx
          .insert(accounts)
          .values({
            account_type_id: installmentTypeId,
            account_number: row.accountNumber,
            capital: row.capital.toString(),
            transaction_date: new Date(row.startDate + "T00:00:00"),
            end_date: new Date(row.endDate + "T00:00:00"),
            status: "active",
            is_rollover: row.isRollover,
            parent_account_id: parentAccountId,
            admin_fee_applied: true,
            rollover_sequence: row.isRollover && parentAccountId ? 1 : null,
            user_id: investorId,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning({ id: accounts.id });

        await tx.insert(installmentAccounts).values({
          account_id: newAccount.id,
          monthly_cof: monthlyCoFDecimal.toString(),
          admin_fee: adminFee.toString(),
          investment_type: row.investmentType,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Redemptions
      const redemptionResults: { accountNumber: string; success: boolean; message: string }[] = [];
      if (redemptionRows.length > 0) {
        const redemptionAccountNumbers = [...new Set(redemptionRows.map((r) => r.accountNumber))];
        const redemptionAccounts = await tx
          .select({ id: accounts.id, account_number: accounts.account_number })
          .from(accounts)
          .where(inArray(accounts.account_number, redemptionAccountNumbers));
        const redemptionAccountMap = new Map(
          redemptionAccounts.map((a) => [a.account_number, a.id])
        );

        for (const row of redemptionRows) {
          const accountId = redemptionAccountMap.get(row.accountNumber);
          if (!accountId) {
            redemptionResults.push({
              accountNumber: row.accountNumber,
              success: false,
              message: `Account "${row.accountNumber}" not found in database`,
            });
            continue;
          }

          await tx.insert(mutations).values({
            account_id: accountId,
            type: "redemption",
            amount: row.redemptionAmount.toString(),
            description: row.description || "Bulk import redemption",
            status: "completed",
            transaction_date: new Date(row.redemptionDate + "T00:00:00"),
            created_at: new Date(),
            updated_at: new Date(),
          });
          redemptionResults.push({
            accountNumber: row.accountNumber,
            success: true,
            message: `Redemption of ${row.redemptionAmount.toLocaleString("id-ID")} from ${row.accountNumber} imported`,
          });
        }
      }
    });

    // Transaction succeeded — build success results
    const redemptionSuccessCount = redemptionResults.filter((r) => r.success).length;
    const redemptionFailCount = redemptionResults.filter((r) => !r.success).length;

    const results: RowResult[] = [
      ...fixedRateRows.map((row, i) => ({
        type: "Fixed Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: true,
        message: `Fixed rate account ${row.accountNumber} created successfully`,
      })),
      ...floatingRateRows.map((row, i) => ({
        type: "Floating Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: true,
        message: `Floating rate account ${row.accountNumber} created successfully`,
      })),
      ...installmentRows.map((row, i) => ({
        type: "Installment",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: true,
        message: `Installment account ${row.accountNumber} created successfully`,
      })),
      ...redemptionResults.map((r, i) => ({
        type: "Redemption",
        rowIndex: i,
        accountNumber: r.accountNumber,
        success: r.success,
        message: r.message,
      })),
    ];

    return {
      totalProcessed: totalRows,
      totalSuccess: totalRows - redemptionFailCount,
      totalFailed: redemptionFailCount,
      results,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      totalProcessed: totalRows,
      totalSuccess: 0,
      totalFailed: totalRows,
      results: [
        {
          type: "import",
          rowIndex: -1,
          accountNumber: "",
          success: false,
          message: `Import failed, all changes have been rolled back: ${errorMsg}`,
        },
      ],
    };
  }
}
