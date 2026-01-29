"use client";

import { useState, useActionState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { FundAllocation } from "../actions/get-fund-allocations";
import { createFundAllocation } from "../actions/create-fund-allocation";
import { updateFundAllocation } from "../actions/update-fund-allocation";
import { deleteFundAllocation } from "../actions/delete-fund-allocation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  PiggyBank,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface FundAllocationsViewProps {
  user: User;
  initialData: {
    totalAum: number;
    totalAllocations: number;
    allocations: FundAllocation[];
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1_000_000_000_000) {
    return `Rp ${(amount / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return formatCurrency(amount);
};

export function FundAllocationsView({ user, initialData }: FundAllocationsViewProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<FundAllocation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [createState, createAction, isCreatePending] = useActionState(createFundAllocation, undefined);
  const [updateState, updateAction, isUpdatePending] = useActionState(updateFundAllocation, undefined);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    aum: "",
    rate_type: "loan",
    rate_value: "",
    rate_label: "",
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isCreateModalOpen) {
      setFormData({
        name: "",
        description: "",
        aum: "",
        rate_type: "loan",
        rate_value: "",
        rate_label: "",
      });
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (selectedAllocation && isEditModalOpen) {
      setFormData({
        name: selectedAllocation.name,
        description: selectedAllocation.description || "",
        aum: selectedAllocation.aum.toString(),
        rate_type: selectedAllocation.rate_type,
        rate_value: selectedAllocation.rate_value.toString(),
        rate_label: selectedAllocation.rate_label || "",
      });
    }
  }, [selectedAllocation, isEditModalOpen]);

  // Handle successful create/update
  useEffect(() => {
    if (createState?.success) {
      setIsCreateModalOpen(false);
      router.refresh();
    }
  }, [createState, router]);

  useEffect(() => {
    if (updateState?.success) {
      setIsEditModalOpen(false);
      setSelectedAllocation(null);
      router.refresh();
    }
  }, [updateState, router]);

  const handleEdit = (allocation: FundAllocation) => {
    setSelectedAllocation(allocation);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (allocation: FundAllocation) => {
    setSelectedAllocation(allocation);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAllocation) return;
    setDeleteLoading(true);
    try {
      const result = await deleteFundAllocation(selectedAllocation.id);
      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedAllocation(null);
        router.refresh();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Fund Allocations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage portfolio company allocations and rates
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#192473] hover:bg-[#192473]/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Allocation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#192473]/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-[#192473]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total AUM</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCompactCurrency(initialData.totalAum)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Portfolio Companies</p>
              <p className="text-lg font-semibold text-foreground">
                {initialData.totalAllocations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFEB7A]/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Rate Range</p>
              <p className="text-lg font-semibold text-foreground">
                {initialData.allocations.length > 0
                  ? `${Math.min(...initialData.allocations.map(a => a.rate_value))}% - ${Math.max(...initialData.allocations.map(a => a.rate_value))}%`
                  : "N/A"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Portfolio Allocations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Most of the funds are used for bridging loans, charged at rate 1%-3% p.m.
          </p>
        </div>

        {initialData.allocations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No allocations yet</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add your first allocation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                    Allocation
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                    Description
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                    AUM
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                    Rate
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialData.allocations.map((allocation) => (
                  <tr
                    key={allocation.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-medium text-foreground">{allocation.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {allocation.description || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(allocation.aum)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        className={
                          allocation.rate_type === "loan"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }
                      >
                        {allocation.rate_label || `${allocation.rate_type === "loan" ? "Loan" : "ROE"}: ${allocation.rate_value}%`}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(allocation)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(allocation)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Fund Allocation</DialogTitle>
          </DialogHeader>
          <form action={createAction} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Berkah Pengadaan Mandiri"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {createState?.errors?.name && (
                <p className="text-xs text-red-500">{createState.errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Company description..."
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aum">AUM (IDR)</Label>
              <Input
                id="aum"
                name="aum"
                type="text"
                placeholder="e.g., 402500000"
                value={formData.aum}
                onChange={(e) => setFormData({ ...formData, aum: e.target.value })}
                required
              />
              {createState?.errors?.aum && (
                <p className="text-xs text-red-500">{createState.errors.aum[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_type">Rate Type</Label>
                <Select
                  name="rate_type"
                  value={formData.rate_type}
                  onValueChange={(value) => setFormData({ ...formData, rate_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="roe">ROE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate_value">Rate Value (%)</Label>
                <Input
                  id="rate_value"
                  name="rate_value"
                  type="text"
                  placeholder="e.g., 2"
                  value={formData.rate_value}
                  onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_label">Rate Label (optional)</Label>
              <Input
                id="rate_label"
                name="rate_label"
                placeholder="e.g., Loan: 2% p.m."
                value={formData.rate_label}
                onChange={(e) => setFormData({ ...formData, rate_label: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Custom display label for the rate
              </p>
            </div>

            {createState?.message && !createState.success && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {createState.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatePending}
                className="bg-[#192473] hover:bg-[#192473]/90"
              >
                {isCreatePending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Allocation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Fund Allocation</DialogTitle>
          </DialogHeader>
          <form action={updateAction} className="space-y-4 mt-4">
            <input type="hidden" name="id" value={selectedAllocation?.id || ""} />

            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                name="description"
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-aum">AUM (IDR)</Label>
              <Input
                id="edit-aum"
                name="aum"
                type="text"
                value={formData.aum}
                onChange={(e) => setFormData({ ...formData, aum: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rate_type">Rate Type</Label>
                <Select
                  name="rate_type"
                  value={formData.rate_type}
                  onValueChange={(value) => setFormData({ ...formData, rate_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="roe">ROE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rate_value">Rate Value (%)</Label>
                <Input
                  id="edit-rate_value"
                  name="rate_value"
                  type="text"
                  value={formData.rate_value}
                  onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rate_label">Rate Label (optional)</Label>
              <Input
                id="edit-rate_label"
                name="rate_label"
                value={formData.rate_label}
                onChange={(e) => setFormData({ ...formData, rate_label: e.target.value })}
              />
            </div>

            {updateState?.message && !updateState.success && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {updateState.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatePending}
                className="bg-[#192473] hover:bg-[#192473]/90"
              >
                {isUpdatePending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Allocation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {selectedAllocation?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
