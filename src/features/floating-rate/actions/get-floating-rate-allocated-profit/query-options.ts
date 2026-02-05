import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateAllocatedProfit } from ".";

export const getFloatingRateAllocatedProfitQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: [
      "floating-rate-allocated-profit",
      month.toISOString().split("T")[0],
    ],
    queryFn: () => getFloatingRateAllocatedProfit(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
