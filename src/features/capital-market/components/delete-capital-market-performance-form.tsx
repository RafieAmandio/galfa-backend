"use client";

import { Button } from "@/components/ui/button";
import { useActionState, startTransition, useEffect, FormEvent } from "react";
import { useEffectEvent } from "@/lib/hooks/useEffectEvent";
import { SubmitButton } from "@/components/buttons/submit-button";
import { deleteCapitalMarketPerformance } from "../actions/delete-capital-market-performance";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getCapitalMarketPerformanceByUserIdQueryOptions } from "../actions/get-capital-market-performance-by-user-id/query-options";

export function DeleteCapitalMarketPerformanceForm({
  onCancel,
  userId,
  performanceId,
}: {
  onCancel: () => void;
  userId: string;
  performanceId: number;
}) {
  const queryClient = useQueryClient();
  const [actionState, actionDispatch, isActionPending] = useActionState(
    deleteCapitalMarketPerformance,
    undefined
  );

  const actionEffectEvent = useEffectEvent((state: typeof actionState) => {
    if (!state) return;
    if (state.success) {
      // Invalidate performance list for this user
      queryClient.invalidateQueries(
        getCapitalMarketPerformanceByUserIdQueryOptions(userId)
      );
      // Close dialog
      onCancel();
    }
  });

  useEffect(() => {
    actionEffectEvent(actionState);
  }, [actionState, actionEffectEvent]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const fd = new FormData();
      fd.append("performanceId", String(performanceId));
      actionDispatch(fd);
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {actionState?.message && (
        <div
          className={cn(
            "p-3 rounded-md text-sm",
            actionState.success
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {actionState.message}
        </div>
      )}

      <p>
        Are you sure you want to delete this capital market performance record?
        This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <SubmitButton
          className="bg-red-600 hover:bg-red-700"
          loading={isActionPending}
          disabled={isActionPending}
        >
          Delete
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
