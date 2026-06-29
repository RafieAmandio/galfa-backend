"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  authUsers,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
} from "@/db/drizzle/schema";
import { inArray, eq } from "drizzle-orm";

interface ValidationCheckResult {
  newEmails: string[]; // emails not found in DB (will be created)
  duplicateAccountNumbers: { accountNumber: string; reason: string }[];
}

export async function validateImportData(
  emails: string[],
  accountNumbers: string[]
): Promise<ValidationCheckResult> {
  const db = createDrizzleConnection();

  // Check which emails exist
  const uniqueEmails = [...new Set(emails.filter(Boolean))];
  const existingUsers =
    uniqueEmails.length > 0
      ? await db
          .select({ email: authUsers.email })
          .from(authUsers)
          .where(inArray(authUsers.email, uniqueEmails))
      : [];
  const existingEmailSet = new Set(existingUsers.map((u) => u.email));
  const newEmails = uniqueEmails.filter((e) => !existingEmailSet.has(e));

  // Check which account numbers already exist in DB with a real type-specific entry
  const uniqueAccountNumbers = [...new Set(accountNumbers.filter(Boolean))];
  const existingAccountSet = new Set<string>();
  const orphanedAccountIds: number[] = [];

  if (uniqueAccountNumbers.length > 0) {
    const existingAccounts = await db
      .select({
        id: accounts.id,
        account_number: accounts.account_number,
        hasFixRate: fixRateAccounts.id,
        hasFloatingRate: floatingRateAccounts.id,
        hasInstallment: installmentAccounts.id,
      })
      .from(accounts)
      .leftJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .leftJoin(floatingRateAccounts, eq(accounts.id, floatingRateAccounts.account_id))
      .leftJoin(installmentAccounts, eq(accounts.id, installmentAccounts.account_id))
      .where(inArray(accounts.account_number, uniqueAccountNumbers));

    for (const a of existingAccounts) {
      if (a.hasFixRate || a.hasFloatingRate || a.hasInstallment) {
        existingAccountSet.add(a.account_number);
      } else {
        orphanedAccountIds.push(a.id);
      }
    }

    if (orphanedAccountIds.length > 0) {
      await db
        .delete(accounts)
        .where(inArray(accounts.id, orphanedAccountIds));
    }
  }

  // Check for duplicates within the file itself
  const seenInFile = new Map<string, number>();
  const fileDuplicates = new Set<string>();
  for (const acctNum of accountNumbers) {
    if (!acctNum) continue;
    const count = (seenInFile.get(acctNum) || 0) + 1;
    seenInFile.set(acctNum, count);
    if (count > 1) fileDuplicates.add(acctNum);
  }

  const duplicateAccountNumbers: { accountNumber: string; reason: string }[] =
    [];
  for (const acctNum of uniqueAccountNumbers) {
    if (existingAccountSet.has(acctNum)) {
      duplicateAccountNumbers.push({
        accountNumber: acctNum,
        reason: "Already exists in database",
      });
    } else if (fileDuplicates.has(acctNum)) {
      duplicateAccountNumbers.push({
        accountNumber: acctNum,
        reason: "Duplicated within import file",
      });
    }
  }

  return { newEmails, duplicateAccountNumbers };
}
