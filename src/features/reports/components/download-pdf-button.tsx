"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface DownloadPdfButtonProps {
  email: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function DownloadPdfButton({
  email,
  variant = "default",
  size = "default",
  className,
}: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reports/generate-pdf?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download report");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `investment-report-${email.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Failed to download");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        variant={variant}
        size={size}
        className={className}
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download PDF Report
          </>
        )}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
