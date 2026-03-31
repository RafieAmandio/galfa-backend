"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { updateMutation, deleteMutation } from "../actions/update-mutation";
import { format } from "date-fns";

interface Redemption {
  id: number;
  amount: number;
  description: string | null;
  status: string;
  transactionDate: Date;
}

interface EditRedemptionInlineProps {
  redemption: Redemption;
  onUpdate: () => void;
  formatCurrency: (amount: number) => string;
}

export function EditRedemptionInline({
  redemption,
  onUpdate,
  formatCurrency,
}: EditRedemptionInlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(redemption.amount.toString());
  const [date, setDate] = useState(
    format(new Date(redemption.transactionDate), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState(
    redemption.description || ""
  );

  async function handleSave() {
    setIsLoading(true);
    setError(null);
    const result = await updateMutation({
      mutationId: redemption.id,
      amount: Number(amount),
      transactionDate: new Date(date + "T00:00:00"),
      description,
    });
    setIsLoading(false);
    if (result.success) {
      setIsEditing(false);
      onUpdate();
    } else {
      setError(result.message);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this redemption?")) return;
    setIsLoading(true);
    const result = await deleteMutation(redemption.id);
    setIsLoading(false);
    if (result.success) {
      onUpdate();
    } else {
      setError(result.message);
    }
  }

  if (isEditing) {
    return (
      <>
        <td className="px-4 py-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-xs w-32"
          />
        </td>
        <td className="px-4 py-2">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-xs w-28"
          />
        </td>
        <td className="px-4 py-2">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-xs"
          />
        </td>
        <td className="px-4 py-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            redemption.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}>
            {redemption.status}
          </span>
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="h-7 w-7 p-0"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-green-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
        {format(new Date(redemption.transactionDate), "d MMMM yyyy")}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">
        {formatCurrency(redemption.amount)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {redemption.description || "-"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          redemption.status === "completed"
            ? "bg-green-100 text-green-800"
            : redemption.status === "pending"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}>
          {redemption.status}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 w-7 p-0"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </td>
    </>
  );
}
