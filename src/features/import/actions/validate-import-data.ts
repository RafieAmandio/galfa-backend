"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, authUsers } from "@/db/drizzle/schema";
import { inArray } from "drizzle-orm";

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

  // Check which account numbers already exist in DB
  const uniqueAccountNumbers = [...new Set(accountNumbers.filter(Boolean))];
  const existingAccounts =
    uniqueAccountNumbers.length > 0
      ? await db
          .select({ account_number: accounts.account_number })
          .from(accounts)
          .where(inArray(accounts.account_number, uniqueAccountNumbers))
      : [];
  const existingAccountSet = new Set(
    existingAccounts.map((a) => a.account_number)
  );

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
