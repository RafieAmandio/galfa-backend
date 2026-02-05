import { queryOptions } from "@tanstack/react-query";
import { getFloatingRatePrincipleByMonth } from ".";

export const getFloatingRatePrincipleByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: [
      "floating-rate-principle-by-month",
      month.toISOString().split("T")[0],
    ],
    queryFn: () => getFloatingRatePrincipleByMonth(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
