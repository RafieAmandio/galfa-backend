"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/db/supabase/browser";
import { format } from "date-fns";
import { getInvestorMonthlyNPV } from "@/features/investor/actions/get-investor-monthly-npv";
import type {
  InvestorMonthlyNPVResult,
  MonthlyBreakdownEntry,
} from "@/features/investor/actions/get-investor-monthly-npv";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface InvestmentDetail {
  accountNumber: string;
  netInvestedAmount: number;
  startDate: Date;
  endDate: Date | null;
  annualRate: number;
  isRollover: boolean;
  rolloverSequence: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  daysInvested: number;
}

interface InvestorSummary {
  email: string;
  totalNetInvestedFund: number;
  totalNetPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  activeInvestments: number;
  investments: InvestmentDetail[];
}

interface InvestorFlatRateViewProps {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
  summary: InvestorSummary | null;
  error?: string;
}

export function InvestorFlatRateView({
  user,
  summary,
  error,
}: InvestorFlatRateViewProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = createBrowserClient();

  // Monthly NPV state
  const [monthlyData, setMonthlyData] =
    useState<InvestorMonthlyNPVResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  useEffect(() => {
    if (user.email && summary) {
      setLoadingMonthly(true);
      getInvestorMonthlyNPV(user.email)
        .then((data) => {
          setMonthlyData(data);
          if (data && data.investments.length > 0) {
            // Collect all unique months across all investments
            const allMonths = new Set<string>();
            data.investments.forEach((inv) => {
              inv.monthlyBreakdown.forEach((m) => allMonths.add(m.monthYear));
            });
            const monthsArray = Array.from(allMonths);
            // Default to the latest month (last in the array since they are chronological)
            if (monthsArray.length > 0) {
              setSelectedMonth(monthsArray[monthsArray.length - 1]);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch monthly NPV data:", err);
        })
        .finally(() => {
          setLoadingMonthly(false);
        });
    }
  }, [user.email, summary]);

  // Compute available months sorted chronologically
  const availableMonths = useMemo(() => {
    if (!monthlyData) return [];
    const allMonths = new Set<string>();
    monthlyData.investments.forEach((inv) => {
      inv.monthlyBreakdown.forEach((m) => allMonths.add(m.monthYear));
    });
    // Months are already in chronological format from the calculator ("MMMM yyyy")
    // Sort by parsing the month-year string
    return Array.from(allMonths).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [monthlyData]);

  // Get filtered data for the selected month
  const selectedMonthData = useMemo(() => {
    if (!monthlyData || !selectedMonth) return [];
    return monthlyData.investments
      .map((inv) => {
        const monthEntry = inv.monthlyBreakdown.find(
          (m) => m.monthYear === selectedMonth
        );
        if (!monthEntry) return null;
        return {
          accountNumber: inv.accountNumber,
          annualRate: inv.annualRate,
          ...monthEntry,
        };
      })
      .filter(
        (
          item
        ): item is {
          accountNumber: string;
          annualRate: number;
        } & MonthlyBreakdownEntry => item !== null
      );
  }, [monthlyData, selectedMonth]);

  // Compute totals for the selected month
  const selectedMonthTotals = useMemo(() => {
    return selectedMonthData.reduce(
      (acc, item) => ({
        startingBalance: acc.startingBalance + item.startingBalance,
        interestEarned: acc.interestEarned + item.interestEarned,
        redemptions: acc.redemptions + item.redemptions,
        endingBalance: acc.endingBalance + item.endingBalance,
      }),
      {
        startingBalance: 0,
        interestEarned: 0,
        redemptions: 0,
        endingBalance: 0,
      }
    );
  }, [selectedMonthData]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Ongoing";
    return format(new Date(date), "d MMMM yyyy");
  };

  const handleDownloadCSV = () => {
    if (selectedMonthData.length === 0) return;

    const header =
      "Account Number,Annual Rate,Beginning Balance,Interest Earned,Redemptions,Ending Balance (NPV),Days in Period";
    const rows = selectedMonthData.map(
      (item) =>
        `${item.accountNumber},${(item.annualRate * 100).toFixed(2)}%,${item.startingBalance.toFixed(2)},${item.interestEarned.toFixed(2)},${item.redemptions.toFixed(2)},${item.endingBalance.toFixed(2)},${item.daysInPeriod}`
    );
    // Add totals row
    rows.push(
      `TOTAL,,${selectedMonthTotals.startingBalance.toFixed(2)},${selectedMonthTotals.interestEarned.toFixed(2)},${selectedMonthTotals.redemptions.toFixed(2)},${selectedMonthTotals.endingBalance.toFixed(2)},`
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `npv-${selectedMonth.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-full">
        <h1 className="text-lg font-semibold text-foreground mb-4">Flat Rate Investments</h1>

        {error && (
          <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3 mb-4">
            <svg className="w-4 h-4 text-red-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Unable to load investments</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
              <button onClick={() => router.refresh()} className="mt-2 text-sm font-medium text-red-700 hover:text-red-800">
                Retry
              </button>
            </div>
          </div>
        )}

        {!summary && !error && (
          <div className="rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-sm font-medium text-foreground">No flat rate investments</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your advisor to get started.</p>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-4">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 rounded-lg overflow-hidden">
              <div className="bg-white p-4">
                <p className="text-xs text-muted-foreground">Net Invested</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{formatCurrency(summary.totalNetInvestedFund)}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{formatCurrency(summary.totalNetPresentValue)}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs text-muted-foreground">Gain/Loss</p>
                <p className={`text-lg font-semibold tabular-nums mt-0.5 ${summary.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(summary.totalGainLoss)}
                </p>
                <p className={`text-xs tabular-nums ${summary.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {summary.totalGainLossPercentage >= 0 ? "+" : ""}{summary.totalGainLossPercentage.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{summary.activeInvestments}</p>
              </div>
            </div>

            {/* Investment Details Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">Investment Details</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3">Account Number</th>
                      <th className="px-6 py-3">Net Amount</th>
                      <th className="px-6 py-3">Current Value</th>
                      <th className="px-6 py-3">Gain/Loss</th>
                      <th className="px-6 py-3">Annual Rate</th>
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3">Days</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.investments.filter(inv => inv.status === "active" || inv.status === "initial").map((investment, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">
                          {investment.accountNumber}
                        </td>
                        <td className="px-6 py-4">
                          {formatCurrency(investment.netInvestedAmount)}
                        </td>
                        <td className="px-6 py-4">
                          {formatCurrency(investment.currentValue)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-semibold ${
                              investment.gainLoss >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(investment.gainLoss)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(investment.annualRate * 100).toFixed(2)}%
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(investment.startDate)}
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(investment.endDate)}
                        </td>
                        <td className="px-6 py-4">{investment.daysInvested}</td>
                        <td className="px-6 py-4">
                          {investment.isRollover ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Rollover #{investment.rolloverSequence}
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Initial
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly NPV History */}
            {loadingMonthly && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly NPV History</CardTitle>
                  <CardDescription>Loading monthly data...</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loadingMonthly &&
              monthlyData &&
              monthlyData.investments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly NPV History</CardTitle>
                    <CardDescription>
                      View your net present value breakdown for a specific month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                      <div className="w-full sm:w-64">
                        <Select
                          value={selectedMonth}
                          onValueChange={setSelectedMonth}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a month" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMonths.map((month) => (
                              <SelectItem key={month} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCSV}
                        disabled={selectedMonthData.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>

                    {selectedMonthData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Annual Rate</TableHead>
                            <TableHead className="text-right">
                              Beginning Balance
                            </TableHead>
                            <TableHead className="text-right">
                              Interest Earned
                            </TableHead>
                            <TableHead className="text-right">
                              Redemptions
                            </TableHead>
                            <TableHead className="text-right">
                              Ending Balance (NPV)
                            </TableHead>
                            <TableHead className="text-right">
                              Days
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedMonthData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.accountNumber}
                              </TableCell>
                              <TableCell>
                                {(item.annualRate * 100).toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.startingBalance)}
                              </TableCell>
                              <TableCell className="text-right text-green-600 font-medium">
                                {formatCurrency(item.interestEarned)}
                              </TableCell>
                              <TableCell className="text-right text-red-600 font-medium">
                                {item.redemptions > 0
                                  ? formatCurrency(item.redemptions)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.endingBalance)}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.daysInPeriod}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={2} className="font-bold">
                              Total
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(
                                selectedMonthTotals.startingBalance
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(
                                selectedMonthTotals.interestEarned
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {selectedMonthTotals.redemptions > 0
                                ? formatCurrency(
                                    selectedMonthTotals.redemptions
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(
                                selectedMonthTotals.endingBalance
                              )}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No data available for the selected month.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Navigation
            <div className="bg-card rounded-xl border border-border p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  View Other Investments
                </h2>
                <p className="text-muted-foreground">
                  Access your complete portfolio across all investment types
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <a
                  href="/investor/summary"
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Complete Portfolio
                </a>
                <a
                  href="/investor/floating-rate"
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Floating Rate
                </a>
                <a
                  href="/investor/installments"
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  Installments
                </a>
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
