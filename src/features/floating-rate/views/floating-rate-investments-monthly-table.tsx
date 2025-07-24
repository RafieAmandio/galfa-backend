"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  getExpandedRowModel,
} from "@tanstack/react-table";
import { getFloatingRateInvestmentsWithMonthlyPerformance } from "../actions/get-floating-rate-investments-with-monthly-performance";
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  Calendar,
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

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performanceRate: number;
  growthRate: number;
  previousMonthValue: number;
  presentValueFund: number;
  gainedFund: number;
  isFirstMonth: boolean;
  daysActive: number;
  totalDaysInMonth: number;
  appliedRule: string;
  hasData: boolean;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
  presentValueFund: number;
  totalGainedFund: number;
}

interface FloatingRateDataWithMonthly {
  investments: FloatingRateInvestmentWithMonthly[];
  totalGrossCapital: number;
  totalNetInvestorFund: number;
  totalAdminFees: number;
  totalPresentValueFund: number;
  totalGainedFund: number;
  activeAccountsCount: number;
  availableMonths: string[];
}

// Custom filter functions
const numberRangeFilter = (
  row: Row<FloatingRateInvestmentWithMonthly>,
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
  row: Row<FloatingRateInvestmentWithMonthly>,
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

export default function FloatingRateInvestmentsMonthlyTable() {
  const [data, setData] = useState<FloatingRateDataWithMonthly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState({});

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

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) {
      return "0.00%";
    }
    return `${percentage.toFixed(2)}%`;
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

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      accountNumber: "Account Number",
      investorEmail: "Investor Email",
      grossCapital: "Gross Capital",
      adminFee: "Admin Fee",
      netInvestorFund: "Net Capital",
      presentValueFund: "Present Value Fund",
      transactionDate: "Transaction Date",
      endDate: "End Date",
      status: "Status",
      totalMonthsActive: "Months Active",
      isRollover: "Rollover Status",
      rolloverSequence: "Rollover Sequence",
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
  }) => {
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
  };

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.investments.map((inv) => inv.status)));
  }, [data]);

  // Column definitions
  const columns = useMemo<ColumnDef<FloatingRateInvestmentWithMonthly>[]>(
    () => [
      {
        id: "expander",
        header: "",
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={row.getToggleExpandedHandler()}
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : null;
        },
        size: 50,
      },
      {
        accessorKey: "accountNumber",
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
          );
        },
        cell: ({ getValue }) => (
          <div className="font-medium">{getValue() as string}</div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "investorEmail",
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
                Investor Email
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
          );
        },
        cell: ({ getValue }) => <div>{getValue() as string}</div>,
        filterFn: "includesString",
      },
      {
        accessorKey: "grossCapital",
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
                Gross Capital
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
          <div className="font-mono text-right">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "netInvestorFund",
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
                Net Investor Fund
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
          <div className="font-mono text-right font-medium text-blue-600">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "presentValueFund",
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
          );
        },
        cell: ({ getValue }) => (
          <div className="font-mono text-right font-medium text-green-600">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "totalMonthsActive",
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
                Months Active
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
          <div className="text-center">
            <Badge variant="secondary">{getValue() as number} months</Badge>
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "transactionDate",
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
          );
        },
        cell: ({ getValue }) => (
          <div className="text-muted-foreground">
            {formatDate(getValue() as Date)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <span className="font-semibold">Status</span>
              <StatusFilter column={column} uniqueStatuses={uniqueStatuses} />
            </div>
          );
        },
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "isRollover",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <span className="font-semibold">Rollover</span>
              <StatusFilter
                column={column}
                uniqueStatuses={["true", "false"]}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const isRollover = row.getValue("isRollover") as boolean;
          const sequence = row.original.rolloverSequence;

          return isRollover ? (
            <Badge variant="outline">Rollover #{sequence}</Badge>
          ) : (
            <span className="text-muted-foreground">Original</span>
          );
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
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded,
    },
    onExpandedChange: setExpanded,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getFloatingRateInvestmentsWithMonthlyPerformance();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        "Failed to fetch floating rate investments with monthly performance"
      );
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate totals from filtered data
  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const totals = filteredData.reduce(
    (acc, investment) => ({
      grossCapital: acc.grossCapital + investment.grossCapital,
      adminFee: acc.adminFee + investment.adminFee,
      netInvestorFund: acc.netInvestorFund + investment.netInvestorFund,
      presentValueFund: acc.presentValueFund + investment.presentValueFund,
    }),
    {
      grossCapital: 0,
      adminFee: 0,
      netInvestorFund: 0,
      presentValueFund: 0,
    }
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">
              Loading floating rate investments...
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
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Investments
                </p>
                <p className="text-lg font-bold">
                  {filteredData.length}
                  {filteredData.length !== data.investments.length && (
                    <span className="text-sm text-muted-foreground ml-1">
                      of {data.investments.length}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Gross Capital
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.grossCapital)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Net Investor Fund
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.netInvestorFund)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Admin Fees
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.adminFee)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Present Value Fund
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(totals.presentValueFund)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Available Months
                </p>
                <p className="text-lg font-bold">
                  {data.availableMonths.length}
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
                Floating Rate Investments - Monthly Performance
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={fetchData} variant="outline" size="sm">
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
                      <React.Fragment key={row.id}>
                        <TableRow
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

                        {/* Expanded Row for Monthly Performance */}
                        {row.getIsExpanded() && (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                              <div className="bg-muted/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Calendar className="h-4 w-4" />
                                  <span className="font-medium">
                                    Monthly Performance History -{" "}
                                    {row.original.accountNumber}
                                  </span>
                                  <Badge variant="outline">
                                    {row.original.monthlyPerformance.length}{" "}
                                    months
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {row.original.monthlyPerformance.map(
                                    (monthData) => (
                                      <div
                                        key={monthData.monthLabel}
                                        className={`p-3 rounded-lg border ${
                                          monthData.hasData
                                            ? "bg-white border-green-200"
                                            : "bg-gray-50 border-gray-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-sm">
                                            {monthData.monthLabel}
                                          </span>
                                          {monthData.hasData ? (
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <div className="h-4 w-4 rounded bg-gray-300" />
                                          )}
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                              Growth Rate:
                                            </span>
                                            <Badge
                                              variant={
                                                monthData.hasData
                                                  ? "default"
                                                  : "outline"
                                              }
                                              className="text-xs"
                                            >
                                              {formatPercentage(
                                                monthData.growthRate
                                              )}
                                            </Badge>
                                          </div>

                                          {monthData.isFirstMonth && (
                                            <div className="flex justify-between text-xs">
                                              <span className="text-muted-foreground">
                                                Days Active:
                                              </span>
                                              <span className="text-xs font-medium text-purple-600">
                                                {monthData.daysActive}/
                                                {monthData.totalDaysInMonth}
                                              </span>
                                            </div>
                                          )}

                                          <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                              Previous Value:
                                            </span>
                                            <span className="text-xs font-medium text-blue-600">
                                              {formatCurrency(
                                                monthData.previousMonthValue
                                              )}
                                            </span>
                                          </div>

                                          <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                              Present Value:
                                            </span>
                                            <span className="text-xs font-medium text-green-600">
                                              {formatCurrency(
                                                monthData.presentValueFund
                                              )}
                                            </span>
                                          </div>

                                          <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                              Gained Fund:
                                            </span>
                                            <span className="text-xs font-medium text-emerald-600">
                                              {formatCurrency(
                                                monthData.gainedFund
                                              )}
                                            </span>
                                          </div>

                                          <div className="text-xs text-muted-foreground mt-1">
                                            <span className="font-medium">
                                              Rule:
                                            </span>{" "}
                                            {monthData.appliedRule}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Totals Row */}
                    {filteredData.length > 0 && (
                      <TableRow className="bg-yellow-50 border-t-2 border-yellow-200 font-bold hover:bg-yellow-50">
                        <TableCell></TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right">
                          {formatCurrency(totals.grossCapital)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right text-blue-600">
                          {formatCurrency(totals.netInvestorFund)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right text-green-600">
                          {formatCurrency(totals.presentValueFund)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
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
