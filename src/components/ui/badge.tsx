import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#192473]/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#192473] text-white hover:bg-[#192473]/90",
        secondary:
          "border-transparent bg-[#FFEB7A] text-[#192473] hover:bg-[#FFEB7A]/80",
        destructive:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200",
        outline: "border-[#192473]/30 text-[#192473] hover:bg-[#192473]/10",
        success:
          "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
        warning:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
        navy:
          "border-transparent bg-[#192473]/10 text-[#192473] hover:bg-[#192473]/20",
        gold:
          "border-transparent bg-[#FFEB7A]/30 text-[#192473] hover:bg-[#FFEB7A]/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
