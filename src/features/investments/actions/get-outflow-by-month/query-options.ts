import { queryOptions } from "@tanstack/react-query";
import { getOutflowByMonth } from "../get-outflow-by-month";

export const getOutflowByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["outflow-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getOutflowByMonth(month),
  });
