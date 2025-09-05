import { queryOptions } from "@tanstack/react-query";
import { getFloatingRateAccountsForRedemption } from ".";

export const getFloatingRateAccountsForRedemptionQueryOptions = (date: Date) =>
  queryOptions({
    queryKey: [
      "floating-rate-accounts-for-redemption",
      date.toISOString().split("T")[0],
    ],
    queryFn: () => getFloatingRateAccountsForRedemption(date),
  });
