"use client";

import { useState, useEffect, FormEvent } from "react";
import { useActionState, startTransition } from "react";
import { useEffectEvent } from "@/lib/hooks/useEffectEvent";
import { useQueryClient } from "@tanstack/react-query";
import { createCapitalMarketPerformance } from "../actions/create-capital-market-performance";
import { SubmitButton } from "@/components/buttons/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "date-fns";

// Error display component
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 mt-1">{error}</p>;
}

export function CreateCapitalMarketPerformanceModal({
  userId,
}: {
  userId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [actionState, actionDispatch, isActionPending] = useActionState(
    createCapitalMarketPerformance,
    undefined
  );

  // Get current month and year for default value
  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    performanceMonthYear: getCurrentMonthYear(), // Month-year format (YYYY-MM)
    totalInvested: "",
    grossPerformance: "",
    netPerformance: "",
  });

  // State for the calendar popover
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Generate years (current year - 5 to current year + 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Generate months
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Handle month selection
  const handleMonthSelect = (monthValue: string) => {
    const [year] = formData.performanceMonthYear.split("-");
    const newMonthYear = `${year}-${monthValue}`;
    setFormData((prev) => ({ ...prev, performanceMonthYear: newMonthYear }));
  };

  // Handle year selection
  const handleYearSelect = (yearValue: string) => {
    const [, month] = formData.performanceMonthYear.split("-");
    const newMonthYear = `${yearValue}-${month}`;
    setFormData((prev) => ({ ...prev, performanceMonthYear: newMonthYear }));
  };

  // Reset form when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form state when closing
      setFormData({
        performanceMonthYear: getCurrentMonthYear(),
        totalInvested: "",
        grossPerformance: "",
        netPerformance: "",
      });
      setCalendarDate(new Date());
    }
  };

  // Get field-specific errors
  const getFieldError = (fieldName: string) => {
    return actionState?.errors?.find((error: any) => error.field === fieldName)
      ?.message;
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const formDataObj = new FormData();
      formDataObj.append("userId", userId);
      formDataObj.append("performanceMonthYear", formData.performanceMonthYear);
      formDataObj.append("totalInvested", formData.totalInvested);
      formDataObj.append("grossPerformance", formData.grossPerformance);
      formDataObj.append("netPerformance", formData.netPerformance);

      actionDispatch(formDataObj);
    });
  };

  // Handle action state changes
  const actionEffectEvent = useEffectEvent((state: typeof actionState) => {
    if (state) {
      if (state.success && state.message) {
        // Invalidate and refetch the performance data
        queryClient.invalidateQueries({
          queryKey: ["capital-market-performance", userId],
        });

        // Reset form state on success
        setFormData({
          performanceMonthYear: getCurrentMonthYear(),
          totalInvested: "",
          grossPerformance: "",
          netPerformance: "",
        });
        setCalendarDate(new Date());

        // Close modal after success
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } else if (state.errors && state.errors.length > 0) {
        // Scroll to first error
        setTimeout(() => {
          const firstError = state.errors[0];
          const errorField = document.getElementById(firstError.field);

          if (errorField) {
            errorField.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            errorField.focus();
          }
        }, 100);
      }
    }
  });

  useEffect(
    () => actionEffectEvent(actionState),
    [actionState, actionEffectEvent]
  );

  // Format the selected month-year for display
  const formatSelectedMonthYear = () => {
    const [year, month] = formData.performanceMonthYear.split("-");
    const monthLabel = months.find((m) => m.value === month)?.label;
    return `${monthLabel} ${year}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add Performance Record
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] flex flex-col max-w-md">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Performance Record</DialogTitle>
        </DialogHeader>

        {/* Success/Error Messages */}
        <div className="px-2">
          {actionState?.message && (
            <div
              className={cn(
                "p-3 rounded-md text-sm flex-shrink-0",
                actionState.success
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-green-200"
              )}
            >
              {actionState.message}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto px-2 flex-1"
        >
          {/* Performance Month-Year */}
          <div className="space-y-2">
            <Label
              htmlFor="performanceMonthYear"
              className="text-sm font-medium"
            >
              Performance Month & Year *
            </Label>

            <div className="flex gap-2">
              {/* Month Select */}
              <Select
                value={formData.performanceMonthYear.split("-")[1]}
                onValueChange={handleMonthSelect}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Select */}
              <Select
                value={formData.performanceMonthYear.split("-")[0]}
                onValueChange={handleYearSelect}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display selected month-year */}
            <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded border">
              Selected:{" "}
              <span className="font-medium">{formatSelectedMonthYear()}</span>
            </div>

            <FieldError error={getFieldError("performanceMonthYear")} />
            <p className="text-xs text-gray-500">
              Only one performance record is allowed per month. The record will
              be created for the 15th of the selected month.
            </p>
          </div>

          {/* Total Invested */}
          <div className="space-y-2">
            <Label htmlFor="totalInvested" className="text-sm font-medium">
              Total Invested (IDR) *
            </Label>
            <Input
              id="totalInvested"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.totalInvested}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  totalInvested: e.target.value,
                }))
              }
              required
            />
            <FieldError error={getFieldError("totalInvested")} />
          </div>

          {/* Gross Performance */}
          <div className="space-y-2">
            <Label htmlFor="grossPerformance" className="text-sm font-medium">
              Gross Performance (IDR) *
            </Label>
            <Input
              id="grossPerformance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.grossPerformance}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  grossPerformance: e.target.value,
                }))
              }
              required
            />
            <FieldError error={getFieldError("grossPerformance")} />
          </div>

          {/* Net Performance */}
          <div className="space-y-2">
            <Label htmlFor="netPerformance" className="text-sm font-medium">
              Net Performance (IDR) *
            </Label>
            <Input
              id="netPerformance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.netPerformance}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  netPerformance: e.target.value,
                }))
              }
              required
            />
            <FieldError error={getFieldError("netPerformance")} />
          </div>

          {/* Submit Button */}
          <SubmitButton fullWidth loading={isActionPending}>
            Create Performance Record
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
