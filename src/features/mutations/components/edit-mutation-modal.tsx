"use client";

import { useState, useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { updateMutation, deleteMutation } from "../actions/update-mutation";
import type { Mutation } from "../actions/get-all-mutations";

interface EditMutationModalProps {
  mutation: Mutation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMutationModal({
  mutation,
  open,
  onOpenChange,
  onSuccess,
}: EditMutationModalProps) {
  const [amount, setAmount] = useState(mutation.amount);
  const [transactionDate, setTransactionDate] = useState(
    new Date(mutation.transaction_date).toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(mutation.description || "");
  const [status, setStatus] = useState(mutation.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateMutation({
        mutationId: mutation.id,
        amount: Number(amount),
        transactionDate: new Date(transactionDate + "T00:00:00"),
        description,
        status,
      });
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError("Failed to update mutation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this mutation?")) return;
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteMutation(mutation.id);
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError("Failed to delete mutation");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Mutation #{mutation.id}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Input value={mutation.type} disabled className="bg-muted" />
          </div>

          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || isDeleting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
