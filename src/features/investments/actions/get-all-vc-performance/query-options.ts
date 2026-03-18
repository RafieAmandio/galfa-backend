import { queryOptions } from "@tanstack/react-query";
import { getAllVCPerformance } from "./index";

export const getAllVCPerformanceQueryOptions = ({
  page = 1,
  pageSize = 12,
}: {
  page?: number;
  pageSize?: number;
} = {}) =>
  queryOptions({
    queryKey: ["all-vc-performance", page, pageSize],
    queryFn: () => getAllVCPerformance({ page, pageSize }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
