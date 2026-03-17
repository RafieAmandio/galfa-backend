"use client";

import React, {
  useMemo,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  PaginationState,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  UsersIcon,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Calendar,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGetAllCapitalMarketAccountsQueryOptions } from "../actions/admin-get-all-capital-market-accounts/query-options";
import { CapitalMarketPerformanceTable } from "./capital-market-performance-table";
import { CreateCapitalMarketPerformanceModal } from "./create-capital-market-performance-modal";

interface CapitalMarketAccount {
  id: number;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  user_name: string | null;
  user_email: string | null;
}

// Custom filter function for date ranges
const dateRangeFilter = (
  row: Row<CapitalMarketAccount>,
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

export const AdminCapitalMarketAccountsTable = forwardRef<
  { refresh: () => void },
  {}
>((props, ref) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [globalFilterInput, setGlobalFilterInput] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilterInput, 300);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const formatDate = (date: Date) => {
    return format(new Date(date), "d MMMM yyyy");
  };

  const queryClient = useQueryClient();

  const {
    data: accountsResponse,
    isLoading,
    error,
  } = useQuery(
    adminGetAllCapitalMarketAccountsQueryOptions({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedGlobalFilter || undefined,
    })
  );

  useEffect(() => {
    setGlobalFilter(debouncedGlobalFilter);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedGlobalFilter]);

  const accountsData = accountsResponse?.data;
  const totalCount = accountsResponse?.totalCount ?? 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      user_name: "User Name",
      user_email: "User Email",
      created_at: "Created Date",
      updated_at: "Last Updated",
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
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={from || ""}
                  onChange={(e) => column.setFilterValue([e.target.value, to])}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={to || ""}
                  onChange={(e) =>
                    column.setFilterValue([from, e.target.value])
                  }
                />
              </div>
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
  const columns = useMemo<ColumnDef<CapitalMarketAccount>[]>(
    () => [
      {
        accessorKey: "id",
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
                Account ID
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          );
        },
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-500">#{getValue() as number}</div>
        ),
      },
      {
        accessorKey: "user_name",
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
                User Name
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
          <div className="font-medium">
            {(getValue() as string) || "Unknown User"}
          </div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "user_email",
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
                User Email
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
          <div className="text-sm text-gray-600">
            {(getValue() as string) || "No email available"}
          </div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "created_at",
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
                Created Date
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
          <div className="text-sm text-gray-600">
            {formatDate(getValue() as Date)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "updated_at",
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
                Last Updated
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
          <div className="text-sm text-gray-600">
            {formatDate(getValue() as Date)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const account = row.original;
          return (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] flex flex-col w-auto min-w-[400px] max-w-[90vw] sm:max-w-[90vw]">
                <DialogHeader>
                  <DialogTitle>{account.user_name} Capital Market</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="flex justify-end">
                    <CreateCapitalMarketPerformanceModal
                      userId={account.user_id}
                    />
                  </div>
                  <CapitalMarketPerformanceTable userId={account.user_id} />
                </div>
              </DialogContent>
            </Dialog>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: accountsData ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    manualPagination: true,
    pageCount,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-capital-market-accounts"],
      });
    },
  }));

  const filteredData = accountsData ?? [];

  if (isLoading) {
    return (
      <div className="bg-white border border-border rounded-xl p-12 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading capital market accounts...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#192473] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">Total Accounts</p>
              <p className="text-xl font-semibold">{totalCount}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <UsersIcon className="h-4 w-4 text-white/80" />
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
                Account List
              </h3>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["all-capital-market-accounts"],
                  })
                }
                variant="outline"
                size="sm"
              >
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
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
                  ))
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
              Showing {filteredData.length} of {totalCount} total accounts.
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
});
