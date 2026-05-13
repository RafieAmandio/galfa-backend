"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { bulkDeleteAccounts } from "@/features/admin/actions/bulk-delete-accounts";

interface SelectedAccount {
  id: number;
  accountNumber: string;
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: "flat-rate" | "floating-rate" | "installment";
  selectedAccounts: SelectedAccount[];
  onDeleteComplete: () => void;
}

const typeLabels: Record<string, string> = {
  "flat-rate": "Flat Rate",
  "floating-rate": "Floating Rate",
  installment: "Installment",
};

export function BulkDeleteModal({
  isOpen,
  onClose,
  accountType,
  selectedAccounts,
  onDeleteComplete,
}: BulkDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof bulkDeleteAccounts>
  > | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await bulkDeleteAccounts(
        selectedAccounts.map((a) => a.id),
        accountType
      );
      setResult(res);
    } catch {
      setResult({
        success: false,
        totalDeleted: 0,
        totalFailed: selectedAccounts.length,
        results: [
          {
            accountId: 0,
            accountNumber: "",
            success: false,
            message: "An unexpected error occurred",
          },
        ],
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (result && result.totalDeleted > 0) {
      onDeleteComplete();
    }
    setResult(null);
    setShowDetails(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            Delete {typeLabels[accountType]} Accounts
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 px-2">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Are you sure you want to delete{" "}
                    <strong>{selectedAccounts.length}</strong> account
                    {selectedAccounts.length > 1 ? "s" : ""}?
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      This will permanently delete the following accounts and
                      all related records (mutations, account details):
                    </p>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded border border-red-200 bg-white p-2">
                      <ul className="space-y-1 text-xs">
                        {selectedAccounts.map((a) => (
                          <li key={a.id} className="font-mono">
                            {a.accountNumber}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="mt-2 font-semibold">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedAccounts.length} Account${selectedAccounts.length > 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {result.totalDeleted}
                </div>
                <div className="text-xs text-green-600">Deleted</div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-700">
                  {result.totalFailed}
                </div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
            </div>

            {result.results.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Hide" : "Show"} Details
                </Button>
                {showDetails && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded border p-2 text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-1 pr-2">Account</th>
                          <th className="pb-1 pr-2">Status</th>
                          <th className="pb-1">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results
                          .filter((r) => r.accountNumber)
                          .map((r, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1 pr-2 font-mono">
                                {r.accountNumber}
                              </td>
                              <td className="py-1 pr-2">
                                {r.success ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                                )}
                              </td>
                              <td className="py-1 text-muted-foreground">
                                {r.message}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
