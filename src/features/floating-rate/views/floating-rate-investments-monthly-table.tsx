"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  getExpandedRowModel,
} from "@tanstack/react-table";
// Data fetching moved to server-side - no longer needed here
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
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkDeleteModal } from "@/components/bulk-delete-modal";
import { format } from "date-fns";
import { TextFilter, NumberRangeFilter, DateRangeFilter, numberRangeFilter, dateRangeFilter } from "@/components/ui/table-filters";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteFloatingRateModal } from "@/features/floating-rate/components/delete-floating-rate-modal";
import { EditFloatingRateModal } from "@/features/floating-rate/components/edit-floating-rate-modal";

// This component receives data from server-side

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface FloatingRateInvestmentsMonthlyTableProps {
  data: {
    investments: any[];
    totalGrossCapital: number;
    totalNetInvestorFund: number;
    totalAdminFees: number;
    totalPresentValueFund: number;
    totalGainedFund: number;
    activeAccountsCount: number;
    availableMonths: string[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } | null;
  paginationParams: PaginationParams;
  onPaginationChange: (params: Partial<PaginationParams>) => void;
  onDeleted?: () => void;
  isFetching?: boolean;
}

export default function FloatingRateInvestmentsMonthlyTable({
  data,
  paginationParams,
  onPaginationChange,
  onDeleted,
  isFetching = false,
}: FloatingRateInvestmentsMonthlyTableProps) {
  // Remove data fetching state - data comes from props
  const loading = false;
  const error = null;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [globalFilterInput, setGlobalFilterInput] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const debouncedGlobalFilter = useDebounce(globalFilterInput, 300);
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
    return Array.from(
      new Set(data.investments.map((inv: any) => inv.status))
    ) as string[];
  }, [data]);

  // Column definitions
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
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
              <TextFilter column={column} label={getColumnDisplayName(column.id)} />
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
              <TextFilter column={column} label={getColumnDisplayName(column.id)} />
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
              <NumberRangeFilter column={column} label={getColumnDisplayName(column.id)} />
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className=" text-right">
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
              <NumberRangeFilter column={column} label={getColumnDisplayName(column.id)} />
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className=" text-right font-medium text-blue-600">
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
              <NumberRangeFilter column={column} label={getColumnDisplayName(column.id)} />
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className=" text-right font-medium text-green-600">
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
              <NumberRangeFilter column={column} label={getColumnDisplayName(column.id)} />
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
              <DateRangeFilter column={column} label={getColumnDisplayName(column.id)} />
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
      {
        id: "actions",
        header: () => <div className="text-center font-semibold">Actions</div>,
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-center gap-2">
              <EditFloatingRateModal
                investment={row.original}
                onSuccess={onDeleted}
              />
              <DeleteFloatingRateModal
                accountId={row.original.id}
                accountNumber={row.original.accountNumber}
                onAccountDeleted={onDeleted}
              >
                <Button variant="destructive" size="sm" className="h-8">
                  Delete
                </Button>
              </DeleteFloatingRateModal>
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: 110,
      },
    ],
    [uniqueStatuses]
  );

  const tableData = useMemo(() => data?.investments || [], [data]);

  // Handle server-side sorting
  const handleSortingChange = (updaterOrValue: any) => {
    const newSorting =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;

    if (newSorting.length > 0) {
      const sort = newSorting[0];
      onPaginationChange({
        sortBy: sort.id,
        sortOrder: sort.desc ? "desc" : "asc",
      });
    }
    setSorting(newSorting);
  };

  // Handle server-side filtering
  const handleColumnFiltersChange = (updaterOrValue: any) => {
    const newFilters =
      typeof updaterOrValue === "function"
        ? updaterOrValue(columnFilters)
        : updaterOrValue;

    setColumnFilters(newFilters);

    // Extract filter values and update pagination params
    const searchFilter =
      newFilters.find((f: any) => f.id === "global")?.value || "";
    const statusFilter =
      newFilters.find((f: any) => f.id === "status")?.value || "";

    onPaginationChange({
      search: searchFilter,
      status: statusFilter,
    });
  };

  // Handle server-side global filter
  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    onPaginationChange({
      search: value,
    });
  };

  useEffect(() => {
    handleGlobalFilterChange(debouncedGlobalFilter);
  }, [debouncedGlobalFilter]);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: handleGlobalFilterChange,
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
    // Server-side pagination - disable client-side pagination
    manualPagination: true,
    pageCount: data?.pagination.totalPages || 0,
  });

  // Data fetching removed - data comes from server-side props

  // Use server-side totals instead of client-side calculation
  const totals = data
    ? {
        grossCapital: data.totalGrossCapital,
        adminFee: data.totalAdminFees,
        netInvestorFund: data.totalNetInvestorFund,
        presentValueFund: data.totalPresentValueFund,
      }
    : {
        grossCapital: 0,
        adminFee: 0,
        netInvestorFund: 0,
        presentValueFund: 0,
      };

  // Server-side pagination handlers
  const handlePageChange = (page: number) => {
    onPaginationChange({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    onPaginationChange({ limit: pageSize, page: 1 });
  };

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-xl p-12 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading floating rate investments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-border rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#192473] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Investments</p>
              <p className="text-xl font-semibold">{data.pagination.total}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Gross Capital</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.grossCapital)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-[#FFEB7A] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#192473]/60 mb-1">Net Investor Fund</p>
              <p className="text-xl font-semibold text-[#192473]">{formatCurrency(totals.netInvestorFund)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#192473]/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#192473]/80" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Admin Fees</p>
              <p className="text-xl font-semibold text-amber-600">{formatCurrency(totals.adminFee)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Present Value Fund</p>
              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.presentValueFund)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Available Months</p>
              <p className="text-xl font-semibold">{data.availableMonths.length}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-foreground">
                  Monthly Performance
                </h3>
                {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center space-x-2">
                {table.getFilteredSelectedRowModel().rows.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
                  </Button>
                )}
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={globalFilterInput}
                  onChange={(event) => setGlobalFilterInput(event.target.value)}
                  className="max-w-sm h-9 text-sm"
                />
              </div>

              {(globalFilterInput ||
                paginationParams.search ||
                paginationParams.status ||
                paginationParams.dateFrom ||
                paginationParams.dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGlobalFilterInput("");
                    setGlobalFilter("");
                    setColumnFilters([]);
                    onPaginationChange({
                      search: "",
                      status: "",
                      dateFrom: "",
                      dateTo: "",
                      page: 1,
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              )}
            </div>

            {(paginationParams.search ||
              paginationParams.status ||
              paginationParams.dateFrom ||
              paginationParams.dateTo) && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {paginationParams.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {paginationParams.search}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => onPaginationChange({ search: "" })}>
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
                {paginationParams.status && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {paginationParams.status}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => onPaginationChange({ status: "" })}>
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
                {paginationParams.dateFrom && (
                  <Badge variant="secondary" className="text-xs">
                    From: {paginationParams.dateFrom}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => onPaginationChange({ dateFrom: "" })}>
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
                {paginationParams.dateTo && (
                  <Badge variant="secondary" className="text-xs">
                    To: {paginationParams.dateTo}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => onPaginationChange({ dateTo: "" })}>
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="p-5">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-80 overflow-auto">
                                  {row.original.monthlyPerformance.map(
                                    (monthData: any) => (
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

                                          {/* Redemptions Section */}
                                          {monthData.redemptions &&
                                            monthData.redemptions.length >
                                              0 && (
                                              <div className="mt-2 pt-2 border-t border-gray-200">
                                                <div className="text-xs font-medium text-red-600 mb-1">
                                                  Redemptions (
                                                  {monthData.redemptions.length}
                                                  )
                                                </div>
                                                {monthData.redemptions.map(
                                                  (
                                                    redemption: any,
                                                    index: number
                                                  ) => (
                                                    <div
                                                      key={index}
                                                      className="text-xs bg-red-50 border border-red-200 rounded p-2 mb-1"
                                                    >
                                                      <div className="flex justify-between items-start">
                                                        <span className="font-medium text-red-700">
                                                          {formatCurrency(
                                                            redemption.amount
                                                          )}
                                                        </span>
                                                        <Badge
                                                          variant={
                                                            redemption.status ===
                                                            "completed"
                                                              ? "default"
                                                              : "secondary"
                                                          }
                                                          className="text-xs"
                                                        >
                                                          {redemption.status}
                                                        </Badge>
                                                      </div>
                                                      <div className="text-red-600 mt-1">
                                                        {format(
                                                          new Date(
                                                            redemption.transactionDate
                                                          ),
                                                          "d MMM yyyy"
                                                        )}
                                                      </div>
                                                      {redemption.description && (
                                                        <div className="text-red-500 text-xs mt-1">
                                                          {
                                                            redemption.description
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}
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
                    {tableData.length > 0 && (
                      <TableRow className="bg-yellow-50 border-t-2 border-yellow-200 font-bold hover:bg-yellow-50">
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className=" font-bold text-right">
                          {formatCurrency(totals.grossCapital)}
                        </TableCell>
                        <TableCell className=" font-bold text-right text-blue-600">
                          {formatCurrency(totals.netInvestorFund)}
                        </TableCell>
                        <TableCell className=" font-bold text-right text-green-600">
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

          {/* Server-side Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
              to{" "}
              {Math.min(
                data.pagination.page * data.pagination.limit,
                data.pagination.total
              )}{" "}
              of {data.pagination.total} results
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${paginationParams.limit || 10}`}
                  onValueChange={(value) => {
                    handlePageSizeChange(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={paginationParams.limit || 10} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => handlePageChange(1)}
                  disabled={!data.pagination.hasPreviousPage}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronFirst />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPreviousPage}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNextPage}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => handlePageChange(data.pagination.totalPages)}
                  disabled={!data.pagination.hasNextPage}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronLast />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BulkDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        accountType="floating-rate"
        selectedAccounts={table
          .getFilteredSelectedRowModel()
          .rows.map((row) => ({
            id: row.original.id,
            accountNumber: row.original.accountNumber,
          }))}
        onDeleteComplete={() => {
          setRowSelection({});
          onDeleted?.();
        }}
      />
    </div>
  );
}
