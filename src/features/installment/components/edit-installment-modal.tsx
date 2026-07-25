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
import { updateInstallmentAccount } from "../actions/update-installment-account";

interface EditInstallmentModalProps {
  investment: {
    id: number;
    accountNumber: string;
    netCapital: number;
    monthlyCof: number;
    investmentType: string;
    transactionDate: Date;
    endDate: Date | null;
    status: string;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditInstallmentModal({
  investment,
  onSuccess,
  trigger,
}: EditInstallmentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [capital, setCapital] = useState(investment.netCapital.toString());
  const [monthlyCof, setMonthlyCof] = useState(investment.monthlyCof.toString());
  const [investmentType, setInvestmentType] = useState(investment.investmentType);
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
      setCapital(investment.netCapital.toString());
      setMonthlyCof(investment.monthlyCof.toString());
      setInvestmentType(investment.investmentType);
      setTransactionDate(new Date(investment.transactionDate));
      setEndDate(investment.endDate ? new Date(investment.endDate) : undefined);
      setStatus(investment.status);
      setError(null);
    }
  }, [open, investment]);

  const resetForm = () => {
    setCapital(investment.netCapital.toString());
    setMonthlyCof(investment.monthlyCof.toString());
    setInvestmentType(investment.investmentType);
    setTransactionDate(new Date(investment.transactionDate));
    setEndDate(investment.endDate ? new Date(investment.endDate) : undefined);
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

    const cofValue = parseFloat(monthlyCof) || 0;
    if (cofValue <= 0) {
      return "Monthly CoF must be greater than 0";
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
      const result = await updateInstallmentAccount({
        accountId: investment.id,
        capital: parseFloat(capital) || 0,
        monthlyCof: parseFloat(monthlyCof) || 0,
        investmentType,
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
      console.error("Error updating installment account:", err);
      setError("Failed to update installment account");
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
            <span>Edit Installment Account</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Account:{" "}
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
              Investment capital amount (in IDR)
            </p>
          </div>

          {/* Monthly CoF */}
          <div className="space-y-2">
            <Label htmlFor="monthlyCof">Monthly CoF</Label>
            <Input
              id="monthlyCof"
              type="number"
              step="0.0001"
              placeholder="Enter monthly CoF..."
              value={monthlyCof}
              onChange={(e) => setMonthlyCof(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Monthly cost of fund rate (e.g., 0.01 for 1%)
            </p>
          </div>

          {/* Investment Type */}
          <div className="space-y-2">
            <Label htmlFor="investmentType">Investment Type</Label>
            <Select value={investmentType} onValueChange={setInvestmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principle">Principle + Interest</SelectItem>
                <SelectItem value="interest_only">Interest Only</SelectItem>
                <SelectItem value="bullet">Bullet</SelectItem>
                <SelectItem value="declining">Co. Menurun</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label htmlFor="transactionDate">Transaction Date</Label>
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
            <Label htmlFor="endDate">End Date</Label>
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
                    <span>Pick a date</span>
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
            <Label htmlFor="status">Status</Label>
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
