import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth-helpers";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { generateTemplateWorkbook } from "@/features/import/lib/template-generator";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wb = generateTemplateWorkbook();
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="galfa-import-template.xlsx"',
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
