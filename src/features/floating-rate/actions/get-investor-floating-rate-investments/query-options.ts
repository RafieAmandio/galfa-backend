import { queryOptions } from "@tanstack/react-query";
import { getInvestorFloatingRateInvestments } from ".";

export const getInvestorFloatingRateInvestmentsQueryOptions = (
  investorEmail: string
) =>
  queryOptions({
    queryKey: ["investor-floating-rate-investments", investorEmail],
    queryFn: () => getInvestorFloatingRateInvestments(investorEmail),
  });
