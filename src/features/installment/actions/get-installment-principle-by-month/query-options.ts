import { queryOptions } from "@tanstack/react-query";
import { getInstallmentPrincipleByMonth } from ".";

export const getInstallmentPrincipleByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: [
      "installment-principle-by-month",
      month.toISOString().split("T")[0],
    ],
    queryFn: () => getInstallmentPrincipleByMonth(month),
  });
