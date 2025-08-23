import { queryOptions } from "@tanstack/react-query";
import { getCapitalMarketPerformanceByUserId } from ".";

export const getCapitalMarketPerformanceByUserIdQueryOptions = (
  userId: string
) =>
  queryOptions({
    queryKey: ["capital-market-performance", userId],
    queryFn: () => getCapitalMarketPerformanceByUserId(userId),
  });
