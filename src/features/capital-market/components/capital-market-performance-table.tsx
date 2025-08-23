"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  Row,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { getCapitalMarketPerformanceByUserIdQueryOptions } from "../actions/get-capital-market-performance-by-user-id/query-options";
import { CreateCapitalMarketPerformanceModal } from "./create-capital-market-performance-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type CapitalMarketPerformance = {
  id: number;
  capital_market_account_id: number | null;
  created_at: Date;
  updated_at: Date;
  performance_date: Date;
  total_invested: string;
  gross_performance: string;
  net_performance: string;
};

// Custom filter function for number ranges
const numberRangeFilter = (
  row: Row<CapitalMarketPerformance>,
  columnId: string,
  value: [number?, number?]
) => {
  const [min, max] = value;
  const cellValue = Number(row.getValue(columnId));

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
const dateRangeFilter = (
  row: Row<CapitalMarketPerformance>,
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

export function CapitalMarketPerformanceTable({ userId }: { userId: string }) {
  const {
    data: capitalMarketPerformance,
    isLoading,
    refetch,
  } = useQuery(getCapitalMarketPerformanceByUserIdQueryOptions(userId));

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMMM yyyy");
  };

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return "0.00%";
    const percentage = (value / total) * 100;
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
  };

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      performance_date: "Performance Date",
      total_invested: "Total Invested",
      gross_performance: "Gross Performance",
      net_performance: "Net Performance",
    };
    return displayNames[columnId] || columnId;
  };

  // Filter Components
  const TextFilter = ({ column }: { column: any }) => {
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
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search..."
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(e) => column.setFilterValue(e.target.value)}
              />
              {column.getFilterValue() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => column.setFilterValue("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const NumberRangeFilter = ({ column }: { column: any }) => {
    const filterValue = column.getFilterValue() as
      | [number?, number?]
      | undefined;
    const [min, max] = filterValue || [undefined, undefined];

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ml-1 ${
              filterValue ? "text-blue-600" : "text-muted-foreground"
            }`}
          >
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={min ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  column.setFilterValue([
                    value === "" ? undefined : Number(value),
                    max,
                  ]);
                }}
              />
              <Input
                placeholder="Max"
                type="number"
                value={max ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  column.setFilterValue([
                    min,
                    value === "" ? undefined : Number(value),
                  ]);
                }}
              />
            </div>
            {filterValue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => column.setFilterValue(undefined)}
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
  };

  const DateRangeFilter = ({ column }: { column: any }) => {
    const filterValue = column.getFilterValue() as
      | [string?, string?]
      | undefined;
    const [from, to] = filterValue || [undefined, undefined];

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ml-1 ${
              filterValue ? "text-blue-600" : "text-muted-foreground"
            }`}
          >
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="From"
                type="date"
                value={from ?? ""}
                onChange={(e) => {
                  column.setFilterValue([e.target.value, to]);
                }}
              />
              <Input
                placeholder="To"
                type="date"
                value={to ?? ""}
                onChange={(e) => {
                  column.setFilterValue([from, e.target.value]);
                }}
              />
            </div>
            {filterValue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => column.setFilterValue(undefined)}
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
  };

  // Column definitions
  const columns = useMemo<ColumnDef<CapitalMarketPerformance>[]>(
    () => [
      {
        accessorKey: "performance_date",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="h-auto p-0 font-semibold"
              >
                Performance Date
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <DateRangeFilter column={column} />
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className="font-medium">{formatDate(getValue() as Date)}</div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "total_invested",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="h-auto p-0 font-semibold"
              >
                Total Invested
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <NumberRangeFilter column={column} />
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className="">{formatCurrency(Number(getValue()))}</div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "gross_performance",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="h-auto p-0 font-semibold"
              >
                Gross Performance
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <NumberRangeFilter column={column} />
            </div>
          );
        },
        cell: ({ row }) => {
          const grossPerformance = Number(row.getValue("gross_performance"));
          const totalInvested = Number(row.getValue("total_invested"));
          return (
            <div className="space-y-1">
              <div className="">{formatCurrency(grossPerformance)}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(grossPerformance, totalInvested)}
              </div>
            </div>
          );
        },
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "net_performance",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="h-auto p-0 font-semibold"
              >
                Net Performance
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <NumberRangeFilter column={column} />
            </div>
          );
        },
        cell: ({ row }) => {
          const netPerformance = Number(row.getValue("net_performance"));
          const totalInvested = Number(row.getValue("total_invested"));
          return (
            <div className="space-y-1">
              <div>{formatCurrency(netPerformance)}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(netPerformance, totalInvested)}
              </div>
            </div>
          );
        },
        filterFn: numberRangeFilter,
      },
    ],
    []
  );

  // Calculate summary statistics from filtered data
  const filteredData = useMemo(() => {
    if (!capitalMarketPerformance) return [];
    return capitalMarketPerformance.filter((record) => {
      // Apply global filter
      if (globalFilter) {
        const searchValue = globalFilter.toLowerCase();
        const searchableFields = [
          formatDate(record.performance_date),
          formatCurrency(Number(record.total_invested)),
          formatCurrency(Number(record.gross_performance)),
          formatCurrency(Number(record.net_performance)),
        ];
        if (
          !searchableFields.some((field) =>
            field.toLowerCase().includes(searchValue)
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [capitalMarketPerformance, globalFilter]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, record) => {
        acc.totalInvested += Number(record.total_invested);
        acc.grossPerformance += Number(record.gross_performance);
        acc.netPerformance += Number(record.net_performance);
        return acc;
      },
      { totalInvested: 0, grossPerformance: 0, netPerformance: 0 }
    );
  }, [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Capital Market Performance</h2>
        <CreateCapitalMarketPerformanceModal userId={userId} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Invested
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.totalInvested)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Gross Performance
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.grossPerformance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Performance
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.netPerformance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Performance Records
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Global Search and Filter Controls */}
            <div className="flex flex-col space-y-4">
              {/* Global Search */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search all columns..."
                    value={globalFilter}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Reset All Filters */}
                {(globalFilter || columnFilters.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGlobalFilter("");
                      table.resetColumnFilters();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset All Filters
                  </Button>
                )}
              </div>

              {/* Active Filters Display */}
              {columnFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    Active filters:
                  </span>
                  {columnFilters.map((filter) => {
                    const formatFilterValue = (value: any) => {
                      if (Array.isArray(value)) {
                        const [min, max] = value;
                        if (min !== undefined && max !== undefined) {
                          return `${min} - ${max}`;
                        } else if (min !== undefined) {
                          return `≥ ${min}`;
                        } else if (max !== undefined) {
                          return `≤ ${max}`;
                        }
                        return "";
                      }
                      return String(value);
                    };

                    return (
                      <Badge
                        key={filter.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {getColumnDisplayName(filter.id)}:{" "}
                        {formatFilterValue(filter.value)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 ml-1"
                          onClick={() => {
                            table
                              .getColumn(filter.id)
                              ?.setFilterValue(undefined);
                          }}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  <>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                    {/* Totals Row */}
                    {filteredData.length > 0 && (
                      <TableRow className="bg-yellow-50 border-t-2 border-yellow-200 font-bold hover:bg-yellow-50">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className=" font-bold">
                          {formatCurrency(totals.totalInvested)}
                        </TableCell>
                        <TableCell className=" font-bold">
                          {formatCurrency(totals.grossPerformance)}
                        </TableCell>
                        <TableCell className=" font-bold">
                          {formatCurrency(totals.netPerformance)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No performance records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} row(s) total.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronFirst />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronLast />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
