"use client";

import React, { useState, useEffect } from "react";
import {
  redeemFloatingRateAccount,
  getFloatingRateAccountRedemptions,
} from "../actions/redemption-floating-rate-account";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getFloatingRateAccountsForRedemptionQueryOptions } from "@/features/floating-rate/actions/get-floating-rate-accounts-for-redemption/query-options";

interface RedemptionModalProps {
  onRedemptionComplete?: () => void;
  trigger?: React.ReactNode;
}

interface AccountOption {
  id: number;
  name: string;
  grossCapital: number;
  netCapital: number;
  currentValue: number;
  investorEmail: string;
}

interface RedemptionHistory {
  id: number;
  amount: number;
  description: string | null;
  status: string;
  transactionDate: Date;
  createdAt: Date;
}

export function RedeemFloatingRateModal({
  onRedemptionComplete,
  trigger,
}: RedemptionModalProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [redemptionAmount, setRedemptionAmount] = useState("");
  const [redemptionDate, setRedemptionDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [isFullRedemption, setIsFullRedemption] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [redemptionHistory, setRedemptionHistory] = useState<
    RedemptionHistory[]
  >([]);

  // Fetch accounts using Tanstack React Query
  const {
    data: filteredAccounts,
    isLoading: isAccountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useQuery(
    getFloatingRateAccountsForRedemptionQueryOptions(redemptionDate)
  );

  // Convert accounts to options when data changes
  useEffect(() => {
    if (filteredAccounts) {
      setAccounts(convertToAccountOptions(filteredAccounts));
    }
  }, [filteredAccounts]);

  // Handle accounts error
  useEffect(() => {
    if (accountsError) {
      setMessage({
        type: "error",
        text: "Failed to load accounts",
      });
    }
  }, [accountsError]);

  // Load redemption history for selected account
  useEffect(() => {
    const loadRedemptionHistory = async () => {
      if (selectedAccountId && open) {
        try {
          const history = await getFloatingRateAccountRedemptions(
            selectedAccountId
          );
          setRedemptionHistory(history);
        } catch (error) {
          console.error("Error loading redemption history:", error);
        }
      } else {
        setRedemptionHistory([]);
      }
    };

    loadRedemptionHistory();
  }, [selectedAccountId, open]);

  // Update redemption amount when full redemption is toggled or account changes
  useEffect(() => {
    if (isFullRedemption && selectedAccountId) {
      const selectedAccount = accounts.find(
        (acc) => acc.id === selectedAccountId
      );
      if (selectedAccount) {
        setRedemptionAmount(selectedAccount.currentValue.toString());
      }
    } else if (!isFullRedemption) {
      setRedemptionAmount("");
    }
  }, [isFullRedemption, selectedAccountId, accounts]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedAccountId(null);
      setRedemptionAmount("");
      setDescription("");
      setMessage(null);
      setRedemptionHistory([]);
      setRedemptionDate(new Date());
      setIsFullRedemption(false);
    }
  }, [open]);

  // Helper function to check if date is today
  const isTodayDate = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to convert redemption accounts to account options
  const convertToAccountOptions = (redemptionAccounts: any[]) => {
    return redemptionAccounts.map((account) => ({
      id: account.id,
      name: account.accountNumber,
      grossCapital: account.grossCapital,
      netCapital: account.netInvestorFund,
      currentValue: account.currentValue,
      investorEmail: account.investorEmail,
    }));
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setRedemptionDate(date);
      // Refetch accounts for the new date
      refetchAccounts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId || !redemptionAmount || !redemptionDate) {
      setMessage({
        type: "error",
        text: "Please fill in all required fields",
      });
      return;
    }

    const amount = parseFloat(redemptionAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid redemption amount",
      });
      return;
    }

    // Check if redemption amount exceeds available balance
    const selectedAccount = accounts.find(
      (acc) => acc.id === selectedAccountId
    );
    if (selectedAccount && amount > selectedAccount.currentValue) {
      setMessage({
        type: "error",
        text: `Redemption amount (${formatCurrency(
          amount
        )}) exceeds available balance (${formatCurrency(
          selectedAccount.currentValue
        )})`,
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      setMessage({ type: "success", text: "Processing redemption..." });

      const result = await redeemFloatingRateAccount({
        accountId: selectedAccountId,
        redemptionAmount: amount,
        redemptionDate: redemptionDate,
        description,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message,
        });

        // Reset form
        setSelectedAccountId(null);
        setRedemptionAmount("");
        setDescription("");
        setIsFullRedemption(false);

        // Reload redemption history
        if (selectedAccountId) {
          const history = await getFloatingRateAccountRedemptions(
            selectedAccountId
          );
          setRedemptionHistory(history);
        }

        // Notify parent component
        onRedemptionComplete?.();

        // Close modal after success
        setTimeout(() => {
          setOpen(false);
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: result.message,
        });
      }
    } catch (error) {
      console.error("Redemption error:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  const defaultTrigger = (
    <Button
      variant="destructive"
      className="flex items-center gap-2 cursor-pointer"
    >
      Process Redemption
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Process Floating Rate Investment Redemption
          </DialogTitle>
          <DialogDescription>
            Redeem funds from floating rate investment accounts. All redemptions
            are recorded for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Form - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Redemption Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redemption Date *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !redemptionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {redemptionDate ? (
                        format(redemptionDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={redemptionDate}
                      onSelect={(date) => handleDateChange(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account *
                </label>
                {isAccountsLoading ? (
                  <div className="p-3 text-center text-gray-500 border rounded-md">
                    Loading available accounts...
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 border rounded-md">
                    No active floating rate accounts available for redemption on
                    this date
                  </div>
                ) : (
                  <select
                    value={selectedAccountId || ""}
                    onChange={(e) =>
                      setSelectedAccountId(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose an account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.investorEmail} - Current
                        Value: {formatCurrency(account.currentValue)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Account Details */}
              {selectedAccount && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Account Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">
                        Gross Capital:
                      </span>
                      <br />
                      <span className="text-blue-900">
                        {formatCurrency(selectedAccount.grossCapital)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">
                        Net Capital:
                      </span>
                      <br />
                      <span className="text-blue-900">
                        {formatCurrency(selectedAccount.netCapital)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">
                        Current Value:
                      </span>
                      <br />
                      <span className="text-blue-900 font-bold">
                        {formatCurrency(selectedAccount.currentValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">
                        Investor:
                      </span>
                      <br />
                      <span className="text-blue-900">
                        {selectedAccount.investorEmail}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Redemption Checkbox */}
              {selectedAccount && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fullRedemption"
                    checked={isFullRedemption}
                    onCheckedChange={(checked) =>
                      setIsFullRedemption(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="fullRedemption"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Full redemption (redeem entire balance)
                  </label>
                </div>
              )}

              {/* Redemption Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redemption Amount (IDR) *
                </label>
                <input
                  type="number"
                  value={redemptionAmount}
                  onChange={(e) => setRedemptionAmount(e.target.value)}
                  placeholder="Enter amount to redeem"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  min="1"
                  step="0.01"
                  disabled={isFullRedemption}
                />
                {selectedAccount && redemptionAmount && (
                  <div className="mt-1">
                    {(() => {
                      const amount = parseFloat(redemptionAmount || "0");
                      const exceedsBalance =
                        amount > selectedAccount.currentValue;

                      if (isFullRedemption) {
                        return (
                          <p className="text-sm text-red-600 font-medium">
                            This will completely empty the account
                          </p>
                        );
                      }

                      if (exceedsBalance) {
                        return (
                          <p className="text-sm text-red-600 font-medium">
                            ⚠️ Amount exceeds available balance of{" "}
                            {formatCurrency(selectedAccount.currentValue)}
                          </p>
                        );
                      }

                      return (
                        <p className="text-sm text-gray-600">
                          Remaining after redemption:{" "}
                          {formatCurrency(
                            selectedAccount.currentValue - amount
                          )}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note about this redemption..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={loading || !selectedAccountId}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    "Process Redemption"
                  )}
                </Button>
              </div>

              {/* Messages */}
              {message && (
                <div
                  className={`p-4 rounded-md ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          </div>

          {/* Redemption History - Right Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Redemption History
            </h3>
            {!selectedAccountId ? (
              <p className="text-gray-500 text-sm">
                Select an account to view redemption history
              </p>
            ) : redemptionHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No previous redemptions for this account
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {redemptionHistory.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="p-3 bg-gray-50 rounded-md border"
                  >
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(redemption.amount)}
                      </div>
                      <div className="text-gray-600">
                        {format(new Date(redemption.transactionDate), "PPP")}
                      </div>
                      {redemption.description && (
                        <div className="text-gray-500 mt-1">
                          {redemption.description}
                        </div>
                      )}
                      <div
                        className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                          redemption.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {redemption.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
