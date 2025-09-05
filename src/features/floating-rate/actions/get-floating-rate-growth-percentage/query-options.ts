import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateGrowthPercentage } from ".";

export const getFloatingRateGrowthPercentageQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: [
      "floating-rate-growth-percentage",
      month.toISOString().split("T")[0],
    ],
    queryFn: () => getFloatingRateGrowthPercentage(month),
  });
