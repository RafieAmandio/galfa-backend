"use client";

import React, { useState, useEffect } from "react";
import {
  redeemFlatRateAccount,
  getAccountRedemptions,
} from "../actions/redemption-flat-rate-account";
import { getAccountsForRedemptionWithBalance } from "../actions/get-accounts-for-redemption-with-balance";
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
import { EditRedemptionInline } from "@/features/mutations/components/edit-redemption-inline";

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
}

interface RedemptionHistory {
  id: number;
  amount: number;
  description: string | null;
  status: string;
  transactionDate: Date;
  createdAt: Date;
}

export function RedeemFlatRateModal({
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
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [redemptionHistory, setRedemptionHistory] = useState<
    RedemptionHistory[]
  >([]);

  // Load available accounts when modal opens or redemption date changes
  useEffect(() => {
    if (open && redemptionDate) {
      const loadAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const filteredAccounts = await getAccountsForRedemptionWithBalance(
            redemptionDate
          );
          const accountOptions = filteredAccounts.map((account) => ({
            id: account.id,
            name: account.accountNumber,
            grossCapital: account.grossCapital,
            netCapital: account.netCapital,
            currentValue: account.currentValue,
          }));
          setAccounts(accountOptions);
        } catch (error) {
          console.error("Error loading accounts:", error);
          setMessage({
            type: "error",
            text: "Failed to load accounts",
          });
        } finally {
          setLoadingAccounts(false);
        }
      };

      loadAccounts();
    }
  }, [open, redemptionDate]); // Added redemptionDate as dependency

  // Load redemption history for selected account
  useEffect(() => {
    const loadRedemptionHistory = async () => {
      if (selectedAccountId && open) {
        try {
          const history = await getAccountRedemptions(selectedAccountId);
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
      const result = await redeemFlatRateAccount({
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
          const history = await getAccountRedemptions(selectedAccountId);
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
            Process Investment Redemption
          </DialogTitle>
          <DialogDescription>
            Redeem funds from flat-rate investment accounts. All redemptions are
            recorded for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Message */}
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-orange-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">
                  Administrative Operation
                </h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>
                    This operation affects investor portfolios. Please ensure
                    all details are accurate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {!redemptionDate ? (
            <div className="p-6 bg-blue-50 rounded-md text-center">
              <CalendarIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Select Redemption Date First
              </h3>
              <p className="text-blue-700">
                Please select a redemption date to see account values calculated
                for that specific date.
              </p>
            </div>
          ) : loadingAccounts ? (
            <div className="p-6 bg-gray-50 rounded-md">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="h-10 bg-gray-300 rounded mb-4"></div>
                <div className="h-10 bg-gray-300 rounded mb-4"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Redemption Date - Now First */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redemption Date *
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select the date for redemption. Account values will be
                  calculated based on this date.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full p-3 justify-start text-left font-normal",
                        !redemptionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {redemptionDate ? (
                        format(redemptionDate, "d MMMM yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={redemptionDate}
                      onSelect={(date) => {
                        if (date) {
                          setRedemptionDate(date);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account *
                </label>
                <select
                  value={selectedAccountId || ""}
                  onChange={(e) =>
                    setSelectedAccountId(Number(e.target.value) || null)
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {`${account.name} - Value on ${format(
                        redemptionDate,
                        "d MMMM yyyy"
                      )}: ${formatCurrency(account.currentValue)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Details */}
              {selectedAccount && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Account Details (as of{" "}
                    {format(redemptionDate, "d MMMM yyyy")})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Gross Capital:</span>
                      <p className="font-medium">
                        {formatCurrency(selectedAccount.grossCapital)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Net Capital:</span>
                      <p className="font-medium">
                        {formatCurrency(selectedAccount.netCapital)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Value on Selected Date:
                      </span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedAccount.currentValue)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Redemption Toggle */}
              {selectedAccount && (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <Checkbox
                    id="fullRedemption"
                    checked={isFullRedemption}
                    onCheckedChange={(checked) =>
                      setIsFullRedemption(checked === true)
                    }
                  />
                  <label
                    htmlFor="fullRedemption"
                    className="text-sm font-medium text-blue-900 cursor-pointer"
                  >
                    Redeem total amount and empty the account
                  </label>
                  {isFullRedemption && (
                    <span className="text-sm text-blue-700 font-medium">
                      ({formatCurrency(selectedAccount.currentValue)})
                    </span>
                  )}
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
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={loading}>
                  {loading ? "Processing..." : "Process Redemption"}
                </Button>
              </div>
            </form>
          )}

          {/* Redemption History */}
          {selectedAccountId && redemptionHistory.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Redemption History
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {redemptionHistory.map((redemption) => (
                      <tr key={redemption.id}>
                        <EditRedemptionInline
                          redemption={redemption}
                          onUpdate={async () => {
                            if (selectedAccountId) {
                              const history = await getAccountRedemptions(selectedAccountId);
                              setRedemptionHistory(history);
                            }
                          }}
                          formatCurrency={formatCurrency}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
