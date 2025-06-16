"use client";

import React, { useState, useEffect } from "react";
import {
  createFlatRateAccount,
  getAllInvestors,
  validateParentAccount,
} from "../actions/create-flat-rate-account";
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
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";

interface CreateFlatRateModalProps {
  onAccountCreated?: () => void;
  trigger?: React.ReactNode;
}

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

export function CreateFlatRateModal({
  onAccountCreated,
  trigger,
}: CreateFlatRateModalProps) {
  const [open, setOpen] = useState(false);
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedInvestorEmail, setSelectedInvestorEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [capital, setCapital] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isRollover, setIsRollover] = useState(false);
  const [parentAccountId, setParentAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load investors when modal opens
  useEffect(() => {
    if (open) {
      const loadInvestors = async () => {
        setLoadingInvestors(true);
        try {
          const investorList = await getAllInvestors();
          setInvestors(investorList);
        } catch (error) {
          console.error("Error loading investors:", error);
          setMessage({
            type: "error",
            text: "Failed to load investors",
          });
        } finally {
          setLoadingInvestors(false);
        }
      };

      loadInvestors();
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
      setParentAccountId("");
      setDescription("");
      setMessage(null);
    }
  }, [open]);

  // Calculate admin fee and net capital
  const calculateFinancials = () => {
    const capitalAmount = parseFloat(capital || "0");
    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      return { adminFee: 0, netCapital: 0 };
    }

    if (isRollover) {
      return { adminFee: 0, netCapital: capitalAmount };
    }

    const adminFee = capitalAmount * ADMIN_FEE_PERCENTAGE;
    const netCapital = capitalAmount - adminFee;
    return { adminFee, netCapital };
  };

  const { adminFee, netCapital } = calculateFinancials();

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

    // Validate parent account if rollover
    if (isRollover && parentAccountId) {
      try {
        const validation = await validateParentAccount(
          parseInt(parentAccountId)
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
          text: "Failed to validate parent account",
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
        parentAccountId: parentAccountId
          ? parseInt(parentAccountId)
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
        setParentAccountId("");
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
    <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
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
            Admin fees will be calculated automatically.
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
              {/* Investor Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Investor *</Label>
                <Select
                  value={selectedInvestorEmail}
                  onValueChange={setSelectedInvestorEmail}
                  required
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
                  This is a rollover investment (no additional admin fee)
                </label>
              </div>

              {/* Parent Account ID (only for rollovers) */}
              {isRollover && (
                <div className="space-y-2">
                  <Label
                    htmlFor="parentAccountId"
                    className="text-sm font-medium"
                  >
                    Parent Account ID (Optional)
                  </Label>
                  <Input
                    id="parentAccountId"
                    type="number"
                    value={parentAccountId}
                    onChange={(e) => setParentAccountId(e.target.value)}
                    placeholder="Enter parent account ID for rollover chain tracking"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the account ID of the mature/closed account this
                    rollover extends
                  </p>
                </div>
              )}

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
                />
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
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter as percentage (e.g., 17 for 17% annual rate)
                </p>
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
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? (
                        format(transactionDate, "PPP")
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
                        format(endDate, "PPP")
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

              {/* Financial Summary */}
              {capital && parseFloat(capital) > 0 && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Gross Capital:</span>
                      <p className="font-medium">
                        {formatCurrency(parseFloat(capital))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Admin Fee ({(ADMIN_FEE_PERCENTAGE * 100).toFixed(1)}%):
                      </span>
                      <p className="font-medium text-orange-600">
                        {isRollover
                          ? "Rp 0 (Rollover)"
                          : formatCurrency(adminFee)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Net Capital Working:
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
