"use server";

import { getFloatingRateInvestmentsWithMonthlyPerformancePaginated } from "../get-floating-rate-investments-with-monthly-performance-paginated";
import { getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimized } from "../get-floating-rate-investments-with-monthly-performance-paginated-optimized";

interface PerformanceComparisonResult {
  success: boolean;
  message?: string;
  data?: {
    original: {
      executionTime: number;
      queryCount: number;
      memoryUsage: number;
    };
    optimized: {
      executionTime: number;
      queryCount: number;
      memoryUsage: number;
    };
    improvements: {
      timeImprovement: number;
      queryReduction: number;
      memoryImprovement: number;
    };
  };
}

/**
 * Compare performance between original and optimized pagination queries
 */
export async function comparePaginationPerformance(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}
): Promise<PerformanceComparisonResult> {
  try {
    const testParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || "",
      status: params.status || "",
      sortBy: "transaction_date",
      sortOrder: "desc" as const,
    };

    console.log("🚀 Starting performance comparison...");
    console.log("Test parameters:", testParams);

    // Test original implementation
    console.log("📊 Testing original implementation...");
    const originalStartTime = performance.now();
    const originalStartMemory = process.memoryUsage();

    const originalResult =
      await getFloatingRateInvestmentsWithMonthlyPerformancePaginated(
        testParams
      );

    const originalEndTime = performance.now();
    const originalEndMemory = process.memoryUsage();
    const originalExecutionTime = originalEndTime - originalStartTime;
    const originalMemoryUsage =
      originalEndMemory.heapUsed - originalStartMemory.heapUsed;

    // Test optimized implementation
    console.log("⚡ Testing optimized implementation...");
    const optimizedStartTime = performance.now();
    const optimizedStartMemory = process.memoryUsage();

    const optimizedResult =
      await getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimized(
        testParams
      );

    const optimizedEndTime = performance.now();
    const optimizedEndMemory = process.memoryUsage();
    const optimizedExecutionTime = optimizedEndTime - optimizedStartTime;
    const optimizedMemoryUsage =
      optimizedEndMemory.heapUsed - optimizedStartMemory.heapUsed;

    // Calculate improvements
    const timeImprovement =
      ((originalExecutionTime - optimizedExecutionTime) /
        originalExecutionTime) *
      100;
    const memoryImprovement =
      ((originalMemoryUsage - optimizedMemoryUsage) / originalMemoryUsage) *
      100;

    const comparison = {
      original: {
        executionTime: Math.round(originalExecutionTime),
        queryCount: 0, // This would need to be tracked in the actual implementation
        memoryUsage: Math.round(originalMemoryUsage / 1024 / 1024), // MB
      },
      optimized: {
        executionTime: Math.round(optimizedExecutionTime),
        queryCount: 0, // This would need to be tracked in the actual implementation
        memoryUsage: Math.round(optimizedMemoryUsage / 1024 / 1024), // MB
      },
      improvements: {
        timeImprovement: Math.round(timeImprovement),
        queryReduction: 0, // This would need to be tracked
        memoryImprovement: Math.round(memoryImprovement),
      },
    };

    console.log("📈 Performance Comparison Results:");
    console.log(
      "Original execution time:",
      comparison.original.executionTime,
      "ms"
    );
    console.log(
      "Optimized execution time:",
      comparison.optimized.executionTime,
      "ms"
    );
    console.log(
      "Time improvement:",
      comparison.improvements.timeImprovement,
      "%"
    );
    console.log(
      "Memory improvement:",
      comparison.improvements.memoryImprovement,
      "%"
    );

    return {
      success: true,
      data: comparison,
    };
  } catch (error) {
    console.error("Performance comparison error:", error);
    return {
      success: false,
      message: "Failed to compare performance",
    };
  }
}
