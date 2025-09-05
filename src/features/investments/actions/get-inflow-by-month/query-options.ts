import { queryOptions } from "@tanstack/react-query";
import { getInflowByMonth } from "../get-inflow-by-month";

export const getInflowByMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["inflow-by-month", month.toISOString().split("T")[0]],
    queryFn: () => getInflowByMonth(month),
  });
