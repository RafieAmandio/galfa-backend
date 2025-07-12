"use client";

import { useState, useEffect } from "react";
import { getInvestorFloatingRateInvestments } from "../actions/get-investor-floating-rate-investments";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  gainedFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  growthPercentage: number;
  performancePercentage: number;
  appliedRule: string;
}

interface FloatingRateData {
  investments: FloatingRateInvestment[];
  totalGrossCapital: number;
  totalNetCapital: number;
  totalAdminFees: number;
  totalGainedFund: number;
  activeAccountsCount: number;
  currentMonthPerformance: {
    growthPercentage: number;
    performancePercentage: number;
    appliedRule: string;
    hasPerformanceData: boolean;
    message: string;
  };
}

interface InvestorFloatingRateInvestmentsTableProps {
  investorEmail: string;
}

export default function InvestorFloatingRateInvestmentsTable({
  investorEmail,
}: InvestorFloatingRateInvestmentsTableProps) {
  const [data, setData] = useState<FloatingRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!investorEmail) {
      setError("Investor email is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getInvestorFloatingRateInvestments(investorEmail);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch your floating rate investments");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [investorEmail]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "d MMMM yyyy");
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      completed: { variant: "secondary" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRolloverBadge = (isRollover: boolean, sequence: number) => {
    if (!isRollover) {
      return <Badge variant="outline">Original</Badge>;
    }
    return <Badge variant="secondary">Rollover #{sequence}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your floating rate investments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || data.investments.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">No floating rate investments found</p>
        <p className="text-sm text-gray-500">
          You don't have any floating rate investments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.investments.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.activeAccountsCount} active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invested Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalNetCapital)}
            </div>
            <p className="text-xs text-muted-foreground">After admin fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Month Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.currentMonthPerformance.hasPerformanceData ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Monthly Growth Rate
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {formatPercentage(
                    data.currentMonthPerformance.growthPercentage
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Performance Data Not Available
              </p>
              <p className="text-gray-600">
                {data.currentMonthPerformance.message}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact your administrator for more information.
              </p>
            </div>
          )}

          {data.investments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Total Profit This Month
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.totalGainedFund - data.totalNetCapital)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Floating Rate Investments</CardTitle>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Invested Capital</TableHead>
                  <TableHead>Gained Fund</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.investments.map((investment) => (
                  <TableRow key={investment.id}>
                    <TableCell className="font-medium">
                      {investment.accountNumber}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(investment.grossCapital)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(investment.gainedFund)}
                    </TableCell>
                    <TableCell>
                      {formatDate(investment.transactionDate)}
                    </TableCell>
                    <TableCell>
                      {investment.endDate
                        ? formatDate(investment.endDate)
                        : "Ongoing"}
                    </TableCell>
                    <TableCell>{getStatusBadge(investment.status)}</TableCell>
                    <TableCell>
                      {getRolloverBadge(
                        investment.isRollover,
                        investment.rolloverSequence
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
