"use client";

import React, { useState, useEffect } from "react";
import {
  createFlatRateAccount,
  validateParentAccount,
  getMaturedAccountsForRollover,
} from "../actions/create-flat-rate-account";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAllInvestors } from "@/features/investor/actions/get-all-investors";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateFlatRateModalProps {
  onAccountCreated?: () => void;
  trigger?: React.ReactNode;
}

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

interface RolloverAccountOption {
  id: number;
  accountNumber: string;
  investorEmail: string | null;
  investorName: string | null;
  originalCapital: string;
  annualRate: string;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  maturedValue: number;
  isRollover: boolean | null;
  adminFeeApplied: boolean | null;
}

export function CreateFlatRateModal({
  onAccountCreated,
  trigger,
}: CreateFlatRateModalProps) {
  const [open, setOpen] = useState(false);
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [rolloverAccounts, setRolloverAccounts] = useState<
    RolloverAccountOption[]
  >([]);
  const [selectedInvestorEmail, setSelectedInvestorEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [capital, setCapital] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isRollover, setIsRollover] = useState(false);
  const [selectedRolloverAccountId, setSelectedRolloverAccountId] =
    useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [loadingRolloverAccounts, setLoadingRolloverAccounts] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load investors and rollover accounts when modal opens
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoadingInvestors(true);
        try {
          const [investorList, rolloverAccountList] = await Promise.all([
            getAllInvestors(),
            getMaturedAccountsForRollover(),
          ]);

          setInvestors(investorList);

          if (rolloverAccountList.success && rolloverAccountList.accounts) {
            setRolloverAccounts(rolloverAccountList.accounts);
          }
        } catch (error) {
          console.error("Error loading data:", error);
          setMessage({
            type: "error",
            text: "Failed to load data",
          });
        } finally {
          setLoadingInvestors(false);
        }
      };

      loadData();
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedInvestorEmail("");
      setAccountNumber("");
      setCapital("");
      setAnnualRate("");
      setTransactionDate(new Date());
      setEndDate(undefined);
      setIsRollover(false);
      setSelectedRolloverAccountId("");
      setDescription("");
      setMessage(null);
    }
  }, [open]);

  // When a rollover account is selected, auto-populate form fields
  useEffect(() => {
    if (isRollover && selectedRolloverAccountId) {
      const selectedAccount = rolloverAccounts.find(
        (acc) => acc.id.toString() === selectedRolloverAccountId
      );

      if (selectedAccount) {
        // Set the investor to the selected account's investor
        setSelectedInvestorEmail(selectedAccount.investorEmail || "");

        // Set capital to the matured value
        setCapital(selectedAccount.maturedValue.toString());

        // Set annual rate to the same rate
        setAnnualRate(
          (parseFloat(selectedAccount.annualRate) * 100).toString()
        );

        // Set transaction date to the maturity date of the parent account
        if (selectedAccount.endDate) {
          setTransactionDate(new Date(selectedAccount.endDate));
        }
      }
    }
  }, [isRollover, selectedRolloverAccountId, rolloverAccounts]);

  // Flat rate investments have no admin fee
  const calculateFinancials = () => {
    const capitalAmount = parseFloat(capital || "0");
    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      return { netCapital: 0 };
    }
    return { netCapital: capitalAmount };
  };

  const { netCapital } = calculateFinancials();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedInvestorEmail ||
      !accountNumber ||
      !capital ||
      !annualRate ||
      !transactionDate ||
      !endDate
    ) {
      setMessage({
        type: "error",
        text: "Please fill in all required fields",
      });
      return;
    }

    const capitalAmount = parseFloat(capital);
    const rateDecimal = parseFloat(annualRate) / 100; // Convert percentage to decimal

    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid capital amount",
      });
      return;
    }

    if (isNaN(rateDecimal) || rateDecimal <= 0 || rateDecimal > 1) {
      setMessage({
        type: "error",
        text: "Please enter a valid annual rate (1-100%)",
      });
      return;
    }

    if (transactionDate >= endDate) {
      setMessage({
        type: "error",
        text: "End date must be after transaction date",
      });
      return;
    }

    // Validate rollover account if specified
    if (isRollover && selectedRolloverAccountId) {
      try {
        const validation = await validateParentAccount(
          parseInt(selectedRolloverAccountId)
        );
        if (!validation.valid) {
          setMessage({
            type: "error",
            text: validation.message,
          });
          return;
        }
      } catch (error) {
        setMessage({
          type: "error",
          text: "Failed to validate rollover account",
        });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await createFlatRateAccount({
        investorEmail: selectedInvestorEmail,
        accountNumber: accountNumber.trim(),
        capital: capitalAmount,
        annualRate: rateDecimal,
        transactionDate,
        endDate,
        isRollover,
        parentAccountId: selectedRolloverAccountId
          ? parseInt(selectedRolloverAccountId)
          : undefined,
        description,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message,
        });

        // Reset form
        setSelectedInvestorEmail("");
        setAccountNumber("");
        setCapital("");
        setAnnualRate("");
        setTransactionDate(new Date());
        setEndDate(undefined);
        setIsRollover(false);
        setSelectedRolloverAccountId("");
        setDescription("");

        // Notify parent component
        onAccountCreated?.();

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
      console.error("Create account error:", error);
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

  const defaultTrigger = (
    <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 hover:cursor-pointer">
      <PlusIcon className="w-4 h-4" />
      Create New Investment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Create New Flat-Rate Investment
          </DialogTitle>
          <DialogDescription>
            Create a new fixed annual rate investment account for an investor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Message */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Administrative Operation
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This creates a new investment account and affects the
                    investor's portfolio. Ensure all details are accurate.
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

          {loadingInvestors ? (
            <div className="p-6 bg-gray-50 rounded-md">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="h-10 bg-gray-300 rounded mb-4"></div>
                <div className="h-10 bg-gray-300 rounded mb-4"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Investment Type Toggle */}
              <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                <Checkbox
                  id="isRollover"
                  checked={isRollover}
                  onCheckedChange={(checked) => setIsRollover(checked === true)}
                />
                <label
                  htmlFor="isRollover"
                  className="text-sm font-medium text-yellow-900 cursor-pointer"
                >
                  This is a rollover investment (extend a matured account)
                </label>
              </div>

              {/* Rollover Account Selection (only for rollovers) */}
              {isRollover && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Select Matured Account to Rollover *
                  </Label>
                  <Select
                    value={selectedRolloverAccountId}
                    onValueChange={setSelectedRolloverAccountId}
                    required={isRollover}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a matured account to rollover..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rolloverAccounts.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id.toString()}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {account.accountNumber} - Original:{" "}
                              {formatCurrency(
                                parseFloat(account.originalCapital)
                              )}
                            </span>
                            <span className="text-sm text-green-600 font-medium">
                              Matured Value:{" "}
                              {formatCurrency(account.maturedValue)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {account.investorEmail} | Status: {account.status}
                              {account.endDate &&
                                ` | Ended: ${format(
                                  new Date(account.endDate),
                                  "d MMMM yyyy"
                                )}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select the matured account to extend. The investor, capital
                    amount, and start date will be auto-filled.
                  </p>
                  {rolloverAccounts.length === 0 && (
                    <p className="text-sm text-orange-600">
                      No matured accounts found. Only accounts with "mature"
                      status can be rolled over.
                    </p>
                  )}
                </div>
              )}

              {/* Investor Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Investor *</Label>
                <Select
                  value={selectedInvestorEmail}
                  onValueChange={setSelectedInvestorEmail}
                  required
                  disabled={isRollover && selectedRolloverAccountId !== ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an investor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {investors.map((investor) => (
                      <SelectItem key={investor.id} value={investor.email}>
                        {investor.email}
                        {investor.fullName && ` - ${investor.fullName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isRollover && selectedRolloverAccountId && (
                  <p className="text-sm text-blue-600">
                    ✓ Auto-selected from rollover account
                  </p>
                )}
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="text-sm font-medium">
                  Account Number *
                </Label>
                <Input
                  id="accountNumber"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter unique account number (e.g., FR-2024-001)"
                  required
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Account number must be unique across all accounts
                </p>
              </div>

              {/* Capital Amount */}
              <div className="space-y-2">
                <Label htmlFor="capital" className="text-sm font-medium">
                  Capital Amount (IDR) *
                </Label>
                <Input
                  id="capital"
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="Enter investment amount"
                  required
                  min="1"
                  step="1"
                  disabled={isRollover && selectedRolloverAccountId !== ""}
                />
                {isRollover && selectedRolloverAccountId && (
                  <p className="text-sm text-blue-600">
                    ✓ Auto-filled with matured value from rollover account
                  </p>
                )}
              </div>

              {/* Annual Rate */}
              <div className="space-y-2">
                <Label htmlFor="annualRate" className="text-sm font-medium">
                  Annual Rate (%) *
                </Label>
                <Input
                  id="annualRate"
                  type="number"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  placeholder="Enter annual rate (e.g., 17 for 17%)"
                  required
                  min="1"
                  max="100"
                  step="1"
                />
                {isRollover && selectedRolloverAccountId ? (
                  <p className="text-sm text-blue-600">
                    ✓ Auto-filled from rollover account (can be modified)
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter as percentage (e.g., 17 for 17% annual rate)
                  </p>
                )}
              </div>

              {/* Transaction Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Transaction Date (Start Date) *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full p-3 justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                      disabled={isRollover && selectedRolloverAccountId !== ""}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? (
                        format(transactionDate, "d MMMM yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => {
                        if (date) {
                          setTransactionDate(date);
                        }
                      }}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                    />
                  </PopoverContent>
                </Popover>
                {isRollover && selectedRolloverAccountId && (
                  <p className="text-sm text-blue-600">
                    ✓ Auto-set to maturity date of rollover account
                  </p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  End Date (Maturity Date) *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full p-3 justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "d MMMM yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => setEndDate(date)}
                      disabled={(date) =>
                        transactionDate ? date <= transactionDate : false
                      }
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note about this investment..."
                  rows={3}
                />
              </div>

              {/* Rollover Summary */}
              {isRollover && selectedRolloverAccountId && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-3">
                    Rollover Details
                  </h3>
                  {(() => {
                    const selectedAccount = rolloverAccounts.find(
                      (acc) => acc.id.toString() === selectedRolloverAccountId
                    );
                    if (!selectedAccount) return null;

                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">
                            Original Account:
                          </span>
                          <span className="font-medium">
                            {selectedAccount.accountNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">
                            Original Capital:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              parseFloat(selectedAccount.originalCapital)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Growth Period:</span>
                          <span className="font-medium">
                            {format(
                              selectedAccount.transactionDate,
                              "d MMMM yyyy"
                            )}{" "}
                            →{" "}
                            {selectedAccount.endDate
                              ? format(
                                  new Date(selectedAccount.endDate),
                                  "d MMMM yyyy"
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-blue-300 pt-2">
                          <span className="text-blue-700 font-medium">
                            Rolling Over:
                          </span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(selectedAccount.maturedValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Financial Summary */}
              {capital && parseFloat(capital) > 0 && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {isRollover ? "New Investment Period" : "Financial Summary"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">
                        {isRollover ? "Rollover Capital:" : "Investment Capital:"}
                      </span>
                      <p className="font-medium">
                        {formatCurrency(parseFloat(capital))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Capital Working:
                      </span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(netCapital)}
                      </p>
                    </div>
                  </div>
                  {annualRate && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-gray-600">Annual Rate:</span>
                      <p className="font-medium">
                        {parseFloat(annualRate).toFixed(2)}% per year
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Investment"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
