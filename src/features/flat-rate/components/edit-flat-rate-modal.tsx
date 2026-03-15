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
import { updateFlatRateAccount } from "../actions/update-flat-rate-account";

interface FlatRateInvestment {
  id: number;
  name: string;
  grossCapital: number;
  rate: number;
  transDate: Date;
  endDate: Date;
  status: string;
}

interface EditFlatRateModalProps {
  investment: FlatRateInvestment;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditFlatRateModal({
  investment,
  onSuccess,
  trigger,
}: EditFlatRateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [capital, setCapital] = useState(investment.grossCapital.toString());
  const [annualRate, setAnnualRate] = useState(investment.rate.toString());
  const [transactionDate, setTransactionDate] = useState<Date | undefined>(
    new Date(investment.transDate)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(investment.endDate)
  );
  const [status, setStatus] = useState(investment.status);

  // Reset form when investment changes or modal opens
  useEffect(() => {
    if (open) {
      setCapital(investment.grossCapital.toString());
      setAnnualRate(investment.rate.toString());
      setTransactionDate(new Date(investment.transDate));
      setEndDate(new Date(investment.endDate));
      setStatus(investment.status);
      setError(null);
    }
  }, [open, investment]);

  const resetForm = () => {
    setCapital(investment.grossCapital.toString());
    setAnnualRate(investment.rate.toString());
    setTransactionDate(new Date(investment.transDate));
    setEndDate(new Date(investment.endDate));
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

    const rateValue = parseFloat(annualRate) || 0;
    if (rateValue <= 0) {
      return "Annual rate must be greater than 0";
    }

    if (!transactionDate) {
      return "Please select a transaction date";
    }

    if (!endDate) {
      return "Please select an end date";
    }

    if (endDate <= transactionDate) {
      return "End date must be after transaction date";
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
      const result = await updateFlatRateAccount({
        accountId: investment.id,
        capital: parseFloat(capital),
        annualRate: parseFloat(annualRate),
        transactionDate: transactionDate!,
        endDate: endDate!,
        status,
      });

      if (result.success) {
        handleClose();
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Error updating flat rate account:", err);
      setError("Failed to update flat rate account");
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
            <span>Edit Flat Rate Investment</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Record Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Editing account:{" "}
              <span className="font-medium">{investment.name}</span>
            </p>
          </div>

          {/* Capital */}
          <div className="space-y-2">
            <Label htmlFor="capital">Capital (IDR)</Label>
            <Input
              id="capital"
              type="number"
              placeholder="Enter capital amount..."
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Investment capital amount in IDR
            </p>
          </div>

          {/* Annual Rate */}
          <div className="space-y-2">
            <Label htmlFor="annualRate">Annual Rate (%)</Label>
            <Input
              id="annualRate"
              type="number"
              step="0.01"
              placeholder="Enter annual rate..."
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Annual interest rate as a percentage
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
