import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateInvestments } from "../get-floating-rate-investments";

export const getFloatingRateInvestmentsQueryOptions = () =>
  queryOptions({
    queryKey: ["floating-rate-investments"],
    queryFn: () => getFloatingRateInvestments(),
  });
