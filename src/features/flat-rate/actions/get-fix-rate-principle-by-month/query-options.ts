import { queryOptions } from "@tanstack/react-query";
import { getFixRatePrincipleByMonth } from "../get-fix-rate-principle-by-month";

export const getFixRatePrincipleByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: [
      "fix-rate-principle-by-month",
      month.toISOString().split("T")[0],
    ],
    queryFn: () => getFixRatePrincipleByMonth(month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
