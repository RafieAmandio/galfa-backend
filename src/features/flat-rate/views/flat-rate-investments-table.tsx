"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  PaginationState,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getExpandedRowModel,
} from "@tanstack/react-table";
import { getFlatRateInvestments } from "../actions/get-flat-rate-investments";
import { DeleteFlatRateModal } from "../components/delete-flat-rate-modal";
import { EditFlatRateModal } from "../components/edit-flat-rate-modal";
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
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronLast,
  ChevronFirst,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { TextFilter, NumberRangeFilter, DateRangeFilter, numberRangeFilter, dateRangeFilter } from "@/components/ui/table-filters";
import { useDebounce } from "@/hooks/useDebounce";

type FlatRateInvestment = Awaited<ReturnType<typeof getFlatRateInvestments>>["data"][0];

export function FlatRateInvestmentsTable() {
  const [data, setData] = useState<FlatRateInvestment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd MMM yyyy");
  };

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      name: "Account Name",
      grossCapital: "Capital",
      rate: "Rate",
      transDate: "Transaction Date",
      endDate: "End Date",
      status: "Status",
      currentValue: "Current Value",
      totalRedemptions: "Total Redeemed",
    };
    return displayNames[columnId] || columnId;
  };

  const StatusFilter = ({ column }: { column: any }) => {
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

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      redeemed: "bg-purple-100 text-purple-800 border-purple-200",
      rollover: "bg-blue-100 text-blue-800 border-blue-200",
      mature: "bg-yellow-100 text-yellow-800 border-yellow-200",
      closed: "bg-gray-100 text-gray-800 border-gray-200",
    } as const;

    return (
      <Badge
        variant="outline"
        className={colors[status as keyof typeof colors] || colors.closed}
      >
        {status}
      </Badge>
    );
  };

  // Column definitions
  const columns = useMemo<ColumnDef<FlatRateInvestment>[]>(
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
        accessorKey: "name",
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
                Account Name
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
          <div className="font-medium truncate max-w-[160px]" title={getValue() as string}>{getValue() as string}</div>
        ),
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
                Capital
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
          <div className="text-green-600 font-medium whitespace-nowrap">{formatCurrency(getValue() as number)}</div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "rate",
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
                Rate
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
        cell: ({ getValue }) => <div>{getValue() as number}%</div>,
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "transDate",
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
          <div className="text-muted-foreground whitespace-nowrap">
            {formatDate(getValue() as Date)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "endDate",
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
                End Date
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
          <div className="text-muted-foreground whitespace-nowrap">
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
              <StatusFilter column={column} />
            </div>
          );
        },
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "currentValue",
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
                Current Value
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
          <div className="text-blue-600 font-medium whitespace-nowrap">
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
              <span className="font-semibold">Total Redeemed</span>
              <NumberRangeFilter column={column} label={getColumnDisplayName(column.id)} />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return (
            <div className="">
              {value > 0 ? (
                <span className="text-red-600">-{formatCurrency(value)}</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          );
        },
        filterFn: numberRangeFilter,
      },
      {
        id: "actions",
        header: () => <span className="font-semibold">Actions</span>,
        cell: ({ row }) => {
          return (
            <div className="flex items-center space-x-2">
              <EditFlatRateModal
                investment={row.original}
                onSuccess={fetchData}
              />
              <DeleteFlatRateModal
                accountId={row.original.id}
                accountNumber={row.original.name}
                onAccountDeleted={() => {
                  // Refresh the table data
                  window.location.reload();
                }}
              >
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </DeleteFlatRateModal>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 100,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
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
    pageCount: Math.ceil(totalCount / pagination.pageSize),
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

  useEffect(() => {
    fetchData();
  }, [pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter]);

  useEffect(() => {
    setGlobalFilter(debouncedGlobalFilter);
    // Reset to first page when search changes
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedGlobalFilter]);

  const fetchData = async () => {
    if (!isInitialLoad) setLoading(true);
    try {
      const result = await getFlatRateInvestments({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedGlobalFilter || undefined,
      });
      setData(result.data);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Calculate totals from filtered data
  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const totals = filteredData.reduce(
    (acc, investment) => ({
      grossCapital: acc.grossCapital + investment.grossCapital,
      currentValue: acc.currentValue + investment.currentValue,
      totalRedemptions: acc.totalRedemptions + investment.totalRedemptions,
    }),
    {
      grossCapital: 0,
      currentValue: 0,
      totalRedemptions: 0,
    }
  );

  // Get unique statuses for filter dropdown
  const uniqueStatuses = Array.from(new Set(data.map((inv) => inv.status)));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#192473] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Investments</p>
              <p className="text-xl font-semibold">
                {loading ? "-" : filteredData.length}
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
              <p className="text-xs font-medium text-white/60 mb-1">Total Gross Capital</p>
              <p className="text-xl font-semibold">
                {loading ? "-" : formatCurrency(totals.grossCapital)}
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
              <p className="text-xs font-medium text-[#192473]/60 mb-1">Current Value</p>
              <p className="text-xl font-semibold text-[#192473]">
                {loading ? "-" : formatCurrency(totals.currentValue)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#192473]/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#192473]/80" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Redeemed</p>
              <p className="text-xl font-semibold text-red-600">
                {loading ? "-" : formatCurrency(totals.totalRedemptions)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-foreground">
                Investment Accounts
              </h3>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
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
                <span className="text-xs text-muted-foreground">
                  Active filters:
                </span>
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
          <div className="rounded-md border overflow-x-auto">
            <Table className="w-full text-sm">
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

                        {/* Expanded Row for Monthly Data */}
                        {row.getIsExpanded() && (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                              <div className="bg-muted/30 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Calendar className="h-4 w-4" />
                                  <span className="font-medium">
                                    Monthly Performance History -{" "}
                                    {row.original.name}
                                  </span>
                                  <Badge variant="outline">
                                    {row.original.monthlyData.length} months
                                  </Badge>
                                </div>

                                <div className="rounded-md border bg-background max-h-80 overflow-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                      <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-center">
                                          Days
                                        </TableHead>
                                        <TableHead>Beginning Balance</TableHead>
                                        <TableHead>Interest Earned</TableHead>
                                        <TableHead>Ending Balance</TableHead>
                                        <TableHead className="text-center">
                                          Redemptions
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.original.monthlyData.map(
                                        (monthData) => (
                                          <TableRow key={monthData.monthYear}>
                                            <TableCell className="font-medium">
                                              {monthData.monthYear}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {monthData.daysInPeriod}
                                            </TableCell>
                                            <TableCell className="">
                                              {formatCurrency(
                                                monthData.beginningBalance
                                              )}
                                            </TableCell>
                                            <TableCell className=" text-green-600">
                                              {formatCurrency(
                                                monthData.monthlyInterest
                                              )}
                                            </TableCell>
                                            <TableCell className=" text-blue-600 font-medium">
                                              {formatCurrency(
                                                monthData.endingBalance
                                              )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {monthData.redemptions &&
                                              monthData.redemptions > 0 ? (
                                                <span className=" text-red-600">
                                                  -
                                                  {formatCurrency(
                                                    monthData.redemptions
                                                  )}
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground">
                                                  -
                                                </span>
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
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className=" font-bold text-green-600">
                          {formatCurrency(totals.grossCapital)}
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
                        <TableCell className=" font-bold text-blue-600">
                          {formatCurrency(totals.currentValue)}
                        </TableCell>
                        <TableCell className=" font-bold">
                          {totals.totalRedemptions > 0 ? (
                            <span className="text-red-600">
                              -{formatCurrency(totals.totalRedemptions)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
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
    </div>
  );
}
