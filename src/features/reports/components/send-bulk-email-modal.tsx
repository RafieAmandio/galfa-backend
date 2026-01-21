"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface BulkSendResult {
  success: boolean;
  message: string;
  totalInvestors: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
}

interface SendBulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalInvestors: number;
}

export function SendBulkEmailModal({
  isOpen,
  onClose,
  totalInvestors,
}: SendBulkEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<BulkSendResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bulk: true }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send emails",
        totalInvestors: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setShowDetails(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Reports to All Investors
          </DialogTitle>
          <DialogDescription>
            Send investment portfolio reports to all investors with active
            investments.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!result && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Bulk Email Confirmation
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This will send individual report emails to{" "}
                    <strong>{totalInvestors}</strong> investor
                    {totalInvestors !== 1 ? "s" : ""}. This action may take some
                    time to complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 ${
                  result.failedCount === 0
                    ? "bg-green-50 border border-green-200"
                    : result.successCount === 0
                      ? "bg-red-50 border border-red-200"
                      : "bg-amber-50 border border-amber-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.failedCount === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : result.successCount === 0 ? (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{result.message}</p>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span>{" "}
                        <span className="font-medium">
                          {result.totalInvestors}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600">Success:</span>{" "}
                        <span className="font-medium text-green-700">
                          {result.successCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-600">Failed:</span>{" "}
                        <span className="font-medium text-red-700">
                          {result.failedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {result.results.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full justify-between"
                  >
                    <span>
                      {showDetails ? "Hide Details" : "Show Details"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.results.length} entries
                    </span>
                  </Button>

                  {showDetails && (
                    <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              Email
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.results.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 truncate max-w-[200px]">
                                {item.email}
                              </td>
                              <td className="px-3 py-2">
                                {item.success ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    Sent
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-red-600"
                                    title={item.error}
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send to All ({totalInvestors})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
