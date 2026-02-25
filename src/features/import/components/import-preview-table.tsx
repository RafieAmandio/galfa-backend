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

export function ImportPreviewTable({
  fixedRateResults,
  floatingRateResults,
  installmentResults,
}: ImportPreviewTableProps) {
  const tabs: { value: string; label: string; count: number }[] = [];
  if (fixedRateResults.length > 0)
    tabs.push({
      value: "fixed",
      label: "Fixed Rate",
      count: fixedRateResults.length,
    });
  if (floatingRateResults.length > 0)
    tabs.push({
      value: "floating",
      label: "Floating Rate",
      count: floatingRateResults.length,
    });
  if (installmentResults.length > 0)
    tabs.push({
      value: "installment",
      label: "Installment",
      count: installmentResults.length,
    });

  if (tabs.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No data found in the uploaded file. Make sure the sheet names are
        &quot;Fixed Rate&quot;, &quot;Floating Rate&quot;, and/or
        &quot;Installment&quot;.
      </p>
    );
  }

  return (
    <Tabs defaultValue={tabs[0].value}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label} ({tab.count})
          </TabsTrigger>
        ))}
      </TabsList>

      {fixedRateResults.length > 0 && (
        <TabsContent value="fixed">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Rate (%)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Rollover</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedRateResults.map((r) => (
                <TableRow
                  key={r.rowIndex}
                  className={cn(!r.isValid && "bg-red-50")}
                >
                  <TableCell>{r.rowIndex + 1}</TableCell>
                  <TableCell>{r.data.investorEmail}</TableCell>
                  <TableCell>{r.data.accountNumber}</TableCell>
                  <TableCell>{r.data.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell>{r.data.annualRate}</TableCell>
                  <TableCell>{r.data.startDate}</TableCell>
                  <TableCell>{r.data.endDate}</TableCell>
                  <TableCell>{r.data.isRollover ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {r.isValid ? (
                      <span className="text-green-600 font-medium">Valid</span>
                    ) : (
                      <span className="text-red-600 text-xs">
                        {r.errors.join("; ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      )}

      {floatingRateResults.length > 0 && (
        <TabsContent value="floating">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Admin Fee (%)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floatingRateResults.map((r) => (
                <TableRow
                  key={r.rowIndex}
                  className={cn(!r.isValid && "bg-red-50")}
                >
                  <TableCell>{r.rowIndex + 1}</TableCell>
                  <TableCell>{r.data.investorEmail}</TableCell>
                  <TableCell>{r.data.accountNumber}</TableCell>
                  <TableCell>{r.data.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell>{r.data.adminFeePercentage}</TableCell>
                  <TableCell>{r.data.startDate}</TableCell>
                  <TableCell>{r.data.endDate}</TableCell>
                  <TableCell>
                    {r.isValid ? (
                      <span className="text-green-600 font-medium">Valid</span>
                    ) : (
                      <span className="text-red-600 text-xs">
                        {r.errors.join("; ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      )}

      {installmentResults.length > 0 && (
        <TabsContent value="installment">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>CoF (%)</TableHead>
                <TableHead>Admin Fee (%)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installmentResults.map((r) => (
                <TableRow
                  key={r.rowIndex}
                  className={cn(!r.isValid && "bg-red-50")}
                >
                  <TableCell>{r.rowIndex + 1}</TableCell>
                  <TableCell>{r.data.investorEmail}</TableCell>
                  <TableCell>{r.data.accountNumber}</TableCell>
                  <TableCell>{r.data.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell>{r.data.monthlyCoF}</TableCell>
                  <TableCell>{r.data.adminFeePercentage}</TableCell>
                  <TableCell>{r.data.startDate}</TableCell>
                  <TableCell>{r.data.endDate}</TableCell>
                  <TableCell>{r.data.investmentType}</TableCell>
                  <TableCell>
                    {r.isValid ? (
                      <span className="text-green-600 font-medium">Valid</span>
                    ) : (
                      <span className="text-red-600 text-xs">
                        {r.errors.join("; ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      )}
    </Tabs>
  );
}
