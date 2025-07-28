"use client";

import React, { useState, useEffect } from "react";
import { createFloatingRateAccount } from "../actions/create-floating-rate-account";
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
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";

interface CreateFloatingRateModalProps {
  onAccountCreated?: () => void;
  trigger?: React.ReactNode;
  investorEmails?: InvestorOption[] | null;
}

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

export function CreateFloatingRateModal({
  onAccountCreated,
  trigger,
  investorEmails,
}: CreateFloatingRateModalProps) {
  const [open, setOpen] = useState(false);
  const investors = investorEmails || [];
  const [selectedInvestorEmail, setSelectedInvestorEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [capital, setCapital] = useState("");
  const [adminFeePercentage, setAdminFeePercentage] = useState("5"); // Default to 5%
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingInvestors = false; // Investors come from props
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Investors now come from server-side props - no need to fetch

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedInvestorEmail("");
      setAccountNumber("");
      setCapital("");
      setAdminFeePercentage("5");
      setTransactionDate(new Date());
      setEndDate(undefined);
      setDescription("");
      setMessage(null);
    }
  }, [open]);

  // Calculate admin fee and net capital
  const calculateFinancials = () => {
    const capitalAmount = parseFloat(capital || "0");
    const adminFeePercent = parseFloat(adminFeePercentage || "0") / 100;

    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      return { adminFee: 0, netCapital: 0 };
    }

    if (isNaN(adminFeePercent) || adminFeePercent < 0) {
      return { adminFee: 0, netCapital: capitalAmount };
    }

    const adminFee = capitalAmount * adminFeePercent;
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
      !adminFeePercentage ||
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
    const adminFeePercent = parseFloat(adminFeePercentage);

    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid capital amount",
      });
      return;
    }

    if (
      isNaN(adminFeePercent) ||
      adminFeePercent < 0 ||
      adminFeePercent > 100
    ) {
      setMessage({
        type: "error",
        text: "Please enter a valid admin fee percentage (0-100%)",
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

    setLoading(true);
    setMessage(null);

    try {
      const result = await createFloatingRateAccount({
        investorEmail: selectedInvestorEmail,
        accountNumber: accountNumber.trim(),
        capital: capitalAmount,
        adminFeePercentage: adminFeePercent / 100, // Convert to decimal
        transactionDate,
        endDate,
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
        setAdminFeePercentage("5");
        setTransactionDate(new Date());
        setEndDate(undefined);
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
    <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
      <PlusIcon className="w-4 h-4" />
      Create New Floating Rate Investment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Floating Rate Investment</DialogTitle>
          <DialogDescription>
            Add a new floating rate investment account. You can specify a custom
            admin fee percentage for this investment.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingInvestors ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Loading investors...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Investor Selection */}
              <div className="space-y-2">
                <Label htmlFor="investor" className="text-sm font-medium">
                  Select Investor *
                </Label>
                <Select
                  value={selectedInvestorEmail}
                  onValueChange={setSelectedInvestorEmail}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an investor" />
                  </SelectTrigger>
                  <SelectContent>
                    {investors.map((investor) => (
                      <SelectItem key={investor.id} value={investor.email}>
                        {investor.email}
                        {investor.fullName && (
                          <span className="text-muted-foreground ml-2">
                            ({investor.fullName})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the investor for this floating rate account
                </p>
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
                  placeholder="Enter unique account number"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Must be unique across all account types
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
                  placeholder="Enter investment capital"
                  required
                  min="1"
                  step="1"
                />
                <p className="text-sm text-muted-foreground">
                  Total investment amount
                </p>
              </div>

              {/* Admin Fee Percentage */}
              <div className="space-y-2">
                <Label
                  htmlFor="adminFeePercentage"
                  className="text-sm font-medium"
                >
                  Admin Fee Percentage (%) *
                </Label>
                <Input
                  id="adminFeePercentage"
                  type="number"
                  value={adminFeePercentage}
                  onChange={(e) => setAdminFeePercentage(e.target.value)}
                  placeholder="Enter admin fee percentage"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-sm text-muted-foreground">
                  Admin fee as percentage (e.g., 5 for 5%)
                </p>
              </div>

              {/* Transaction Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Transaction Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? (
                        format(transactionDate, "d MMMM yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => date && setTransactionDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Date when the investment begins
                </p>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "d MMMM yyyy")
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => date <= transactionDate}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Investment maturity date (must be after transaction date)
                </p>
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
                  placeholder="Additional notes or description for this investment"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Optional notes about the investment
                </p>
              </div>

              {/* Financial Summary */}
              {parseFloat(capital || "0") > 0 && (
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-3">
                    Financial Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Gross Capital:</span>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(capital || "0"))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Admin Fee (
                        {parseFloat(adminFeePercentage || "0").toFixed(1)}%):
                      </span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(adminFee)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-2">
                      <span className="text-slate-600 font-medium">
                        Net Capital:
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(netCapital)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Returns will be calculated based on performance and applied
                    to the net capital
                  </p>
                </div>
              )}

              {/* Error/Success Messages */}
              {message && (
                <div
                  className={`p-3 rounded-md ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Form Actions */}
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
                  className="bg-blue-600 hover:bg-blue-700"
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
