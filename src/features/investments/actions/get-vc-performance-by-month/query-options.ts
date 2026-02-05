import { queryOptions } from "@tanstack/react-query";
import { getVCPerformanceByMonth } from "../get-vc-performance-by-month";

export const getVCPerformanceByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["vc-performance-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getVCPerformanceByMonth(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
