"use client";

import React from "react";
import { getFlatRateInvestments } from "../actions/get-flat-rate-investments";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

export function FlatRateInvestmentsTable() {
  const [investments, setInvestments] = useState<
    Awaited<ReturnType<typeof getFlatRateInvestments>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [investmentsData] = await Promise.all([getFlatRateInvestments()]);
      setInvestments(investmentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const expandAll = () => {
    setExpandedRows(new Set(investments.map((_, index) => index)));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // Calculate totals for summable columns
  const totals = investments.reduce(
    (acc, investment) => ({
      grossCapital: acc.grossCapital + investment.grossCapital,
      adminFee: acc.adminFee + investment.adminFee,
      netCapital: acc.netCapital + investment.netCapital,
      currentValue: acc.currentValue + investment.currentValue,
      totalRedemptions: acc.totalRedemptions + investment.totalRedemptions,
    }),
    {
      grossCapital: 0,
      adminFee: 0,
      netCapital: 0,
      currentValue: 0,
      totalRedemptions: 0,
    }
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const formatDate = (date: Date) => {
    return format(new Date(date), "d MMMM yyyy");
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      redeemed: "secondary",
      rollover: "outline",
      mature: "outline",
      closed: "outline",
    } as const;

    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      redeemed: "bg-purple-100 text-purple-800 border-purple-200",
      rollover: "bg-blue-100 text-blue-800 border-blue-200",
      mature: "bg-yellow-100 text-yellow-800 border-yellow-200",
      closed: "bg-gray-100 text-gray-800 border-gray-200",
    } as const;

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || "outline"}
        className={colors[status as keyof typeof colors] || colors.closed}
      >
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">
              Loading investments...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Investments
                </p>
                <p className="text-2xl font-bold">{investments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Gross Capital
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.grossCapital)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Current Value
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.currentValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Redeemed
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.totalRedemptions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            Flat Rate Investments
          </CardTitle>
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
                  <TableHead>Account</TableHead>
                  <TableHead>Gross Capital</TableHead>
                  <TableHead>Admin Fee</TableHead>
                  <TableHead>Net Capital</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Total Redeemed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment, index) => (
                  <React.Fragment key={index}>
                    {/* Main Investment Row */}
                    <TableRow>
                      <TableCell className="font-medium">
                        {investment.name}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(investment.grossCapital)}
                      </TableCell>
                      <TableCell className="font-mono text-red-600">
                        -{formatCurrency(investment.adminFee)}
                      </TableCell>
                      <TableCell className="font-mono text-green-600 font-medium">
                        {formatCurrency(investment.netCapital)}
                      </TableCell>
                      <TableCell>{investment.rate}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(investment.transDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(investment.endDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(investment.status)}</TableCell>
                      <TableCell className="font-mono text-blue-600 font-medium">
                        {formatCurrency(investment.currentValue)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {investment.totalRedemptions > 0 ? (
                          <span className="text-red-600">
                            -{formatCurrency(investment.totalRedemptions)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => toggleExpansion(index)}
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Monthly Details */}
                    {expandedRows.has(index) && (
                      <TableRow>
                        <TableCell colSpan={11} className="p-0">
                          <div className="bg-muted/30 p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">
                                Monthly Performance History - {investment.name}
                              </span>
                              <Badge variant="outline">
                                {investment.monthlyData.length} months
                              </Badge>
                            </div>

                            <div className="rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-center">
                                      Days
                                    </TableHead>
                                    <TableHead>Beginning Balance</TableHead>
                                    <TableHead>Interest Earned</TableHead>
                                    <TableHead>Ending Balance</TableHead>
                                    <TableHead className="text-center">
                                      Redemptions
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {investment.monthlyData.map((monthData) => (
                                    <TableRow key={monthData.monthYear}>
                                      <TableCell className="font-medium">
                                        {monthData.monthYear}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {monthData.daysInPeriod}
                                      </TableCell>
                                      <TableCell className="font-mono">
                                        {formatCurrency(
                                          monthData.beginningBalance
                                        )}
                                      </TableCell>
                                      <TableCell className="font-mono text-green-600">
                                        {formatCurrency(
                                          monthData.monthlyInterest
                                        )}
                                      </TableCell>
                                      <TableCell className="font-mono text-blue-600 font-medium">
                                        {formatCurrency(
                                          monthData.endingBalance
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {monthData.redemptions &&
                                        monthData.redemptions > 0 ? (
                                          <span className="font-mono text-red-600">
                                            -
                                            {formatCurrency(
                                              monthData.redemptions
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            -
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-yellow-50 border-t-2 border-yellow-200 font-bold hover:bg-yellow-50">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="font-mono font-bold">
                    {formatCurrency(totals.grossCapital)}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-red-600">
                    -{formatCurrency(totals.adminFee)}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-green-600">
                    {formatCurrency(totals.netCapital)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="font-mono font-bold text-blue-600">
                    {formatCurrency(totals.currentValue)}
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    {totals.totalRedemptions > 0 ? (
                      <span className="text-red-600">
                        -{formatCurrency(totals.totalRedemptions)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && investments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-muted rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Investments Found</h3>
            <p className="text-muted-foreground">
              No flat rate investments have been created yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
