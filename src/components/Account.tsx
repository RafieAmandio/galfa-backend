"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";

interface AccountProps {
  user: User;
}

export default function Account({ user }: AccountProps) {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>("");
  const [avatar_url, setAvatarUrl] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    let ignore = false;

    async function getProfile() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(`full_name, avatar_url`)
        .eq("id", user.id)
        .single();

      if (!ignore) {
        if (error) {
          console.warn(error);
          setError("Error loading profile");
        } else if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url || "");
        }
      }

      setLoading(false);
    }

    getProfile();

    return () => {
      ignore = true;
    };
  }, [user, supabase]);

  async function updateProfile(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const updates = {
      id: user.id,
      full_name: fullName,
      avatar_url,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Profile updated successfully!");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {user.email?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{fullName || "User"}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <form onSubmit={updateProfile} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-gray-700">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={user.email || ""}
              disabled
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <Badge
              variant="secondary"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
            >
              Verified
            </Badge>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="fullName" className="text-gray-700">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v4a1 1 0 11-2 0V4H7v4a1 1 0 11-2 0V4z" />
                </svg>
                Update Profile
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Success Message */}
      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-800 font-medium text-sm">{message}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-800 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
