import { queryOptions } from "@tanstack/react-query";
import { getAllInvestors } from ".";

export const getAllInvestorsQueryOptions = () =>
  queryOptions({
    queryKey: ["all-investors"],
    queryFn: () => getAllInvestors(),
  });
