"use client";

import React, { useEffect, useState } from "react";
import { getInvestorInstallmentInvestments } from "../actions/get-installments";
import { parse } from "date-fns";

interface InvestorInstallmentSummary {
  investorEmail: string;
  totalNetInvestorFund: number;
  totalRedeemedAmount: number;
  totalRedemptions: number;
  investments: any[];
}

interface InvestorInstallmentTableProps {
  investorEmail: string;
}

export function InvestorInstallmentTable({
  investorEmail,
}: InvestorInstallmentTableProps) {
  const [summary, setSummary] = useState<InvestorInstallmentSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getInvestorInstallmentInvestments(investorEmail);
        setSummary(data);
      } catch (error) {
        console.error("Error fetching investor installment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [investorEmail]);

  const toggleExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  if (!summary || summary.investments.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No installment investments found.
      </div>
    );
  }

  // Calculate monthly summary for investor
  const monthlyNetFunds: { [monthYear: string]: number } = {};

  summary.investments.forEach((investment) => {
    investment.monthlyData.forEach((month: any) => {
      if (!monthlyNetFunds[month.monthYear]) {
        monthlyNetFunds[month.monthYear] = 0;
      }
      // For investor view, we track remaining capital after each payment
      monthlyNetFunds[month.monthYear] += month.netPresentValue;
    });
  });

  // Sort months chronologically instead of alphabetically
  const uniqueMonths = Object.keys(monthlyNetFunds).sort((a, b) => {
    // Parse the month strings (e.g., "Jan 2024") into dates for proper sorting
    const dateA = parse(a, "MMM yyyy", new Date());
    const dateB = parse(b, "MMM yyyy", new Date());
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Total Net Investor Fund
          </p>
          <p className="text-xl font-semibold text-blue-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalNetInvestorFund)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Capital after admin fees</p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Projected Amount
          </p>
          <p className="text-xl font-semibold text-green-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalRedeemedAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Amount received back after redemption
          </p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Total Redemptions
          </p>
          <p className="text-xl font-semibold text-red-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalRedemptions || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Early redemptions processed
          </p>
        </div>
      </div>

      {/* Monthly Net Fund Summary */}
      {uniqueMonths.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-sm">Monthly Net Investor Fund</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Remaining Net Fund
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {uniqueMonths.map((month) => (
                  <tr key={month} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {month}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(monthlyNetFunds[month])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Investments */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-sm">Your Installment Investments</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Gross Capital
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Admin Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Net Capital
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Monthly Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.investments.map((investment, index) => (
                <React.Fragment key={investment.id}>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {investment.accountNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                          investment.investmentType === "principle"
                            ? "bg-blue-100 text-blue-800"
                            : investment.investmentType === "interest_only"
                              ? "bg-green-100 text-green-800"
                              : investment.investmentType === "bullet"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {investment.investmentType === "principle"
                          ? "Principle + Interest"
                          : investment.investmentType === "interest_only"
                            ? "Interest Only"
                            : investment.investmentType === "bullet"
                              ? "Bullet"
                              : "Co. Menurun"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.grossCapital)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                      -
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.adminFee)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.netCapital)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {investment.durationMonths} months
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {(investment.monthlyCof * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                          investment.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {investment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleExpansion(index)}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        {expandedRows.has(index) ? "Hide" : "Show"} Schedule
                      </button>
                    </td>
                  </tr>

                  {expandedRows.has(index) && (
                    <>
                      <tr className="bg-muted/30">
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Payment Schedule for {investment.accountNumber}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Month
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Principal Payment
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Interest Payment
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Total Received
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Net Present Value
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                      {investment.monthlyData.map((monthData: any) => (
                        <tr
                          key={monthData.monthYear}
                          className="bg-muted/20"
                        >
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {monthData.monthYear}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.principalPayment)}
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600 font-medium">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.interestPayment)}
                          </td>
                          <td className="px-4 py-2 text-sm text-blue-600 font-medium">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.totalPayment)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.netPresentValue)}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
