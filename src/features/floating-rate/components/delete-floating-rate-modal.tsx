"use client";

import { useState, useEffect } from "react";
import { useEffectEvent } from "@/lib/hooks/useEffectEvent";
import { useActionState, startTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/buttons/submit-button";
import { deleteFloatingRateAccount } from "../actions/delete-floating-rate-account";
import { cn } from "@/lib/utils";

interface DeleteFloatingRateModalProps {
  accountId: number;
  accountNumber: string;
  onAccountDeleted?: () => void;
  children: React.ReactNode;
}

function FieldError({ error }: { error?: string }) {
  return <p className="text-sm text-red-600 mt-1">{error}</p>;
}

export function DeleteFloatingRateModal({
  accountId,
  accountNumber,
  onAccountDeleted,
  children,
}: DeleteFloatingRateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionState, actionDispatch, isActionPending] = useActionState(
    deleteFloatingRateAccount,
    undefined
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const getFieldError = (fieldName: string) => {
    return actionState?.errors?.find((error: any) => error.field === fieldName)
      ?.message;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const formData = new FormData();
      formData.append("accountId", accountId.toString());
      actionDispatch(formData);
    });
  };

  const actionEffectEvent = useEffectEvent((state: typeof actionState) => {
    if (state) {
      if (state.success && state.message) {
        setTimeout(() => {
          setIsOpen(false);
          onAccountDeleted?.();
        }, 200);
      } else if (state.errors && state.errors.length > 0) {
        setTimeout(() => {
          const firstError = state.errors[0];
          const errorField = document.getElementById(firstError.field);
          if (errorField) {
            errorField.scrollIntoView({ behavior: "smooth", block: "center" });
            (errorField as HTMLElement).focus();
          }
        }, 100);
      }
    }
  });

  useEffect(
    () => actionEffectEvent(actionState),
    [actionState, actionEffectEvent]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Delete Floating Rate Account</DialogTitle>
        </DialogHeader>

        <div className="px-2">
          {actionState?.message && (
            <div
              className={cn(
                "p-3 rounded-md text-sm flex-shrink-0",
                actionState.success
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              )}
            >
              {actionState.message}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-2">
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
                  Are you sure?
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    This will permanently delete account{" "}
                    <strong>{accountNumber}</strong> and all related records
                    including:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All mutations associated with this account</li>
                    <li>The floating rate account details</li>
                    <li>The main account record</li>
                  </ul>
                  <p className="mt-2 font-semibold">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <input type="hidden" name="accountId" value={accountId} />
          <FieldError error={getFieldError("accountId")} />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton loading={isActionPending}>Delete</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
