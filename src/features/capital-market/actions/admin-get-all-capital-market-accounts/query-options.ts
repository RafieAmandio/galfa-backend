import { queryOptions } from "@tanstack/react-query";
import { adminGetAllCapitalMarketAccounts } from ".";

export const adminGetAllCapitalMarketAccountsQueryOptions = () =>
  queryOptions({
    queryKey: ["all-capital-market-accounts"],
    queryFn: () => adminGetAllCapitalMarketAccounts(),
  });
