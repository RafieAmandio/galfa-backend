"use client";

import React, { useState, useEffect } from "react";
import { useActionState, startTransition } from "react";
import { useEffectEvent } from "@/lib/hooks/useEffectEvent";
import {
  createCapitalMarketAccount,
  CreateCapitalMarketAccountResult,
} from "../actions/create-capital-market-account";
import { getAllUsers } from "@/features/admin/actions/get-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SubmitButton } from "@/components/buttons/submit-button";
import { cn } from "@/lib/utils";
import { PlusIcon, Check, ChevronsUpDown } from "lucide-react";

// Error display component
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 mt-1">{error}</p>;
}

interface CreateCapitalMarketAccountFormProps {
  onAccountCreated?: () => void;
  trigger?: React.ReactNode;
}

interface UserOption {
  id: string;
  email: string;
  fullName: string | null;
}

export function CreateCapitalMarketAccountForm({
  onAccountCreated,
  trigger,
}: CreateCapitalMarketAccountFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionState, actionDispatch, isActionPending] = useActionState(
    createCapitalMarketAccount,
    undefined
  );

  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    userId: "",
  });

  // Users list state
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const result = await getAllUsers();
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Reset form when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form state when closing
      setFormData({
        userId: "",
      });
    }
  };

  // Get field-specific errors
  const getFieldError = (fieldName: string) => {
    return actionState?.errors?.find((error: any) => error.field === fieldName)
      ?.message;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const formDataObj = new FormData();
      formDataObj.append("userId", formData.userId);

      actionDispatch(formDataObj);
    });
  };

  // Handle action state changes
  const actionEffectEvent = useEffectEvent(
    (state: CreateCapitalMarketAccountResult | undefined) => {
      if (state) {
        if (state.success && state.message) {
          // Reset form state on success
          setFormData({
            userId: "",
          });

          // Close modal after success
          setTimeout(() => {
            setIsOpen(false);
          }, 2000);

          // Call callback if provided
          if (onAccountCreated) {
            onAccountCreated();
          }
        } else if (
          state.errors &&
          Array.isArray(state.errors) &&
          state.errors.length > 0
        ) {
          // Scroll to first error
          setTimeout(() => {
            if (state.errors) {
              const firstError = state.errors[0];
              if (firstError && firstError.field) {
                const errorField = document.getElementById(firstError.field);

                if (errorField) {
                  errorField.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  errorField.focus();
                }
              }
            }
          }, 100);
        }
      }
    }
  );

  useEffect(
    () => actionEffectEvent(actionState),
    [actionState, actionEffectEvent]
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Capital Market Account
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0  text-left">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Capital Market Account
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Create a new capital market account for an existing user
              </p>
            </div>

            {/* Success/Error Messages */}
            <div className="px-2 mb-4 text-left">
              {actionState?.message && (
                <div
                  className={cn(
                    "p-3 rounded-md text-sm flex-shrink-0 text-left",
                    actionState.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  )}
                >
                  {actionState.message}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 overflow-y-auto px-2 flex-1 text-left"
            >
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">
                  Select User *
                </Label>

                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      disabled={loadingUsers}
                      className="w-full justify-between font-normal"
                    >
                      {formData.userId
                        ? (() => {
                            const u = users.find((u) => u.id === formData.userId);
                            return u ? `${u.fullName || u.email}` : "Select a user...";
                          })()
                        : "Search user..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or email..." />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.email} ${user.fullName || ""}`}
                              onSelect={() => {
                                setFormData((prev) => ({ ...prev, userId: user.id }));
                                setUserSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.userId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.email}</span>
                                {user.fullName && (
                                  <span className="text-xs text-muted-foreground">
                                    {user.fullName}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {loadingUsers && (
                  <p className="text-sm text-muted-foreground">
                    Loading users...
                  </p>
                )}
                <FieldError error={getFieldError("userId")} />
                <p className="text-sm text-muted-foreground">
                  Select an existing user to create a capital market account
                  for. Each user can only have one capital market account.
                </p>
              </div>

              {/* Submit Button */}
              <SubmitButton fullWidth loading={isActionPending}>
                Create Capital Market Account
              </SubmitButton>
            </form>

            {/* Close Button */}
            <div className="flex-shrink-0 mt-4 pt-4 border-t text-left">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
