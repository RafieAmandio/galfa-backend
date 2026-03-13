"use client";

import { useState, useEffect } from "react";
import { Column, Row } from "@tanstack/react-table";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/useDebounce";

// Custom filter function for number ranges
export const numberRangeFilter = <TData,>(
  row: Row<TData>,
  columnId: string,
  value: [number?, number?]
) => {
  const [min, max] = value;
  const cellValue = row.getValue(columnId) as number;

  if (min !== undefined && max !== undefined) {
    return cellValue >= min && cellValue <= max;
  }
  if (min !== undefined) {
    return cellValue >= min;
  }
  if (max !== undefined) {
    return cellValue <= max;
  }
  return true;
};

// Custom filter function for date ranges
export const dateRangeFilter = <TData,>(
  row: Row<TData>,
  columnId: string,
  value: [string?, string?]
) => {
  const [from, to] = value;
  const cellValue = new Date(row.getValue(columnId) as Date);

  if (from && to) {
    return cellValue >= new Date(from) && cellValue <= new Date(to);
  }
  if (from) {
    return cellValue >= new Date(from);
  }
  if (to) {
    return cellValue <= new Date(to);
  }
  return true;
};

interface FilterProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any, unknown>;
  label?: string;
}

export function TextFilter({ column, label }: FilterProps) {
  const currentValue = (column.getFilterValue() as string) ?? "";
  const [localValue, setLocalValue] = useState(currentValue);
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    column.setFilterValue(debouncedValue || undefined);
  }, [debouncedValue, column]);

  // Sync external clear (e.g. "Reset All Filters")
  useEffect(() => {
    if (!currentValue) setLocalValue("");
  }, [currentValue]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ml-1 ${
            column.getFilterValue()
              ? "text-blue-600"
              : "text-muted-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="space-y-2">
          <Label>Filter {label ?? column.id}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search..."
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
            />
            {localValue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalValue("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NumberRangeFilter({ column, label }: FilterProps) {
  const currentValue = column.getFilterValue() as
    | [number?, number?]
    | undefined;
  const [localMin, setLocalMin] = useState<string>(
    currentValue?.[0]?.toString() ?? ""
  );
  const [localMax, setLocalMax] = useState<string>(
    currentValue?.[1]?.toString() ?? ""
  );
  const debouncedMin = useDebounce(localMin, 300);
  const debouncedMax = useDebounce(localMax, 300);

  useEffect(() => {
    const min = debouncedMin ? parseFloat(debouncedMin) : undefined;
    const max = debouncedMax ? parseFloat(debouncedMax) : undefined;
    if (min === undefined && max === undefined) {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue([min, max]);
    }
  }, [debouncedMin, debouncedMax, column]);

  // Sync external clear
  useEffect(() => {
    if (!currentValue) {
      setLocalMin("");
      setLocalMax("");
    }
  }, [currentValue]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ml-1 ${
            currentValue ? "text-blue-600" : "text-muted-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <Label>Filter {label ?? column.id} Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Min"
              type="number"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
            />
            <Input
              placeholder="Max"
              type="number"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
            />
          </div>
          {currentValue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalMin("");
                setLocalMax("");
              }}
              className="w-full"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filter
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DateRangeFilter({ column, label }: FilterProps) {
  const currentValue = column.getFilterValue() as
    | [string?, string?]
    | undefined;
  const [localFrom, setLocalFrom] = useState(currentValue?.[0] ?? "");
  const [localTo, setLocalTo] = useState(currentValue?.[1] ?? "");
  const debouncedFrom = useDebounce(localFrom, 300);
  const debouncedTo = useDebounce(localTo, 300);

  useEffect(() => {
    const from = debouncedFrom || undefined;
    const to = debouncedTo || undefined;
    if (!from && !to) {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue([from, to]);
    }
  }, [debouncedFrom, debouncedTo, column]);

  // Sync external clear
  useEffect(() => {
    if (!currentValue) {
      setLocalFrom("");
      setLocalTo("");
    }
  }, [currentValue]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ml-1 ${
            currentValue ? "text-blue-600" : "text-muted-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <Label>Filter {label ?? column.id} Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="From"
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
            />
            <Input
              placeholder="To"
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
            />
          </div>
          {currentValue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalFrom("");
                setLocalTo("");
              }}
              className="w-full"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filter
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
