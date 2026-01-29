"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { fundAllocations } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { zfd } from "zod-form-data";
import { z } from "zod";

const updateFundAllocationSchema = zfd.formData({
  id: zfd.text(z.string().min(1, "ID is required")),
  name: zfd.text(z.string().min(1, "Name is required")),
  description: zfd.text(z.string().optional()),
  aum: zfd.text(z.string().min(1, "AUM is required")),
  rate_type: zfd.text(z.enum(["loan", "roe"], { message: "Rate type must be 'loan' or 'roe'" })),
  rate_value: zfd.text(z.string().min(1, "Rate value is required")),
  rate_label: zfd.text(z.string().optional()),
});

export type UpdateFundAllocationState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function updateFundAllocation(
  _prevState: UpdateFundAllocationState | undefined,
  formData: FormData
): Promise<UpdateFundAllocationState> {
  try {
    const parsed = updateFundAllocationSchema.safeParse(formData);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, name, description, aum, rate_type, rate_value, rate_label } = parsed.data;

    const db = createDrizzleConnection();

    await db
      .update(fundAllocations)
      .set({
        name,
        description: description || null,
        aum: aum.replace(/,/g, ""),
        rate_type,
        rate_value: rate_value.replace(/%/g, ""),
        rate_label: rate_label || null,
        updated_at: new Date(),
      })
      .where(eq(fundAllocations.id, parseInt(id)));

    return {
      success: true,
      message: "Fund allocation updated successfully",
    };
  } catch (error) {
    console.error("Error updating fund allocation:", error);
    return {
      success: false,
      message: "Failed to update fund allocation",
    };
  }
}
