"use client";

import React, { useState } from "react";
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
import { CalendarIcon, Plus, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createVCPerformance } from "../actions/create-vc-performance";

interface CreateVCPerformanceModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateVCPerformanceModal({
  onSuccess,
  trigger,
}: CreateVCPerformanceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [aum, setAum] = useState("");
  const [profitTaken, setProfitTaken] = useState("");

  const resetForm = () => {
    setSelectedDate(new Date());
    setAum("");
    setProfitTaken("");
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleAumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAum(e.target.value);
  };

  const handleProfitTakenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfitTaken(e.target.value);
  };

  const validateForm = (): string | null => {
    if (!selectedDate) {
      return "Please select a date";
    }

    const aumValue = parseFloat(aum) || 0;
    const profitValue = parseFloat(profitTaken) || 0;

    if (aumValue <= 0) {
      return "Assets Under Management must be greater than 0";
    }

    if (profitValue < 0) {
      return "Profit Taken cannot be negative";
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
      const result = await createVCPerformance({
        date: selectedDate!,
        aum: parseFloat(aum) || 0,
        profitTaken: parseFloat(profitTaken) || 0,
      });

      if (result.success) {
        handleClose();
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Error creating VC performance record:", err);
      setError("Failed to create VC performance record");
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button className="flex items-center space-x-2">
      <Plus className="h-4 w-4" />
      <span>Add VC Performance</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Create VC Performance Record</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Performance Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "MMMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500">
              Select the date for this performance record
            </p>
          </div>

          {/* Assets Under Management */}
          <div className="space-y-2">
            <Label htmlFor="aum" className="flex items-center space-x-1">
              <DollarSign className="h-4 w-4" />
              <span>Assets Under Management (AUM)</span>
            </Label>
            <Input
              id="aum"
              type="number"
              placeholder="Enter AUM amount..."
              value={aum}
              onChange={handleAumChange}
            />
            <p className="text-xs text-gray-500">
              Total assets being managed (in IDR)
            </p>
          </div>

          {/* Profit Taken */}
          <div className="space-y-2">
            <Label
              htmlFor="profitTaken"
              className="flex items-center space-x-1"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Profit Taken</span>
            </Label>
            <Input
              id="profitTaken"
              type="number"
              placeholder="Enter profit taken amount..."
              value={profitTaken}
              onChange={handleProfitTakenChange}
            />
            <p className="text-xs text-gray-500">
              Total profit realized (in IDR)
            </p>
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
                  <span>Creating...</span>
                </div>
              ) : (
                "Create Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
