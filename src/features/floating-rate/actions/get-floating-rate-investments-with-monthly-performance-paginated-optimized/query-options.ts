import { useQuery } from "@tanstack/react-query";
import { getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimized } from "./index";

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

export function getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimizedQueryOptions(
  params: PaginationParams = {}
) {
  return {
    queryKey: [
      "floating-rate-investments-monthly-performance-paginated-optimized",
      params,
    ],
    queryFn: () =>
      getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimized(
        params
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  };
}
