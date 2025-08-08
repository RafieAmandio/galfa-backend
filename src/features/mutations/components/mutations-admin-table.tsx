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
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Mutation } from "../actions/get-all-mutations";

// Custom filter functions
const numberRangeFilter = (
  row: Row<Mutation>,
  columnId: string,
  value: [number?, number?]
) => {
  const [min, max] = value;
  const cellValueRaw = row.getValue(columnId);

  if (cellValueRaw === null || cellValueRaw === undefined) return true;

  const cellValue = Number(cellValueRaw);
  if (isNaN(cellValue)) return true;

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
  row: Row<Mutation>,
  columnId: string,
  value: [string?, string?]
) => {
  const [from, to] = value;
  const cellValueRaw = row.getValue(columnId);

  if (!cellValueRaw) return true;

  try {
    const cellValue = new Date(cellValueRaw as Date | string);
    if (isNaN(cellValue.getTime())) return true;

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
  } catch (error) {
    return true;
  }
};

export function MutationsAdminTable({ mutations }: { mutations: Mutation[] }) {
  const [data] = useState<Mutation[]>(mutations);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "-";
      return format(dateObj, "d MMMM yyyy");
    } catch (error) {
      return "-";
    }
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "-";
      return format(dateObj, "d MMMM yyyy HH:mm");
    } catch (error) {
      return "-";
    }
  };

  // Helper function to get column display name
  const getColumnDisplayName = (columnId: string) => {
    const displayNames: Record<string, string> = {
      id: "ID",
      type: "Type",
      amount: "Amount",
      description: "Description",
      status: "Status",
      transaction_date: "Transaction Date",
      created_at: "Created At",
      updated_at: "Updated At",
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
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={min ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    column.setFilterValue([
                      value === "" ? undefined : Number(value),
                      max,
                    ]);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  placeholder="Max"
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
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <Label>Filter {getColumnDisplayName(column.id)}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={from ?? ""}
                  onChange={(e) => {
                    column.setFilterValue([e.target.value, to]);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={to ?? ""}
                  onChange={(e) => {
                    column.setFilterValue([from, e.target.value]);
                  }}
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

  const TypeFilter = ({ column }: { column: any }) => {
    const uniqueTypes = Array.from(
      new Set(data.map((mutation) => mutation.type))
    );

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
            <Select
              value={(column.getFilterValue() as string) ?? ""}
              onValueChange={(value) => column.setFilterValue(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {column.getFilterValue() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => column.setFilterValue("")}
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

  const StatusFilter = ({ column }: { column: any }) => {
    const uniqueStatuses = Array.from(
      new Set(data.map((mutation) => mutation.status))
    );

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
            <Select
              value={(column.getFilterValue() as string) ?? ""}
              onValueChange={(value) => column.setFilterValue(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
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
                onClick={() => column.setFilterValue("")}
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
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      pending: { variant: "secondary", label: "Pending" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
      cancelled: { variant: "outline", label: "Cancelled" },
    };

    const config = statusConfig[status.toLowerCase()] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      deposit: { variant: "default", label: "Deposit" },
      withdrawal: { variant: "destructive", label: "Withdrawal" },
      transfer: { variant: "secondary", label: "Transfer" },
      fee: { variant: "outline", label: "Fee" },
      interest: { variant: "default", label: "Interest" },
    };

    const config = typeConfig[type.toLowerCase()] || {
      variant: "outline",
      label: type,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = useMemo<ColumnDef<Mutation>[]>(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              ID
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
          <div className="font-mono text-sm">#{getValue() as number}</div>
        ),
        filterFn: numberRangeFilter,
      },

      {
        accessorKey: "type",
        header: ({ column }) => (
          <div className="flex items-center">
            <span className="font-semibold">Type</span>
            <TypeFilter column={column} />
          </div>
        ),
        cell: ({ getValue }) => getTypeBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Amount
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
          <div className="font-mono text-right font-medium">
            {formatCurrency(Number(getValue()))}
          </div>
        ),
        filterFn: numberRangeFilter,
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <div className="flex items-center">
            <span className="font-semibold">Description</span>
            <TextFilter column={column} />
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="max-w-[200px] truncate" title={getValue() as string}>
            {(getValue() as string) || "-"}
          </div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <div className="flex items-center">
            <span className="font-semibold">Status</span>
            <StatusFilter column={column} />
          </div>
        ),
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
        filterFn: "equals",
      },
      {
        accessorKey: "transaction_date",
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
          <div className="text-sm">
            {formatDate(getValue() as Date | string | null)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 font-semibold"
            >
              Created At
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
          <div className="text-sm">
            {formatDateTime(getValue() as Date | string | null)}
          </div>
        ),
        filterFn: dateRangeFilter,
      },
    ],
    [data]
  );

  const table = useReactTable({
    data,
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
    (acc, mutation) => ({
      totalAmount: acc.totalAmount + Number(mutation.amount),
      totalMutations: acc.totalMutations + 1,
    }),
    {
      totalAmount: 0,
      totalMutations: 0,
    }
  );

  // Get active filters for display
  const activeFilters = table
    .getState()
    .columnFilters.filter(
      (filter) => filter.value !== undefined && filter.value !== ""
    );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Mutations
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalMutations}</div>
            <p className="text-xs text-muted-foreground">
              {filteredData.length} of {data.length} mutations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined transaction value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Active filters:
              </span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {getColumnDisplayName(filter.id)}: {String(filter.value)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => {
                      table.getColumn(filter.id)?.setFilterValue(undefined);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  table.resetColumnFilters();
                  setGlobalFilter("");
                }}
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mutations</CardTitle>
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
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
