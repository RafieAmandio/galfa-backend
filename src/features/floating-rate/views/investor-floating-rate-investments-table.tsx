"use client";

import React, { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  TrendingUp,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { FloatingRateDataWithMonthly } from "../components/admin-floating-rate-view";

interface InvestorFloatingRateInvestmentsTableProps {
  data: FloatingRateDataWithMonthly | null;
}

// Custom filter functions
const numberRangeFilter = (
  row: Row<any>,
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

const dateRangeFilter = (
  row: Row<any>,
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

export default function InvestorFloatingRateInvestmentsTable({
  data,
}: InvestorFloatingRateInvestmentsTableProps) {
  const loading = false;
  const error = null;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "d MMMM yyyy");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      completed: { variant: "secondary" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRolloverBadge = (isRollover: boolean, sequence: number) => {
    if (!isRollover) {
      return <Badge variant="outline">Original</Badge>;
    }
    return <Badge variant="secondary">Rollover #{sequence}</Badge>;
  };

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      accountNumber: "Account Number",
      grossCapital: "Original Investment",
      adminFee: "Admin Fee",
      netInvestorFund: "Net Investor Fund",
      presentValueFund: "Present Value Fund",
      gainedFund: "Gained Fund",
      totalRedemptions: "Redemptions",
      transactionDate: "Transaction Date",
      endDate: "End Date",
      status: "Status",
      isRollover: "Type",
      rolloverSequence: "Rollover Sequence",
    };
    return displayNames[columnId] || columnId;
  };

  // Helper to calculate total redemptions for an investment
  const getTotalRedemptions = (investment: any) => {
    if (!investment.monthlyPerformance) return 0;
    return investment.monthlyPerformance
      .flatMap((month: any) => month.redemptions)
      .reduce(
        (sum: number, redemption: any) =>
          sum + (Number(redemption.amount) || 0),
        0
      );
  };

  // Helper to calculate gained fund for an investment
  const getGainedFund = (investment: any) => {
    const totalRedemptions = getTotalRedemptions(investment);
    return (
      (Number(investment.presentValueFund) || 0) -
      ((Number(investment.grossCapital) || 0) - totalRedemptions)
    );
  };

  // Filter Components
  const TextFilter = ({ column }: { column: any }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ml-1 ${
            column.getFilterValue() ? "text-blue-600" : "text-muted-foreground"
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
            <Label>Filter {getColumnDisplayName(column.id)} Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={min ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  column.setFilterValue([
                    value ? parseFloat(value) : undefined,
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
                    value ? parseFloat(value) : undefined,
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
            <Label>Filter {getColumnDisplayName(column.id)} Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="From"
                type="date"
                value={from ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  column.setFilterValue([value || undefined, to]);
                }}
              />
              <Input
                placeholder="To"
                type="date"
                value={to ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  column.setFilterValue([from, value || undefined]);
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

  const StatusFilter = ({
    column,
    uniqueStatuses,
  }: {
    column: any;
    uniqueStatuses: string[];
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ml-1 ${
            column.getFilterValue() ? "text-blue-600" : "text-muted-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="start">
        <div className="space-y-2">
          <Label>Filter by {getColumnDisplayName(column.id)}</Label>
          <Select
            value={(column.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              column.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {column.getFilterValue() && (
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

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.investments.map((inv: any) => inv.status))
    ) as string[];
  }, [data]);

  // Column definitions
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "accountNumber",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Account Number
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            <TextFilter column={column} />
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="font-medium">{getValue() as string}</div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "grossCapital",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Original Investment
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
        ),
        cell: ({ getValue }) => (
          <div className=" text-right">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "presentValueFund",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Present Value Fund
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
        ),
        cell: ({ getValue }) => (
          <div className=" text-right font-medium text-green-600">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "gainedFund",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Gained Fund
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            {/* No filter for calculated column */}
          </div>
        ),
        cell: ({ row }) => {
          const value = getGainedFund(row.original);
          return (
            <div className=" text-right text-emerald-600">
              {formatCurrency(value)}
            </div>
          );
        },
        // No filterFn for calculated column
        sortingFn: (a, b) => {
          const aValue = getGainedFund(a.original);
          const bValue = getGainedFund(b.original);
          return aValue - bValue;
        },
      },
      {
        accessorKey: "totalRedemptions",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Redemptions
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            {/* No filter for calculated column */}
          </div>
        ),
        cell: ({ row }) => {
          const value = getTotalRedemptions(row.original);
          return value > 0 ? (
            <span className="text-red-600 font-medium">
              {formatCurrency(value)}
            </span>
          ) : (
            <span className="text-gray-500">None</span>
          );
        },
        // No filterFn for calculated column
        sortingFn: (a, b) => {
          const aValue = getTotalRedemptions(a.original);
          const bValue = getTotalRedemptions(b.original);
          return aValue - bValue;
        },
      },
      {
        accessorKey: "transactionDate",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Transaction Date
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
        ),
        cell: ({ getValue }) => (
          <div className="text-muted-foreground">
            {formatDate(getValue() as Date)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              End Date
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
        ),
        cell: ({ getValue }) => {
          const value = getValue() as Date | null;
          return value ? formatDate(value) : "Ongoing";
        },
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <div className="flex items-center">
            <span className="font-semibold">Status</span>
            <StatusFilter column={column} uniqueStatuses={uniqueStatuses} />
          </div>
        ),
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "isRollover",
        header: ({ column }) => (
          <div className="flex items-center">
            <span className="font-semibold">Type</span>
            <StatusFilter column={column} uniqueStatuses={["true", "false"]} />
          </div>
        ),
        cell: ({ row }) => {
          const isRollover = row.getValue("isRollover") as boolean;
          const sequence = row.original.rolloverSequence;
          return getRolloverBadge(isRollover, sequence);
        },
        filterFn: (row, columnId, value) => {
          const isRollover = row.getValue(columnId) as boolean;
          if (value === "true") return isRollover;
          if (value === "false") return !isRollover;
          return true;
        },
      },
    ],
    [uniqueStatuses]
  );

  const tableData = useMemo(() => data?.investments || [], [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Calculate totals from filtered data
  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const totals = filteredData.reduce(
    (acc: any, investment: any) => {
      const redemptions = getTotalRedemptions(investment);
      const gainedFund = getGainedFund(investment);
      return {
        grossCapital: acc.grossCapital + (Number(investment.grossCapital) || 0),
        netInvestorFund:
          acc.netInvestorFund + (Number(investment.netInvestorFund) || 0),
        presentValueFund:
          acc.presentValueFund + (Number(investment.presentValueFund) || 0),
        gainedFund: acc.gainedFund + gainedFund,
        totalRedemptions: acc.totalRedemptions + redemptions,
      };
    },
    {
      grossCapital: 0,
      netInvestorFund: 0,
      presentValueFund: 0,
      gainedFund: 0,
      totalRedemptions: 0,
    }
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">
              Loading your floating rate investments...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.investments.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">No floating rate investments found</p>
        <p className="text-sm text-gray-500">
          You don't have any floating rate investments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.activeAccountsCount} active accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Original Investment Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.grossCapital)}
            </div>
            <p className="text-xs text-muted-foreground">
              Your original capital
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Present Value Fund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.presentValueFund)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current compound value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.totalRedemptions)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalRedemptions > 0
                ? "Amount withdrawn"
                : "No withdrawals"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Your Floating Rate Investments
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
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
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
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
                        <TableCell className=" font-bold text-right">
                          {formatCurrency(totals.grossCapital)}
                        </TableCell>
                        <TableCell className=" font-bold text-right text-green-600">
                          {formatCurrency(totals.presentValueFund)}
                        </TableCell>
                        <TableCell className=" font-bold text-right text-emerald-600">
                          {formatCurrency(totals.gainedFund)}
                        </TableCell>
                        <TableCell className=" font-bold text-right text-red-600">
                          {formatCurrency(totals.totalRedemptions)}
                        </TableCell>
                        <TableCell colSpan={columns.length - 5}></TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
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
