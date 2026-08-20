"use client";
import { useState } from "react";

interface AdminLoginProps {
  onSuccess: () => void;
}

type RecoveryMode = "username" | "password" | null;
type RecoveryStep = "request" | "confirm" | "done";

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(null);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("request");
  const [recoveryIdentifier, setRecoveryIdentifier] = useState(""); // email (username recovery) or username/email (password reset)
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const action =
      recoveryMode === "username"
        ? "request-username-recovery"
        : "request-password-reset";
    const body =
      recoveryMode === "username"
        ? { action, email: recoveryIdentifier }
        : { action, username: recoveryIdentifier };

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setRecoveryMessage(
        data.message ||
          "If an account matches, you'll receive an email with next steps.",
      );
      // Username recovery is a single step — the email itself delivers the
      // answer, nothing more to do here. Password reset moves on to the
      // "enter the emailed code + new password" step.
      setRecoveryStep(recoveryMode === "username" ? "done" : "confirm");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-password-reset",
          username: recoveryIdentifier,
          code: resetCode,
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryMessage("Password updated. You can now sign in.");
        setRecoveryStep("done");
      } else {
        setError(data.message || "Invalid or expired code");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetRecovery = () => {
    setRecoveryMode(null);
    setRecoveryStep("request");
    setRecoveryIdentifier("");
    setRecoveryMessage("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-md p-8 bg-[#111111] border border-[#333333] flex flex-col gap-6">
        {!recoveryMode ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Admin Sign In
              </h1>
              <p className="text-gray-400 text-sm">
                Enter your credentials to manage the portfolio
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                required
              />
              {error && (
                <p className="text-red-500 text-xs font-medium">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#C5A059] hover:bg-[#af8d4b] transition-colors text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setRecoveryMode("username")}
                className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-widest transition-colors">
                Forgot Username?
              </button>
              <button
                onClick={() => setRecoveryMode("password")}
                className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-widest transition-colors">
                Forgot Password?
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">
                {recoveryMode === "username" ? "Find Username" : "Reset Password"}
              </h1>
            </div>

            {recoveryStep === "request" && (
              <form onSubmit={handleRequestRecovery} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  {recoveryMode === "username"
                    ? "Enter your account email. If it matches, we'll email you your username."
                    : "Enter your username or email. If it matches, we'll email you a reset code."}
                </p>
                <input
                  type={recoveryMode === "username" ? "email" : "text"}
                  placeholder={recoveryMode === "username" ? "Account Email" : "Username or Email"}
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                />
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Sending..." : "Send"}
                </button>
              </form>
            )}

            {recoveryStep === "confirm" && (
              <form onSubmit={handleConfirmReset} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">{recoveryMessage}</p>
                <input
                  type="text"
                  placeholder="Reset Code (from your email)"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white font-mono focus:border-[#C5A059] outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="New Password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                  minLength={8}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                  minLength={8}
                />
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            {recoveryStep === "done" && (
              <div className="flex flex-col gap-6 text-center">
                <div className="p-4 bg-gray-900 border border-[#C5A059]">
                  <p className="text-sm text-white">{recoveryMessage}</p>
                </div>
                <button
                  onClick={resetRecovery}
                  className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-[10px]">
                  Return to Sign In
                </button>
              </div>
            )}

            {recoveryStep !== "done" && (
              <button
                onClick={resetRecovery}
                className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest self-center transition-colors">
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
