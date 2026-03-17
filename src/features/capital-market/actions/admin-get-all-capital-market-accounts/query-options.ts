import { queryOptions } from "@tanstack/react-query";
import { adminGetAllCapitalMarketAccounts } from ".";

export const adminGetAllCapitalMarketAccountsQueryOptions = ({
  page = 1,
  pageSize = 10,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) =>
  queryOptions({
    queryKey: ["all-capital-market-accounts", page, pageSize, search],
    queryFn: () => adminGetAllCapitalMarketAccounts({ page, pageSize, search }),
  });
