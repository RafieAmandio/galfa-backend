import { queryOptions } from "@tanstack/react-query";
import { getGrossProfitByMonth } from "../get-gross-profit-by-month";

export const getGrossProfitByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["gross-profit-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getGrossProfitByMonth(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
