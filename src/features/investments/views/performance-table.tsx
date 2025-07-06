"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAllVCPerformance } from "../actions/get-all-vc-performance";
import { CreateVCPerformanceModal } from "../components/create-vc-performance-modal";
import { EditVCPerformanceModal } from "../components/edit-vc-performance-modal";
import { format } from "date-fns";
import { TrendingUp, DollarSign, Calendar, RefreshCw } from "lucide-react";

interface PerformanceRecord {
  id: number;
  date: Date;
  aum: number;
  profitTaken: number;
  createdAt: Date;
  updatedAt: Date;
}

export function PerformanceTable() {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVCPerformanceRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllVCPerformance();

      if (result.success && result.data) {
        setRecords(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Error loading performance records:", err);
      setError("Failed to load performance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVCPerformanceRecords();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "MMM dd, yyyy HH:mm");
  };

  const getMonthYear = (date: Date) => {
    return format(new Date(date), "MMMM yyyy");
  };

  // Group records by month to identify duplicates
  const groupedByMonth = records.reduce((acc, record) => {
    const monthKey = format(new Date(record.date), "yyyy-MM");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(record);
    return acc;
  }, {} as Record<string, PerformanceRecord[]>);

  const getDuplicateMonths = () => {
    return Object.entries(groupedByMonth)
      .filter(([_, records]) => records.length > 1)
      .map(([monthKey, _]) => monthKey);
  };

  const duplicateMonths = getDuplicateMonths();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Performance Records
            </h1>
            <p className="text-gray-600">
              Manage and view all Assets Under Management (AUM) and Profit Taken
              records
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <CreateVCPerformanceModal onSuccess={loadVCPerformanceRecords} />
            <Button
              onClick={loadVCPerformanceRecords}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Records
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {records.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Latest AUM</p>
                <p className="text-lg font-bold text-gray-900">
                  {records.length > 0 ? formatCurrency(records[0].aum) : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Latest Profit
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {records.length > 0
                    ? formatCurrency(records[0].profitTaken)
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Month Warning */}
      {duplicateMonths.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-sm font-medium">
                Duplicate Records Warning
              </p>
              <p className="text-red-600 text-sm mt-1">
                Multiple records found for:{" "}
                {duplicateMonths
                  .map((month) => format(new Date(month + "-01"), "MMMM yyyy"))
                  .join(", ")}
                . Each month should have only one record.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance records...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Records Table */}
      {!loading && !error && records.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Performance Records ({records.length} total)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Month/Year</TableHead>
                  <TableHead className="text-right">
                    Assets Under Management
                  </TableHead>
                  <TableHead className="text-right">Profit Taken</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const monthKey = format(new Date(record.date), "yyyy-MM");
                  const isDuplicate = groupedByMonth[monthKey]?.length > 1;

                  return (
                    <TableRow
                      key={record.id}
                      className={isDuplicate ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium">{record.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getMonthYear(record.date)}
                          </span>
                          {isDuplicate && (
                            <span className="text-xs text-red-600 font-medium">
                              Duplicate Month
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.aum)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.profitTaken)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(record.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(record.updatedAt)}
                      </TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Valid
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EditVCPerformanceModal
                          record={record}
                          onSuccess={loadVCPerformanceRecords}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && records.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Performance Records
          </h3>
          <p className="text-gray-500 mb-4">
            No performance records have been created yet. Add your first record
            to get started.
          </p>
        </div>
      )}
    </div>
  );
}
