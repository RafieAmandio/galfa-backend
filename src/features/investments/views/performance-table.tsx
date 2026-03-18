"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllVCPerformance } from "../actions/get-all-vc-performance";
import { CreateVCPerformanceModal } from "../components/create-vc-performance-modal";
import { EditVCPerformanceModal } from "../components/edit-vc-performance-modal";
import { format } from "date-fns";
import {
  TrendingUp,
  Calendar,
  RefreshCw,
  DollarSign,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface PerformanceRecord {
  id: number;
  date: Date;
  aum: number;
  ihsgValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function PerformanceTable() {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchData = useCallback(async () => {
    if (!isInitialLoad) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await getAllVCPerformance({ page, pageSize });

      if (result.success && result.data) {
        setRecords(result.data);
        setTotalCount(result.totalCount ?? 0);
      } else {
        setError(result.message || "Failed to fetch records");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error loading VC performance records:", err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [page, pageSize, isInitialLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "d MMM yyyy, HH:mm");
  };

  const getMonthYear = (date: Date) => {
    return format(new Date(date), "MMMM yyyy");
  };

  // Group records by month-year to detect duplicates
  const groupedByMonth = records.reduce<Record<string, PerformanceRecord[]>>(
    (acc, record) => {
      const monthKey = format(new Date(record.date), "yyyy-MM");
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(record);
      return acc;
    },
    {}
  );

  const duplicateMonths = Object.keys(groupedByMonth).filter(
    (month) => groupedByMonth[month].length > 1
  );

  // Calculate totals for current page
  const totalAum = records.reduce((acc, record) => acc + record.aum, 0);

  // Skeleton loading for initial load
  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-5 bg-muted/50 animate-pulse h-[88px]" />
          ))}
        </div>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border/50">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-4 flex-1 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Performance Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and view Assets Under Management (AUM) records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateVCPerformanceModal onSuccess={fetchData} />
          <Button
            onClick={fetchData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#192473] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Records</p>
              <p className="text-xl font-semibold">{totalCount}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Latest AUM</p>
              <p className="text-xl font-semibold">
                {records.length > 0 ? formatCurrency(records[0].aum) : "N/A"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-[#FFEB7A] rounded-xl p-5 text-[#192473]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#192473]/60 mb-1">Page Total AUM</p>
              <p className="text-xl font-semibold">{formatCurrency(totalAum)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#192473]/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[#192473]/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Month Warning */}
      {duplicateMonths.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
          <p className="text-red-700 text-sm font-medium">Duplicate Records Warning</p>
          <p className="text-red-600 text-sm mt-1">
            Multiple records found for:{" "}
            {duplicateMonths
              .map((month) => format(new Date(month + "-01"), "MMMM yyyy"))
              .join(", ")}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Records Table */}
      {!error && records.length > 0 && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Performance Records
            </h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Month/Year</TableHead>
                  <TableHead className="text-right">Assets Under Management</TableHead>
                  <TableHead className="text-right">IHSG</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const monthKey = format(new Date(record.date), "yyyy-MM");
                  const isDuplicate = groupedByMonth[monthKey]?.length > 1;

                  return (
                    <TableRow
                      key={record.id}
                      className={isDuplicate ? "bg-red-50/50" : ""}
                    >
                      <TableCell className="text-sm text-muted-foreground">{record.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {getMonthYear(record.date)}
                          </span>
                          {isDuplicate && (
                            <span className="text-xs text-red-600 font-medium">
                              Duplicate Month
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(record.aum)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {record.ihsgValue
                          ? record.ihsgValue.toLocaleString("id-ID", {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(record.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(record.updatedAt)}
                      </TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                            Valid
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EditVCPerformanceModal
                          record={record}
                          onSuccess={fetchData}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals Row */}
                <TableRow className="bg-[#192473]/5 border-t-2 border-[#192473]/10 font-semibold hover:bg-[#192473]/5">
                  <TableCell className="font-semibold text-sm">TOTAL</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-right font-semibold text-sm text-[#192473]">
                    {formatCurrency(totalAum)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[12, 24, 36, 48, 60].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {page} of {totalPages || 1}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && records.length === 0 && !isLoading && (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            No Performance Records
          </h3>
          <p className="text-sm text-muted-foreground">
            Add your first record to get started.
          </p>
        </div>
      )}
    </div>
  );
}
