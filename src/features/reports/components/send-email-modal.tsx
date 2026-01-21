"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react";

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  investorEmail: string;
}

export function SendEmailModal({
  isOpen,
  onClose,
  investorEmail,
}: SendEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ investorEmail }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? "Email sent successfully" : "Failed to send email"),
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send email",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Report Email
          </DialogTitle>
          <DialogDescription>
            Send an investment portfolio report to the investor via email.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Recipient:</p>
            <p className="font-medium text-gray-900">{investorEmail}</p>
          </div>

          {result && (
            <div
              className={`mt-4 rounded-lg p-4 flex items-start gap-3 ${
                result.success
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="text-sm">{result.message}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
