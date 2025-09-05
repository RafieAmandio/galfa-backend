import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateInvestmentsWithMonthlyPerformance } from ".";

export const getFloatingRateInvestmentsWithMonthlyPerformanceQueryOptions =
  () =>
    queryOptions({
      queryKey: ["floating-rate-investments-monthly-performance"],
      queryFn: () => getFloatingRateInvestmentsWithMonthlyPerformance(),
    });
