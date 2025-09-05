import { queryOptions } from "@tanstack/react-query";
import { getInstallmentCoFByMonth } from ".";

export const getInstallmentCoFByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["installment-cof-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getInstallmentCoFByMonth(month),
  });
