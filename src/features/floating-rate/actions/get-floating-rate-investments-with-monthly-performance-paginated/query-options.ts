import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { getFloatingRateInvestmentsWithMonthlyPerformancePaginated } from ".";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getFloatingRateInvestmentsWithMonthlyPerformancePaginatedQueryOptions =
  (params: PaginationParams = {}) =>
    queryOptions({
      queryKey: [
        "floating-rate-investments-monthly-performance-paginated",
        params.page || 1,
        params.limit || 10,
        params.sortBy || "transaction_date",
        params.sortOrder || "desc",
        params.search || "",
        params.status || "",
        params.dateFrom || "",
        params.dateTo || "",
      ],
      queryFn: () =>
        getFloatingRateInvestmentsWithMonthlyPerformancePaginated(params),
      placeholderData: keepPreviousData, // Keep previous data while fetching new page
    });
