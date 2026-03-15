"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { updateFloatingRateAccount } from "../actions/update-floating-rate-account";

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
}

interface EditFloatingRateModalProps {
  investment: FloatingRateInvestment;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditFloatingRateModal({
  investment,
  onSuccess,
  trigger,
}: EditFloatingRateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [capital, setCapital] = useState(investment.grossCapital.toString());
  const [adminFeePercentage, setAdminFeePercentage] = useState(
    investment.grossCapital > 0
      ? ((investment.adminFee / investment.grossCapital) * 100).toString()
      : "0"
  );
  const [transactionDate, setTransactionDate] = useState<Date | undefined>(
    new Date(investment.transactionDate)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    investment.endDate ? new Date(investment.endDate) : undefined
  );
  const [status, setStatus] = useState(investment.status);

  // Reset form when investment changes or modal opens
  useEffect(() => {
    if (open) {
      setCapital(investment.grossCapital.toString());
      setAdminFeePercentage(
        investment.grossCapital > 0
          ? ((investment.adminFee / investment.grossCapital) * 100).toString()
          : "0"
      );
      setTransactionDate(new Date(investment.transactionDate));
      setEndDate(
        investment.endDate ? new Date(investment.endDate) : undefined
      );
      setStatus(investment.status);
      setError(null);
    }
  }, [open, investment]);

  const resetForm = () => {
    setCapital(investment.grossCapital.toString());
    setAdminFeePercentage(
      investment.grossCapital > 0
        ? ((investment.adminFee / investment.grossCapital) * 100).toString()
        : "0"
    );
    setTransactionDate(new Date(investment.transactionDate));
    setEndDate(
      investment.endDate ? new Date(investment.endDate) : undefined
    );
    setStatus(investment.status);
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const validateForm = (): string | null => {
    const capitalValue = parseFloat(capital) || 0;
    if (capitalValue <= 0) {
      return "Capital must be greater than 0";
    }

    const feeValue = parseFloat(adminFeePercentage) || 0;
    if (feeValue < 0 || feeValue > 100) {
      return "Admin fee percentage must be between 0 and 100";
    }

    if (!transactionDate) {
      return "Please select a transaction date";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const capitalValue = parseFloat(capital) || 0;
      const feePercentage = (parseFloat(adminFeePercentage) || 0) / 100;
      const adminFeeAmount = capitalValue * feePercentage;

      const result = await updateFloatingRateAccount({
        accountId: investment.id,
        capital: capitalValue,
        adminFee: adminFeeAmount,
        transactionDate: transactionDate!,
        endDate: endDate,
        status,
      });

      if (result.success) {
        handleClose();
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Error updating floating rate account:", err);
      setError("Failed to update floating rate account");
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex items-center space-x-1">
      <Edit className="h-3 w-3" />
      <span>Edit</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <span>Edit Floating Rate Account</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Record Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Account Number:{" "}
              <span className="font-medium">{investment.accountNumber}</span>
            </p>
          </div>

          {/* Capital */}
          <div className="space-y-2">
            <Label htmlFor="capital">Capital</Label>
            <Input
              id="capital"
              type="number"
              placeholder="Enter capital amount..."
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Gross capital amount (in IDR)
            </p>
          </div>

          {/* Admin Fee */}
          <div className="space-y-2">
            <Label htmlFor="adminFee">Admin Fee (%)</Label>
            <Input
              id="adminFee"
              type="number"
              step="0.01"
              placeholder="Enter admin fee percentage..."
              value={adminFeePercentage}
              onChange={(e) => setAdminFeePercentage(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Admin fee as percentage (e.g., 5 for 5%)
            </p>
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label>Transaction Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={setTransactionDate}
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
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "d MMMM yyyy")
                  ) : (
                    <span>Pick an end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="mature">Mature</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                "Update Account"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
