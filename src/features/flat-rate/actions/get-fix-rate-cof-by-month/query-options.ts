import { queryOptions } from "@tanstack/react-query";
import { getFixRateCoFByMonth } from ".";

export const getFixRateCoFByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["fix-rate-cof-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getFixRateCoFByMonth(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
