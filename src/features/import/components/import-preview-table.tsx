"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationResult } from "../lib/import-validators";
import type {
  FixedRateRow,
  FloatingRateRow,
  InstallmentRow,
} from "../lib/excel-parser";

interface ImportPreviewTableProps {
  fixedRateResults: ValidationResult<FixedRateRow>[];
  floatingRateResults: ValidationResult<FloatingRateRow>[];
  installmentResults: ValidationResult<InstallmentRow>[];
}

function StatusCell({ result }: { result: ValidationResult<unknown> }) {
  if (!result.isValid) {
    return (
      <div className="space-y-1">
        {result.errors.map((error, i) => (
          <div key={`e-${i}`} className="flex items-start gap-1.5">
            <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-red-600">{error}</span>
          </div>
        ))}
      </div>
    );
  }

  if (result.warnings.length > 0) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs mb-1">
          Valid (with notes)
        </Badge>
        {result.warnings.map((warning, i) => (
          <div key={`w-${i}`} className="flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-amber-600">{warning}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
      Valid
    </Badge>
  );
}

function SummaryBadges({
  results,
}: {
  results: ValidationResult<unknown>[];
}) {
  const valid = results.filter((r) => r.isValid).length;
  const invalid = results.length - valid;
  const withWarnings = results.filter((r) => r.isValid && r.warnings.length > 0).length;

  return (
    <div className="flex gap-2 mb-4">
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {valid} valid
      </Badge>
      {withWarnings > 0 && (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {withWarnings} new investors
        </Badge>
      )}
      {invalid > 0 && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {invalid} with errors
        </Badge>
      )}
    </div>
  );
}

export function ImportPreviewTable({
  fixedRateResults,
  floatingRateResults,
  installmentResults,
}: ImportPreviewTableProps) {
  const tabs: { value: string; label: string; count: number; errors: number }[] = [];
  if (fixedRateResults.length > 0)
    tabs.push({
      value: "fixed",
      label: "Fixed Rate",
      count: fixedRateResults.length,
      errors: fixedRateResults.filter((r) => !r.isValid).length,
    });
  if (floatingRateResults.length > 0)
    tabs.push({
      value: "floating",
      label: "Floating Rate",
      count: floatingRateResults.length,
      errors: floatingRateResults.filter((r) => !r.isValid).length,
    });
  if (installmentResults.length > 0)
    tabs.push({
      value: "installment",
      label: "Installment",
      count: installmentResults.length,
      errors: installmentResults.filter((r) => !r.isValid).length,
    });

  if (tabs.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No data found in the uploaded file. Make sure the sheet names are
          &quot;Fixed Rate&quot;, &quot;Floating Rate&quot;, and/or
          &quot;Installment&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <Tabs defaultValue={tabs[0].value}>
        <div className="p-4 border-b border-border">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                {tab.label} ({tab.count})
                {tab.errors > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {tab.errors}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {fixedRateResults.length > 0 && (
          <TabsContent value="fixed" className="p-4 mt-0">
            <SummaryBadges results={fixedRateResults} />
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account No.</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">Admin Fee (%)</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Rollover</TableHead>
                    <TableHead>Parent Acct</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedRateResults.map((r) => (
                    <TableRow
                      key={r.rowIndex}
                      className={cn(
                      !r.isValid && "bg-red-50/50",
                      r.isValid && r.warnings.length > 0 && "bg-amber-50/50"
                    )}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {r.rowIndex + 2}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.investorEmail}</TableCell>
                      <TableCell className="text-sm font-medium">{r.data.accountNumber}</TableCell>
                      <TableCell className="text-sm text-right">
                        {r.data.capital.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-sm text-right">{r.data.annualRate}</TableCell>
                      <TableCell className="text-sm text-right">{r.data.adminFeePercentage}</TableCell>
                      <TableCell className="text-sm">{r.data.startDate}</TableCell>
                      <TableCell className="text-sm">{r.data.endDate}</TableCell>
                      <TableCell className="text-sm">
                        {r.data.isRollover ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.parentAccountNumber || "-"}</TableCell>
                      <TableCell>
                        <StatusCell result={r} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        {floatingRateResults.length > 0 && (
          <TabsContent value="floating" className="p-4 mt-0">
            <SummaryBadges results={floatingRateResults} />
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account No.</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Admin Fee (%)</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Rollover</TableHead>
                    <TableHead>Parent Acct</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floatingRateResults.map((r) => (
                    <TableRow
                      key={r.rowIndex}
                      className={cn(
                      !r.isValid && "bg-red-50/50",
                      r.isValid && r.warnings.length > 0 && "bg-amber-50/50"
                    )}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {r.rowIndex + 2}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.investorEmail}</TableCell>
                      <TableCell className="text-sm font-medium">{r.data.accountNumber}</TableCell>
                      <TableCell className="text-sm text-right">
                        {r.data.capital.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {r.data.adminFeePercentage}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.startDate}</TableCell>
                      <TableCell className="text-sm">{r.data.endDate}</TableCell>
                      <TableCell className="text-sm">
                        {r.data.isRollover ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.parentAccountNumber || "-"}</TableCell>
                      <TableCell>
                        <StatusCell result={r} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        {installmentResults.length > 0 && (
          <TabsContent value="installment" className="p-4 mt-0">
            <SummaryBadges results={installmentResults} />
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account No.</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">CoF (%)</TableHead>
                    <TableHead className="text-right">Admin Fee (%)</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rollover</TableHead>
                    <TableHead>Parent Acct</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installmentResults.map((r) => (
                    <TableRow
                      key={r.rowIndex}
                      className={cn(
                      !r.isValid && "bg-red-50/50",
                      r.isValid && r.warnings.length > 0 && "bg-amber-50/50"
                    )}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {r.rowIndex + 2}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.investorEmail}</TableCell>
                      <TableCell className="text-sm font-medium">{r.data.accountNumber}</TableCell>
                      <TableCell className="text-sm text-right">
                        {r.data.capital.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-sm text-right">{r.data.monthlyCoF}</TableCell>
                      <TableCell className="text-sm text-right">
                        {r.data.adminFeePercentage}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.startDate}</TableCell>
                      <TableCell className="text-sm">{r.data.endDate}</TableCell>
                      <TableCell className="text-sm">{r.data.investmentType}</TableCell>
                      <TableCell className="text-sm">
                        {r.data.isRollover ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.parentAccountNumber || "-"}</TableCell>
                      <TableCell>
                        <StatusCell result={r} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
