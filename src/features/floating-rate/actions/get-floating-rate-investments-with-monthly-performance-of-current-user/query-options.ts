import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUser } from ".";

export const getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUserQueryOptions =
  () =>
    queryOptions({
      queryKey: ["current-user-floating-rate-investments-monthly-performance"],
      queryFn: () =>
        getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUser(),
    });
