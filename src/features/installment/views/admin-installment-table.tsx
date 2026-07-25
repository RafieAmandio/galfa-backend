"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getExpandedRowModel,
  PaginationState,
} from "@tanstack/react-table";
import { getAdminInstallmentInvestments } from "../actions/get-installments";
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
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Clock,
  Trash2,
} from "lucide-react";
import { parse } from "date-fns";
import { TextFilter, NumberRangeFilter, numberRangeFilter } from "@/components/ui/table-filters";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteInstallmentModal } from "../components/delete-installment-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkDeleteModal } from "@/components/bulk-delete-modal";
import { EditInstallmentModal } from "../components/edit-installment-modal";

interface AdminInstallmentSummary {
  totalGainedFunds: number;
  totalPresentValueFund: number;
  totalNetPresentValueFund: number;
  investments: any[];
  monthlyGainedFunds: { [monthYear: string]: number };
  totalCount: number;
  page: number;
  pageSize: number;
}

export function AdminInstallmentTable() {
  const [summary, setSummary] = useState<AdminInstallmentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [globalFilterInput, setGlobalFilterInput] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilterInput, 300);
  const [expanded, setExpanded] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      accountNumber: "Account Number",
      investorEmail: "Investor Email",
      investmentType: "Investment Type",
      netCapital: "Net Capital",
      durationMonths: "Duration (Months)",
      monthlyCof: "Monthly CoF",
      presentValueFund: "Present Value Fund",
      totalGainedFunds: "Total Gained",
    };
    return displayNames[columnId] || columnId;
  };

  const TypeFilter = ({
    column,
    uniqueTypes,
  }: {
    column: any;
    uniqueTypes: string[];
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
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "principle"
                      ? "Principle + Interest"
                      : type === "interest_only"
                        ? "Interest Only"
                        : type === "bullet"
                          ? "Bullet"
                          : "Co. Menurun"}
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

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      principle: { label: "Principle + Interest", className: "bg-blue-100 text-blue-800 border-blue-200" },
      interest_only: { label: "Interest Only", className: "bg-green-100 text-green-800 border-green-200" },
      bullet: { label: "Bullet", className: "bg-purple-100 text-purple-800 border-purple-200" },
      declining: { label: "Co. Menurun", className: "bg-orange-100 text-orange-800 border-orange-200" },
    };
    const c = config[type] ?? { label: type, className: "" };
    return (
      <Badge variant="secondary" className={c.className}>
        {c.label}
      </Badge>
    );
  };

  // Get unique investment types for filter dropdown
  const uniqueTypes = useMemo(() => {
    if (!summary) return [];
    return Array.from(
      new Set(summary.investments.map((inv) => inv.investmentType))
    );
  }, [summary]);

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
        accessorKey: "investmentType",
        header: ({ column }) => {
          return (
            <div className="flex items-center">
              <span className="font-semibold">Type</span>
              <TypeFilter column={column} uniqueTypes={uniqueTypes} />
            </div>
          );
        },
        cell: ({ getValue }) => getTypeBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "netCapital",
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
                Net Capital
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
        accessorKey: "durationMonths",
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
                Duration
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
            <Badge variant="outline">{getValue() as number} months</Badge>
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "monthlyCof",
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
                Monthly CoF
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
            {((getValue() as number) * 100).toFixed(2)}%
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
          <div className=" text-blue-600 font-medium text-right">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "totalGainedFunds",
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
                Total Gained
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
          <div className=" text-green-600 font-medium text-right">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "totalRedemptions",
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
                Total Redemptions
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
          <div className=" text-red-600 font-medium text-right">
            {formatCurrency(getValue() as number)}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        id: "actions",
        header: () => <div className="text-center font-semibold">Actions</div>,
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-center gap-2">
              <EditInstallmentModal
                investment={{
                  id: row.original.id,
                  accountNumber: row.original.accountNumber,
                  netCapital: row.original.netCapital,
                  monthlyCof: row.original.monthlyCof,
                  investmentType: row.original.investmentType,
                  transactionDate: row.original.startDate,
                  endDate: row.original.endDate,
                  status: row.original.status,
                }}
                onSuccess={fetchData}
              />
              <DeleteInstallmentModal
                accountId={row.original.id}
                accountNumber={row.original.accountNumber}
                onAccountDeleted={fetchData}
              >
                <Button variant="destructive" size="sm" className="h-8">
                  Delete
                </Button>
              </DeleteInstallmentModal>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [uniqueTypes]
  );

  const tableData = useMemo(() => summary?.investments || [], [summary]);

  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    manualPagination: true,
    pageCount,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded,
      pagination,
    },
    onExpandedChange: setExpanded,
  });

  const fetchData = async () => {
    if (!isInitialLoad) setLoading(true);
    try {
      const data = await getAdminInstallmentInvestments({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedGlobalFilter || undefined,
      });
      setSummary(data);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error("Error fetching installment data:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter]);

  useEffect(() => {
    setGlobalFilter(debouncedGlobalFilter);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedGlobalFilter]);

  // Calculate totals from filtered data
  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const totals = filteredData.reduce(
    (acc, investment) => ({
      totalNetCapital: acc.totalNetCapital + investment.netCapital,
      totalPresentValueFund:
        acc.totalPresentValueFund + investment.presentValueFund,
      totalGainedFunds: acc.totalGainedFunds + investment.totalGainedFunds,
      totalRedemptions:
        acc.totalRedemptions + (investment.totalRedemptions || 0),
    }),
    {
      totalNetCapital: 0,
      totalPresentValueFund: 0,
      totalGainedFunds: 0,
      totalRedemptions: 0,
    }
  );

  // Get unique months for the monthly gains table - sort chronologically
  const uniqueMonths = summary
    ? Object.keys(summary.monthlyGainedFunds).sort((a, b) => {
        const dateA = parse(a, "MMM yyyy", new Date());
        const dateB = parse(b, "MMM yyyy", new Date());
        return dateA.getTime() - dateB.getTime();
      })
    : [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#192473] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Investments</p>
              <p className="text-xl font-semibold">
                {loading || !summary ? "-" : filteredData.length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Gained Funds</p>
              <p className="text-xl font-semibold">
                {loading ? "-" : formatCurrency(totals.totalGainedFunds)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white/80" />
            </div>
          </div>
        </div>

        <div className="bg-[#FFEB7A] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#192473]/60 mb-1">Total Present Value</p>
              <p className="text-xl font-semibold text-[#192473]">
                {loading ? "-" : formatCurrency(totals.totalPresentValueFund)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#192473]/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#192473]/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Gained Funds */}
      {uniqueMonths.length > 0 && summary && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Monthly Gained Funds</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {uniqueMonths.map((month) => (
                      <TableHead key={month} className="text-center">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {uniqueMonths.map((month) => (
                      <TableCell key={month} className="text-center ">
                        {formatCurrency(summary.monthlyGainedFunds[month])}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-foreground">
                Investment Accounts
              </h3>
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
                <Button onClick={fetchData} variant="outline" size="sm">
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

              {(globalFilterInput || columnFilters.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGlobalFilterInput("");
                    setGlobalFilter("");
                    table.resetColumnFilters();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              )}
            </div>

            {columnFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {columnFilters.map((filter) => {
                  const formatFilterValue = (value: any) => {
                    if (Array.isArray(value)) {
                      const [min, max] = value;
                      if (min !== undefined && max !== undefined) return `${min} - ${max}`;
                      if (min !== undefined) return `≥ ${min}`;
                      if (max !== undefined) return `≤ ${max}`;
                      return "";
                    }
                    return String(value);
                  };

                  return (
                    <Badge key={filter.id} variant="secondary" className="text-xs">
                      {getColumnDisplayName(filter.id)}: {formatFilterValue(filter.value)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 ml-1"
                        onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
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
                {loading ? (
                  Array.from({ length: pagination.pageSize }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
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

                        {/* Expanded Row for Monthly Details */}
                        {row.getIsExpanded() && (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                              <div className="bg-muted/30 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">
                                    Monthly Details for{" "}
                                    {row.original.accountNumber}
                                  </span>
                                </div>

                                <div className="rounded-md border bg-background max-h-80 overflow-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                      <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">
                                          Principal
                                        </TableHead>
                                        <TableHead className="text-right">
                                          Interest
                                        </TableHead>
                                        <TableHead className="text-right">
                                          Total Payment
                                        </TableHead>
                                        <TableHead className="text-right">
                                          Net Present Value
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.original.monthlyData.map(
                                        (monthData: any) => (
                                          <TableRow key={monthData.monthYear}>
                                            <TableCell className="font-medium">
                                              {monthData.monthYear}
                                            </TableCell>
                                            <TableCell className=" text-right">
                                              {formatCurrency(
                                                monthData.principalPayment
                                              )}
                                            </TableCell>
                                            <TableCell className=" text-green-600 text-right">
                                              {formatCurrency(
                                                monthData.interestPayment
                                              )}
                                            </TableCell>
                                            <TableCell className=" text-blue-600 font-medium text-right">
                                              {formatCurrency(
                                                monthData.totalPayment
                                              )}
                                            </TableCell>
                                            <TableCell className=" text-right">
                                              {formatCurrency(
                                                monthData.netPresentValue
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        )
                                      )}
                                    </TableBody>
                                  </Table>
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
                        <TableCell></TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className=" font-bold text-right">
                          {formatCurrency(totals.totalNetCapital)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className=" font-bold text-blue-600 text-right">
                          {formatCurrency(totals.totalPresentValueFund)}
                        </TableCell>
                        <TableCell className=" font-bold text-green-600 text-right">
                          {formatCurrency(totals.totalGainedFunds)}
                        </TableCell>
                        <TableCell className=" font-bold text-red-600 text-right">
                          {formatCurrency(totals.totalRedemptions)}
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
                    {[10, 20, 30, 50, 100].map((pageSize) => (
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
        </div>
      </div>

      <BulkDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        accountType="installment"
        selectedAccounts={table
          .getFilteredSelectedRowModel()
          .rows.map((row) => ({
            id: row.original.id,
            accountNumber: row.original.accountNumber,
          }))}
        onDeleteComplete={() => {
          setRowSelection({});
          fetchData();
        }}
      />
    </div>
  );
}
