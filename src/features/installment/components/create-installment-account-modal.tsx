"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import {
  FormEvent,
  startTransition,
  useActionState,
  useState,
  useEffect,
} from "react";
import { useEffectEvent } from "@/lib/hooks/useEffectEvent";
import { InvestorOption } from "@/features/investor/actions/get-all-investors";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { createInstallmentAccount } from "@/features/installment/actions/create-installment-account";
import { SubmitButton } from "@/components/buttons/submit-button";

// Error display component
function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return <p className="text-sm text-destructive mt-1">{error}</p>;
}

export function CreateInstallmentAccountModal({
  investorEmails,
}: {
  investorEmails: InvestorOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionState, actionDispatch, isActionPending] = useActionState(
    createInstallmentAccount,
    undefined
  );

  // Form state for controlled inputs
  const [selectedInvestorEmail, setSelectedInvestorEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [capital, setCapital] = useState<string>("");
  const [monthlyCoF, setMonthlyCoF] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [investmentType, setInvestmentType] = useState<string | null>(null);
  const [adminFeePercentage, setAdminFeePercentage] = useState<string>("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const d = new Date(transactionDate);
    d.setFullYear(d.getFullYear() + 1);
    setEndDate(d);
  }, [transactionDate]);

  // Reset form when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form state when closing
      setSelectedInvestorEmail("");
      setAccountNumber("");
      setCapital("");
      setMonthlyCoF("");
      setTransactionDate(new Date());
      setEndDate(null);
      setInvestmentType(null);
      setAdminFeePercentage("");
      setDescription("");
    }
  };

  // Get field-specific errors
  const getFieldError = (fieldName: string) => {
    return actionState?.errors?.find((error: any) => error.field === fieldName)
      ?.message;
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const formData = new FormData();
      formData.append("investorEmail", selectedInvestorEmail);
      formData.append("accountNumber", accountNumber);
      formData.append("capital", capital);
      formData.append("monthlyCoF", monthlyCoF);
      formData.append("transactionDate", transactionDate.toISOString());
      formData.append("endDate", endDate ? endDate.toISOString() : "");
      formData.append("investmentType", investmentType || "");
      formData.append("adminFeePercentage", adminFeePercentage);
      formData.append("description", description);

      actionDispatch(formData);
    });
  };

  const actionEffectEvent = useEffectEvent((state: typeof actionState) => {
    if (state) {
      if (state.success && state.message) {
        // Reset form state on success
        setSelectedInvestorEmail("");
        setAccountNumber("");
        setCapital("");
        setMonthlyCoF("");
        setTransactionDate(new Date());
        setEndDate(null);
        setInvestmentType(null);
        setAdminFeePercentage("");
        setDescription("");

        // Close modal after 2 seconds
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } else if (state.errors && state.errors.length > 0) {
        // Scroll to first error
        setTimeout(() => {
          const firstError = state.errors[0];
          let errorField: HTMLElement | null = null;

          // Try to find the field by ID first
          errorField = document.getElementById(firstError.field);

          // If not found by ID, try to find by name attribute
          if (!errorField) {
            errorField = document.querySelector(`[name="${firstError.field}"]`);
          }

          // If still not found, try to find the closest input/select/textarea
          if (!errorField) {
            const fieldMap: Record<string, string> = {
              investorEmail: "investorEmail",
              accountNumber: "accountNumber",
              capital: "capital",
              monthlyCoF: "monthlyCoF",
              transactionDate: "transactionDate",
              endDate: "endDate",
              investmentType: "investmentType",
              adminFeePercentage: "adminFeePercentage",
              description: "description",
            };

            const fieldId = fieldMap[firstError.field];
            if (fieldId) {
              errorField = document.getElementById(fieldId);
            }
          }

          if (errorField) {
            errorField.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Add focus for better UX
            errorField.focus();
          }
        }, 100); // Small delay to ensure DOM is updated
      }
    }
  });

  useEffect(
    () => actionEffectEvent(actionState),
    [actionState, actionEffectEvent]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="hover:cursor-pointer">
          Create Installment Account
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Installment Account</DialogTitle>
        </DialogHeader>

        {/* Success/Error Messages */}
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

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto px-2 flex-1"
        >
          {/* Investor Select */}
          <div className="space-y-2">
            <Label htmlFor="investorEmail" className="text-sm font-medium">
              Select Investor *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedInvestorEmail && "text-muted-foreground"
                  )}
                >
                  {selectedInvestorEmail
                    ? (() => {
                        const inv = investorEmails.find(i => i.email === selectedInvestorEmail);
                        return inv ? `${inv.email}${inv.fullName ? ` - ${inv.fullName}` : ""}` : selectedInvestorEmail;
                      })()
                    : "Search investor..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." />
                  <CommandList>
                    <CommandEmpty>No investor found.</CommandEmpty>
                    <CommandGroup>
                      {investorEmails.map((investor) => (
                        <CommandItem
                          key={investor.id}
                          value={`${investor.email} ${investor.fullName || ""}`}
                          onSelect={() => setSelectedInvestorEmail(investor.email)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedInvestorEmail === investor.email ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{investor.email}</span>
                            {investor.fullName && (
                              <span className="text-xs text-muted-foreground">{investor.fullName}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldError error={getFieldError("investorEmail")} />
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="text-sm font-medium">
              Account Number *
            </Label>
            <Input
              type="text"
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              placeholder="Enter unique account number"
            />
            <FieldError error={getFieldError("accountNumber")} />
          </div>

          {/* Capital */}
          <div className="space-y-2">
            <Label htmlFor="capital" className="text-sm font-medium">
              Capital *
            </Label>
            <Input
              id="capital"
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="Enter investment amount"
              required
              min="1"
              step="1"
            />
            <FieldError error={getFieldError("capital")} />
          </div>

          {/* Monthly CoF */}
          <div className="space-y-2">
            <Label htmlFor="monthlyCoF" className="text-sm font-medium">
              Monthly CoF (Percentage) *
            </Label>
            <Input
              id="monthlyCoF"
              type="number"
              value={monthlyCoF}
              onChange={(e) => setMonthlyCoF(e.target.value)}
              placeholder="Enter monthly CoF (Percentage)"
              required
              min="0"
              max="100"
              step="0.01"
            />
            <FieldError error={getFieldError("monthlyCoF")} />
          </div>

          {/* Admin Fee Percentage */}
          <div className="space-y-2">
            <Label htmlFor="adminFeePercentage" className="text-sm font-medium">
              Admin Fee Percentage (%) *
            </Label>
            <Input
              id="adminFeePercentage"
              type="number"
              value={adminFeePercentage}
              onChange={(e) => setAdminFeePercentage(e.target.value)}
              placeholder="Enter admin fee percentage"
              required
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-sm text-muted-foreground">
              Admin fee as percentage (e.g., 5 for 5%)
            </p>
            <FieldError error={getFieldError("adminFeePercentage")} />
          </div>

          {/* Investment Type */}
          <div className="space-y-2">
            <Label htmlFor="investmentType" className="text-sm font-medium">
              Investment Type *
            </Label>
            <Select
              value={investmentType ?? ""}
              onValueChange={setInvestmentType}
              required
            >
              <SelectTrigger id="investmentType">
                <SelectValue placeholder="Choose an investment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principle">Principle + Interest</SelectItem>
                <SelectItem value="interest_only">Interest Only</SelectItem>
                <SelectItem value="bullet">Bullet</SelectItem>
                <SelectItem value="declining">Co. Menurun</SelectItem>
              </SelectContent>
            </Select>
            <FieldError error={getFieldError("investmentType")} />
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label htmlFor="transactionDate" className="text-sm font-medium">
              Transaction Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="transactionDate"
                  variant="outline"
                  className={cn(
                    "w-full p-3 justify-start text-left font-normal",
                    !transactionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {transactionDate ? (
                    format(transactionDate, "d MMMM yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={(date) => {
                    if (date) {
                      setTransactionDate(date);
                    }
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
            <FieldError error={getFieldError("transactionDate")} />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-medium">
              End Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className="w-full p-3 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "d MMMM yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ?? undefined}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(date);
                    }
                  }}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
            <FieldError error={getFieldError("endDate")} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note about this investment..."
              rows={3}
            />
            <FieldError error={getFieldError("description")} />
          </div>

          {/* Submit Button */}
          <SubmitButton fullWidth loading={isActionPending}>
            Create Installment Account
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
