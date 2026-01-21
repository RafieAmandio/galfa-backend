"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TimingEntry {
  label: string;
  duration: number;
  details?: string;
}

interface DebugResult {
  totalDuration: number;
  timings: TimingEntry[];
  investmentCount: number;
  monthsProcessed: number;
  growthRateQueries: number;
  redemptionQueries: number;
  error?: string;
}

export function FloatingRatePerformanceDebug({
  userEmail,
}: {
  userEmail: string;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/debug/floating-rate-performance?email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        totalDuration: 0,
        timings: [],
        investmentCount: 0,
        monthsProcessed: 0,
        growthRateQueries: 0,
        redemptionQueries: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">
        Floating Rate Performance Debug
      </h1>
      <p className="text-gray-600 mb-6">
        Diagnose performance issues with floating rate investment data loading.
      </p>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Run Diagnostic</h2>
            <p className="text-sm text-gray-500">
              Testing for user: <code className="bg-gray-100 px-1">{userEmail}</code>
            </p>
          </div>
          <Button onClick={runDiagnostic} disabled={isRunning}>
            {isRunning ? "Running..." : "Run Diagnostic"}
          </Button>
        </div>

        {isRunning && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-blue-800">
              Running performance diagnostic... This may take a while if there
              are many investments.
            </span>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          {result.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{result.error}</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Duration</p>
                    <p
                      className={`text-2xl font-bold ${
                        result.totalDuration > 5000
                          ? "text-red-600"
                          : result.totalDuration > 2000
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {(result.totalDuration / 1000).toFixed(2)}s
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Investments</p>
                    <p className="text-2xl font-bold">{result.investmentCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Months Processed</p>
                    <p className="text-2xl font-bold">{result.monthsProcessed}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Growth Rate Queries</p>
                    <p
                      className={`text-2xl font-bold ${
                        result.growthRateQueries > 50
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {result.growthRateQueries}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Redemption Queries</p>
                    <p className="text-2xl font-bold">
                      {result.redemptionQueries}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Avg per Investment</p>
                    <p className="text-2xl font-bold">
                      {result.investmentCount > 0
                        ? (
                            result.totalDuration / result.investmentCount
                          ).toFixed(0)
                        : 0}
                      ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Performance Analysis
                </h2>
                {result.growthRateQueries > 20 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <h4 className="font-semibold text-red-800">
                      N+1 Query Problem Detected
                    </h4>
                    <p className="text-red-700 text-sm mt-1">
                      {result.growthRateQueries} growth rate queries were made.
                      This is likely causing the slowdown. The system is making
                      one database query per month of investment history instead
                      of batching them.
                    </p>
                  </div>
                )}
                {result.totalDuration > 5000 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                    <h4 className="font-semibold text-yellow-800">
                      Slow Response Time
                    </h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Total load time exceeded 5 seconds. Consider optimizing
                      the growth rate calculation by pre-fetching all rates in a
                      single query.
                    </p>
                  </div>
                )}
                {result.totalDuration < 2000 &&
                  result.growthRateQueries < 20 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                      <h4 className="font-semibold text-green-800">
                        Performance OK
                      </h4>
                      <p className="text-green-700 text-sm mt-1">
                        Load time is acceptable and query count is reasonable.
                      </p>
                    </div>
                  )}
              </div>

              {/* Timing Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Timing Breakdown</h2>
                <div className="space-y-2">
                  {result.timings.map((timing, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{timing.label}</p>
                        {timing.details && (
                          <p className="text-sm text-gray-500">
                            {timing.details}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono ${
                            timing.duration > 1000
                              ? "text-red-600 font-bold"
                              : timing.duration > 500
                                ? "text-yellow-600"
                                : "text-gray-600"
                          }`}
                        >
                          {timing.duration.toFixed(0)}ms
                        </span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className={`h-2 rounded-full ${
                              timing.duration > 1000
                                ? "bg-red-500"
                                : timing.duration > 500
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min((timing.duration / result.totalDuration) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
                <ul className="space-y-3">
                  {result.growthRateQueries > 20 && (
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">1.</span>
                      <div>
                        <p className="font-medium">
                          Batch Growth Rate Queries
                        </p>
                        <p className="text-sm text-gray-600">
                          The investor view makes{" "}
                          {result.growthRateQueries} individual queries for
                          growth rates. These should be batched into a single
                          query like the admin view does.
                        </p>
                      </div>
                    </li>
                  )}
                  {result.monthsProcessed > 24 && (
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 font-bold">2.</span>
                      <div>
                        <p className="font-medium">
                          Consider Pagination for Monthly Data
                        </p>
                        <p className="text-sm text-gray-600">
                          Processing {result.monthsProcessed} months of data.
                          Consider lazy-loading older months or implementing
                          pagination.
                        </p>
                      </div>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">3.</span>
                    <div>
                      <p className="font-medium">Enable Caching</p>
                      <p className="text-sm text-gray-600">
                        Growth rates rarely change. Implementing a cache layer
                        could significantly reduce database load.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
