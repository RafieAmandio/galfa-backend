"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function SubmitButton({
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || loading}
      className={cn(fullWidth && "w-full", className)}
    >
      {loading ? "Creating..." : children}
    </Button>
  );
}
