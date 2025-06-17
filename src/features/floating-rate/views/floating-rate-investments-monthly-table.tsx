"use client";

import React, { useState, useEffect } from "react";
import { getFloatingRateInvestmentsWithMonthlyPerformance } from "../actions/get-floating-rate-investments-with-monthly-performance";
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
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performancePercentage: number;
  growthPercentage: number;
  appliedRule: string;
  hasData: boolean;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
}

interface FloatingRateDataWithMonthly {
  investments: FloatingRateInvestmentWithMonthly[];
  totalGrossCapital: number;
  totalNetCapital: number;
  totalAdminFees: number;
  activeAccountsCount: number;
  availableMonths: string[];
}

export default function FloatingRateInvestmentsMonthlyTable() {
  const [data, setData] = useState<FloatingRateDataWithMonthly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getFloatingRateInvestmentsWithMonthlyPerformance();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        "Failed to fetch floating rate investments with monthly performance"
      );
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd MMM yyyy");
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

  const toggleRowExpansion = (investmentId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(investmentId)) {
      newExpandedRows.delete(investmentId);
    } else {
      newExpandedRows.add(investmentId);
    }
    setExpandedRows(newExpandedRows);
  };

  const expandAll = () => {
    if (data) {
      setExpandedRows(new Set(data.investments.map((inv) => inv.id)));
    }
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">
          Loading floating rate investments with monthly performance...
        </span>
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

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              Total Gross Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalGrossCapital)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Net Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalNetCapital)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Admin Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalAdminFees)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.availableMonths.length}
            </div>
            <p className="text-xs text-muted-foreground">Performance periods</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Floating Rate Investments - Monthly Performance</CardTitle>
          <div className="flex gap-2">
            <Button onClick={expandAll} variant="outline" size="sm">
              <ChevronDown className="h-4 w-4 mr-2" />
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              <ChevronRight className="h-4 w-4 mr-2" />
              Collapse All
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Expand</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Gross Capital</TableHead>
                  <TableHead className="text-right">Net Capital</TableHead>
                  <TableHead className="text-center">Months Active</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No floating rate investments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.investments.map((investment) => (
                    <React.Fragment key={investment.id}>
                      {/* Main Investment Row */}
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(investment.id)}
                            className="p-1 h-8 w-8"
                          >
                            {expandedRows.has(investment.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {investment.accountNumber}
                        </TableCell>
                        <TableCell>{investment.investorEmail}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(investment.grossCapital)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(investment.netCapital)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {investment.totalMonthsActive} months
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(investment.transactionDate)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(investment.status)}
                        </TableCell>
                        <TableCell>
                          {investment.isRollover ? (
                            <Badge variant="outline">
                              Rollover #{investment.rolloverSequence}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Original
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Monthly Performance Rows */}
                      {expandedRows.has(investment.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0">
                            <div className="bg-muted/30 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">
                                  Monthly Performance History
                                </span>
                                <Badge variant="outline">
                                  {investment.monthlyPerformance.length} months
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {investment.monthlyPerformance.map(
                                  (monthData) => (
                                    <div
                                      key={monthData.monthLabel}
                                      className={`p-3 rounded-lg border ${
                                        monthData.hasData
                                          ? "bg-white border-green-200"
                                          : "bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">
                                          {monthData.monthLabel}
                                        </span>
                                        {monthData.hasData ? (
                                          <TrendingUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <div className="h-4 w-4 rounded bg-gray-300" />
                                        )}
                                      </div>

                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            Performance:
                                          </span>
                                          <Badge
                                            variant={
                                              monthData.hasData
                                                ? "secondary"
                                                : "outline"
                                            }
                                            className="text-xs"
                                          >
                                            {formatPercentage(
                                              monthData.performancePercentage
                                            )}
                                          </Badge>
                                        </div>

                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            Growth Rate:
                                          </span>
                                          <Badge
                                            variant={
                                              monthData.hasData
                                                ? "default"
                                                : "outline"
                                            }
                                            className="text-xs"
                                          >
                                            {formatPercentage(
                                              monthData.growthPercentage
                                            )}
                                          </Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">
                                            Rule:
                                          </span>{" "}
                                          {monthData.appliedRule}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
