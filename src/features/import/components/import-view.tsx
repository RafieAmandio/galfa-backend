"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { FileUploadZone } from "./file-upload-zone";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportResultSummary } from "./import-result-summary";
import { parseImportFile } from "../lib/excel-parser";
import type {
  FixedRateRow,
  FloatingRateRow,
  InstallmentRow,
} from "../lib/excel-parser";
import {
  validateFixedRateRows,
  validateFloatingRateRows,
  validateInstallmentRows,
  type ValidationResult,
} from "../lib/import-validators";
import { bulkImportAccounts } from "../actions/bulk-import-accounts";
import { validateImportData } from "../actions/validate-import-data";

type ViewState = "idle" | "validating" | "preview" | "result";

interface ImportResult {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  results: {
    type: string;
    rowIndex: number;
    accountNumber: string;
    success: boolean;
    message: string;
  }[];
}

export function ImportView() {
  const [state, setState] = useState<ViewState>("idle");
  const [isImporting, setIsImporting] = useState(false);

  // Preview data
  const [fixedRateResults, setFixedRateResults] = useState<
    ValidationResult<FixedRateRow>[]
  >([]);
  const [floatingRateResults, setFloatingRateResults] = useState<
    ValidationResult<FloatingRateRow>[]
  >([]);
  const [installmentResults, setInstallmentResults] = useState<
    ValidationResult<InstallmentRow>[]
  >([]);

  // Import result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const validFixedCount = fixedRateResults.filter((r) => r.isValid).length;
  const validFloatingCount = floatingRateResults.filter(
    (r) => r.isValid
  ).length;
  const validInstallmentCount = installmentResults.filter(
    (r) => r.isValid
  ).length;
  const totalValid =
    validFixedCount + validFloatingCount + validInstallmentCount;

  const handleFileSelected = useCallback(async (file: File) => {
    try {
      setState("validating");

      // Step 1: Parse Excel
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseImportFile(arrayBuffer);

      // Step 2: Zod schema validation
      let fixedResults = validateFixedRateRows(parsed.fixedRate);
      let floatingResults = validateFloatingRateRows(parsed.floatingRate);
      let installmentResultsLocal = validateInstallmentRows(parsed.installment);

      // Step 3: Server-side DB validation (emails exist, account numbers unique)
      const allEmails = [
        ...parsed.fixedRate.map((r) => r.investorEmail),
        ...parsed.floatingRate.map((r) => r.investorEmail),
        ...parsed.installment.map((r) => r.investorEmail),
      ];
      const allAccountNumbers = [
        ...parsed.fixedRate.map((r) => r.accountNumber),
        ...parsed.floatingRate.map((r) => r.accountNumber),
        ...parsed.installment.map((r) => r.accountNumber),
      ];

      const dbValidation = await validateImportData(allEmails, allAccountNumbers);

      const newEmailSet = new Set(dbValidation.newEmails);
      const duplicateAccountMap = new Map(
        dbValidation.duplicateAccountNumbers.map((d) => [d.accountNumber, d.reason])
      );

      // Helper to merge DB validation into row results
      const mergeDbValidation = <T extends { investorEmail: string; accountNumber: string }>(
        results: ValidationResult<T>[]
      ) =>
        results.map((r) => {
          const extraErrors: string[] = [];
          const extraWarnings: string[] = [];

          // New email = warning (will auto-create investor)
          if (newEmailSet.has(r.data.investorEmail)) {
            extraWarnings.push(`New investor "${r.data.investorEmail}" will be created`);
          }
          // Duplicate account number = error (can't import)
          if (duplicateAccountMap.has(r.data.accountNumber)) {
            extraErrors.push(
              `Account number "${r.data.accountNumber}": ${duplicateAccountMap.get(r.data.accountNumber)}`
            );
          }

          return {
            ...r,
            errors: [...r.errors, ...extraErrors],
            warnings: [...r.warnings, ...extraWarnings],
            isValid: extraErrors.length > 0 ? false : r.isValid,
          };
        });

      fixedResults = mergeDbValidation(fixedResults);
      floatingResults = mergeDbValidation(floatingResults);
      installmentResultsLocal = mergeDbValidation(installmentResultsLocal);

      setFixedRateResults(fixedResults);
      setFloatingRateResults(floatingResults);
      setInstallmentResults(installmentResultsLocal);
      setState("preview");
    } catch (error) {
      setState("idle");
      alert(
        "Failed to parse the Excel file. Please make sure it is a valid .xlsx file."
      );
      console.error("Parse error:", error);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const validFixed = fixedRateResults
        .filter((r) => r.isValid)
        .map((r) => r.data);
      const validFloating = floatingRateResults
        .filter((r) => r.isValid)
        .map((r) => r.data);
      const validInstallment = installmentResults
        .filter((r) => r.isValid)
        .map((r) => r.data);

      const result = await bulkImportAccounts(
        validFixed,
        validFloating,
        validInstallment
      );
      setImportResult(result);
      setState("result");
    } catch (error) {
      alert("Import failed. Please try again.");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  }, [fixedRateResults, floatingRateResults, installmentResults]);

  const handleReset = useCallback(() => {
    setState("idle");
    setFixedRateResults([]);
    setFloatingRateResults([]);
    setInstallmentResults([]);
    setImportResult(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an Excel file to create multiple accounts at once
          </p>
        </div>
        <a
          href="/api/import/template"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#192473] text-white rounded-lg hover:bg-[#192473]/90 transition-colors font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          Download Template
        </a>
      </div>

      {/* Idle state - file upload */}
      {state === "idle" && (
        <FileUploadZone onFileSelected={handleFileSelected} />
      )}

      {/* Validating state */}
      {state === "validating" && (
        <div className="bg-white border border-border rounded-xl p-12 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#192473]" />
            <span className="text-sm text-muted-foreground">
              Validating import data against database...
            </span>
          </div>
        </div>
      )}

      {/* Preview state */}
      {state === "preview" && (
        <div className="space-y-4">
          <ImportPreviewTable
            fixedRateResults={fixedRateResults}
            floatingRateResults={floatingRateResults}
            installmentResults={installmentResults}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              disabled={totalValid === 0 || isImporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#192473] text-white rounded-lg hover:bg-[#192473]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isImporting
                ? "Importing..."
                : `Import ${totalValid} Valid Row${totalValid !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={handleReset}
              disabled={isImporting}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result state */}
      {state === "result" && importResult && (
        <ImportResultSummary
          totalProcessed={importResult.totalProcessed}
          totalSuccess={importResult.totalSuccess}
          totalFailed={importResult.totalFailed}
          results={importResult.results}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
