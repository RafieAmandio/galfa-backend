"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { fundAllocations } from "@/db/drizzle/schema";
import { zfd } from "zod-form-data";
import { z } from "zod";

const createFundAllocationSchema = zfd.formData({
  name: zfd.text(z.string().min(1, "Name is required")),
  description: zfd.text(z.string().optional()),
  aum: zfd.text(z.string().min(1, "AUM is required")),
  rate_type: zfd.text(z.enum(["loan", "roe"], { message: "Rate type must be 'loan' or 'roe'" })),
  rate_value: zfd.text(z.string().min(1, "Rate value is required")),
  rate_label: zfd.text(z.string().optional()),
});

export type CreateFundAllocationState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function createFundAllocation(
  _prevState: CreateFundAllocationState | undefined,
  formData: FormData
): Promise<CreateFundAllocationState> {
  try {
    const parsed = createFundAllocationSchema.safeParse(formData);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { name, description, aum, rate_type, rate_value, rate_label } = parsed.data;

    const db = createDrizzleConnection();
    const now = new Date();

    await db.insert(fundAllocations).values({
      name,
      description: description || null,
      aum: aum.replace(/,/g, ""),
      rate_type,
      rate_value: rate_value.replace(/%/g, ""),
      rate_label: rate_label || null,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      message: "Fund allocation created successfully",
    };
  } catch (error) {
    console.error("Error creating fund allocation:", error);
    return {
      success: false,
      message: "Failed to create fund allocation",
    };
  }
}
