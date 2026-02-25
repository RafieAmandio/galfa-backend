"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";

interface RowResult {
  type: string;
  rowIndex: number;
  accountNumber: string;
  success: boolean;
  message: string;
}

interface ImportResultSummaryProps {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  results: RowResult[];
  onReset: () => void;
}

export function ImportResultSummary({
  totalProcessed,
  totalSuccess,
  totalFailed,
  results,
  onReset,
}: ImportResultSummaryProps) {
  const failedResults = results.filter((r) => !r.success);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 p-4 text-center shadow-soft">
          <p className="text-2xl font-bold text-foreground">{totalProcessed}</p>
          <p className="text-sm text-muted-foreground">Total Processed</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center shadow-soft">
          <p className="text-2xl font-bold text-green-700">{totalSuccess}</p>
          <p className="text-sm text-green-600">Succeeded</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center shadow-soft">
          <p className="text-2xl font-bold text-red-700">{totalFailed}</p>
          <p className="text-sm text-red-600">Failed</p>
        </div>
      </div>

      {/* Success/failed details */}
      {results.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account No.</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell className="font-mono text-xs">
                  {r.accountNumber}
                </TableCell>
                <TableCell className="text-xs">{r.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <button
        onClick={onReset}
        className="px-4 py-2 bg-[#192473] text-white rounded-lg hover:bg-[#192473]/90 transition-colors font-medium"
      >
        Import More
      </button>
    </div>
  );
}
