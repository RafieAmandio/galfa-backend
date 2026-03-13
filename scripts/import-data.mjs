import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const SUPABASE_URL = "https://vxohsqmmzzugaanbajip.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4b2hzcW1tenp1Z2FhbmJhamlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0MTA1MiwiZXhwIjoyMDYzNDE3MDUyfQ.Fgx1yWeCudSVrbwvgzF4X5-if40EXMd7mztOchRXJzI";
const CONNECTION_STRING =
  "postgresql://postgres.vxohsqmmzzugaanbajip:CjbELR8S1bO0kfPH@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const pool = new pg.Pool({ connectionString: CONNECTION_STRING });

// Parse Excel date serial number
function parseDate(cell) {
  if (cell instanceof Date) return cell;
  if (typeof cell === "number") {
    const date = XLSX.SSF.parse_date_code(cell);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }
  if (typeof cell === "string") {
    // Handle dd/mm/yyyy format
    const parts = cell.match(/^(\d{1,2})\/(\d{1,2})(\d{4})$/);
    if (parts) return new Date(+parts[3], +parts[2] - 1, +parts[1]);
    const parts2 = cell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts2) return new Date(+parts2[3], +parts2[2] - 1, +parts2[1]);
    return new Date(cell);
  }
  return null;
}

function parseRate(cell) {
  if (typeof cell === "number") return cell;
  if (typeof cell === "string") {
    const cleaned = cell.replace("%", "").trim();
    const num = parseFloat(cleaned);
    // If it was like "1.25%" we need to convert to decimal
    if (cell.includes("%")) return num / 100;
    return num;
  }
  return 0;
}

function parseBoolean(cell) {
  if (typeof cell === "boolean") return cell;
  if (typeof cell === "string") {
    return cell.toLowerCase().trim() === "yes" || cell.toLowerCase().trim() === "true";
  }
  return false;
}

async function getOrCreateUser(email, emailToUserMap) {
  const normalizedEmail = email.toLowerCase().replace(/\s+/g, "").trim();
  if (emailToUserMap.has(normalizedEmail)) {
    return emailToUserMap.get(normalizedEmail);
  }

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  if (existing) {
    emailToUserMap.set(normalizedEmail, existing.id);
    // Ensure profile exists
    await pool.query(
      `INSERT INTO profiles (id, full_name, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
      [existing.id, existing.user_metadata?.full_name || email.split("@")[0]]
    );
    // Ensure role exists
    await pool.query(
      `INSERT INTO role_assignments (user_id, role_name)
       SELECT $1, 'investor' WHERE NOT EXISTS (SELECT 1 FROM role_assignments WHERE user_id = $1)`,
      [existing.id]
    );
    return existing.id;
  }

  // Create new user
  const namePart = email.split("@")[0].replace(/\./g, " ");
  const fullName = namePart
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: "Galfa2025!",
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    console.error(`  ERROR creating user ${email}:`, error.message);
    return null;
  }

  const userId = data.user.id;

  // Create profile
  await pool.query(
    `INSERT INTO profiles (id, full_name, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
    [userId, fullName]
  );

  // Create role
  await pool.query(
    `INSERT INTO role_assignments (user_id, role_name) VALUES ($1, 'investor')`,
    [userId]
  );

  emailToUserMap.set(normalizedEmail, userId);
  console.log(`  Created user: ${email} -> ${userId} (${fullName})`);
  return userId;
}

async function run() {
  const wb = XLSX.readFile("galfa-import-template 2.xlsx");
  const emailToUserMap = new Map();

  // Pre-load existing users
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (u.email) emailToUserMap.set(u.email.toLowerCase(), u.id);
    }
  }
  console.log(`Found ${emailToUserMap.size} existing users`);

  // Collect all unique emails first
  const allEmails = new Set();
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[0] && typeof row[0] === "string" && row[0].includes("@")) {
        // Skip example row
        if (row[0] === "investor@example.com") continue;
        allEmails.add(row[0].replace(/\s+/g, "").trim().toLowerCase());
      }
    }
  }
  console.log(`\nFound ${allEmails.size} unique emails to process`);

  // Create all users first
  console.log("\n--- Creating Users ---");
  for (const email of allEmails) {
    await getOrCreateUser(email, emailToUserMap);
  }
  console.log(`\nUser map has ${emailToUserMap.size} entries`);

  // Track used account numbers for uniqueness
  const usedAccountNumbers = new Set();

  function makeUniqueAccountNumber(email, accountNum, type = "") {
    const prefix = email.split("@")[0].replace(/\s+/g, "").toLowerCase();
    const typePrefix = type ? `${type}-` : "";
    const unique = `${prefix}-${typePrefix}${accountNum}`;
    if (usedAccountNumbers.has(unique.toLowerCase())) {
      console.warn(`  WARNING: Duplicate account number ${unique}`);
    }
    usedAccountNumbers.add(unique.toLowerCase());
    return unique;
  }

  // Import Fixed Rate
  console.log("\n--- Importing Fixed Rate ---");
  const fixedSheet = XLSX.utils.sheet_to_json(wb.Sheets["Fixed Rate"], { header: 1 });
  let fixedOk = 0, fixedFail = 0;

  for (let i = 1; i < fixedSheet.length; i++) {
    const row = fixedSheet[i];
    if (!row || !row[0] || row[0] === "investor@example.com") continue;

    const email = String(row[0]).trim();
    const accountNumber = makeUniqueAccountNumber(email, String(row[1]).trim(), "FR");
    const capital = Number(row[2]) || 0;
    const annualRate = parseRate(row[3]);
    const startDate = parseDate(row[4]);
    const endDate = parseDate(row[5]);
    // Force is_rollover=false for bulk import (no parent accounts exist)
    const isRollover = false;

    const userId = emailToUserMap.get(email.replace(/\s+/g, "").toLowerCase());
    if (!userId) {
      console.error(`  Row ${i}: No user for ${email}`);
      fixedFail++;
      continue;
    }
    if (!startDate || !endDate) {
      console.error(`  Row ${i}: Invalid dates for ${email} ${accountNumber}`);
      fixedFail++;
      continue;
    }

    try {
      // Insert main account
      const res = await pool.query(
        `INSERT INTO accounts (account_type_id, account_number, capital, transaction_date, end_date, status, created_at, updated_at, is_rollover, admin_fee_applied, user_id)
         VALUES (1, $1, $2, $3, $4, 'active', NOW(), NOW(), $5, false, $6) RETURNING id`,
        [accountNumber, capital.toString(), startDate, endDate, isRollover, userId]
      );
      const accountId = res.rows[0].id;

      // Insert fix rate account
      await pool.query(
        `INSERT INTO fix_rate_accounts (account_id, annual_rate, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [accountId, annualRate.toString()]
      );

      // Insert mutation
      await pool.query(
        `INSERT INTO mutations (account_id, type, amount, description, status, transaction_date, created_at, updated_at)
         VALUES ($1, 'inbound', $2, 'Initial investment', 'completed', $3, NOW(), NOW())`,
        [accountId, capital.toString(), startDate]
      );

      fixedOk++;
    } catch (err) {
      console.error(`  Row ${i} (${email} ${accountNumber}):`, err.message);
      fixedFail++;
    }
  }
  console.log(`Fixed Rate: ${fixedOk} ok, ${fixedFail} failed`);

  // Import Floating Rate
  console.log("\n--- Importing Floating Rate ---");
  const floatingSheet = XLSX.utils.sheet_to_json(wb.Sheets["Floating Rate"], { header: 1 });
  let floatingOk = 0, floatingFail = 0;

  for (let i = 1; i < floatingSheet.length; i++) {
    const row = floatingSheet[i];
    if (!row || !row[0] || row[0] === "investor@example.com") continue;

    const email = String(row[0]).trim();
    const accountNumber = makeUniqueAccountNumber(email, String(row[1]).trim(), "FL");
    const capital = Number(row[2]) || 0;
    const adminFee = parseRate(row[3]);
    const startDate = parseDate(row[4]);
    const endDate = parseDate(row[5]);

    const userId = emailToUserMap.get(email.replace(/\s+/g, "").toLowerCase());
    if (!userId) {
      console.error(`  Row ${i}: No user for ${email}`);
      floatingFail++;
      continue;
    }

    try {
      const res = await pool.query(
        `INSERT INTO accounts (account_type_id, account_number, capital, transaction_date, end_date, status, created_at, updated_at, is_rollover, admin_fee_applied, user_id)
         VALUES (3, $1, $2, $3, $4, 'active', NOW(), NOW(), false, false, $5) RETURNING id`,
        [accountNumber, capital.toString(), startDate, endDate, userId]
      );
      const accountId = res.rows[0].id;

      await pool.query(
        `INSERT INTO floating_rate_accounts (account_id, admin_fee, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [accountId, (capital * adminFee).toString()]
      );

      await pool.query(
        `INSERT INTO mutations (account_id, type, amount, description, status, transaction_date, created_at, updated_at)
         VALUES ($1, 'inbound', $2, 'Initial floating investment', 'completed', $3, NOW(), NOW())`,
        [accountId, capital.toString(), startDate]
      );

      floatingOk++;
    } catch (err) {
      console.error(`  Row ${i} (${email} ${accountNumber}):`, err.message);
      floatingFail++;
    }
  }
  console.log(`Floating Rate: ${floatingOk} ok, ${floatingFail} failed`);

  // Import Installment
  console.log("\n--- Importing Installment ---");
  const installmentSheet = XLSX.utils.sheet_to_json(wb.Sheets["Installment"], { header: 1 });
  let installOk = 0, installFail = 0;

  for (let i = 1; i < installmentSheet.length; i++) {
    const row = installmentSheet[i];
    if (!row || !row[0] || row[0] === "investor@example.com") continue;

    const email = String(row[0]).trim();
    const accountNumber = makeUniqueAccountNumber(email, String(row[1]).trim(), "IN");
    const capital = Number(row[2]) || 0;
    const monthlyCoF = parseRate(row[3]);
    const adminFeePercentage = row[4] != null ? parseRate(row[4]) : 0;
    const startDate = parseDate(row[5]);
    const endDate = parseDate(row[6]);
    const investmentType = String(row[7] || "").trim().toLowerCase();

    const userId = emailToUserMap.get(email.replace(/\s+/g, "").toLowerCase());
    if (!userId) {
      console.error(`  Row ${i}: No user for ${email}`);
      installFail++;
      continue;
    }
    if (!startDate || !endDate) {
      console.error(`  Row ${i}: Invalid dates for ${email} ${accountNumber}`, row[5], row[6]);
      installFail++;
      continue;
    }

    try {
      const res = await pool.query(
        `INSERT INTO accounts (account_type_id, account_number, capital, transaction_date, end_date, status, created_at, updated_at, is_rollover, admin_fee_applied, user_id)
         VALUES (2, $1, $2, $3, $4, 'active', NOW(), NOW(), false, true, $5) RETURNING id`,
        [accountNumber, capital.toString(), startDate, endDate, userId]
      );
      const accountId = res.rows[0].id;

      const adminFee = capital * adminFeePercentage;

      await pool.query(
        `INSERT INTO installment_accounts (account_id, monthly_cof, admin_fee, investment_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [accountId, monthlyCoF.toString(), adminFee.toString(), investmentType]
      );

      await pool.query(
        `INSERT INTO mutations (account_id, type, amount, description, status, transaction_date, created_at, updated_at)
         VALUES ($1, 'inbound', $2, 'Monthly installment investment', 'completed', $3, NOW(), NOW())`,
        [accountId, capital.toString(), startDate]
      );

      installOk++;
    } catch (err) {
      console.error(`  Row ${i} (${email} ${accountNumber}):`, err.message);
      installFail++;
    }
  }
  console.log(`Installment: ${installOk} ok, ${installFail} failed`);

  // Final counts
  console.log("\n--- Final DB Counts ---");
  const counts = await pool.query(`
    SELECT 'profiles' as tbl, count(*) FROM profiles
    UNION ALL SELECT 'accounts', count(*) FROM accounts
    UNION ALL SELECT 'fix_rate_accounts', count(*) FROM fix_rate_accounts
    UNION ALL SELECT 'floating_rate_accounts', count(*) FROM floating_rate_accounts
    UNION ALL SELECT 'installment_accounts', count(*) FROM installment_accounts
    UNION ALL SELECT 'mutations', count(*) FROM mutations
  `);
  for (const row of counts.rows) {
    console.log(`  ${row.tbl}: ${row.count}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
