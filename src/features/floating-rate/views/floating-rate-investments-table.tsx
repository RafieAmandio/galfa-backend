"use client";

import { useState, useEffect } from "react";
import { getFloatingRateInvestments } from "../actions/get-floating-rate-investments";
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
  growthPercentage: number;
  performancePercentage: number;
  appliedRule: string;
}

interface FloatingRateData {
  investments: FloatingRateInvestment[];
  totalGrossCapital: number;
  totalNetCapital: number;
  totalAdminFees: number;
  activeAccountsCount: number;
}

export default function FloatingRateInvestmentsTable() {
  const [data, setData] = useState<FloatingRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getFloatingRateInvestments();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch floating rate investments");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading floating rate investments...</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Investments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Floating Rate Investments</CardTitle>
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
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Gross Capital</TableHead>
                  <TableHead className="text-right">Admin Fee</TableHead>
                  <TableHead className="text-right">Net Capital</TableHead>
                  <TableHead className="text-right">Performance %</TableHead>
                  <TableHead className="text-right">Growth Rate %</TableHead>
                  <TableHead>Applied Rule</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      No floating rate investments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.investments.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">
                        {investment.accountNumber}
                      </TableCell>
                      <TableCell>{investment.investorEmail}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(investment.grossCapital)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(investment.adminFee)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(investment.netCapital)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {formatPercentage(investment.performancePercentage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">
                          {formatPercentage(investment.growthPercentage)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {investment.appliedRule}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(investment.transactionDate)}
                      </TableCell>
                      <TableCell>
                        {investment.endDate
                          ? formatDate(investment.endDate)
                          : "N/A"}
                      </TableCell>
                      <TableCell>{getStatusBadge(investment.status)}</TableCell>
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
