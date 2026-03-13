import { queryOptions } from "@tanstack/react-query";
import { adminGetAllCapitalMarketAccounts } from ".";

export const adminGetAllCapitalMarketAccountsQueryOptions = ({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
} = {}) =>
  queryOptions({
    queryKey: ["all-capital-market-accounts", page, pageSize],
    queryFn: () => adminGetAllCapitalMarketAccounts({ page, pageSize }),
  });
