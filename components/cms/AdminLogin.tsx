"use client";
import { useState, useEffect } from "react";

interface AdminLoginProps {
  onSuccess: () => void;
}

type RecoveryMode = "username" | "password" | null;
type RecoveryStep = "request" | "confirm" | "done";

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);

  useEffect(() => {
    // Check if Google OAuth is configured on the backend
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.googleAuthAvailable) {
          setGoogleAuthAvailable(true);
        }
      })
      .catch(() => {});

    // Read error query param post-hydration to prevent server/client HTML mismatch
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errCode = params.get("error");
      if (errCode) {
        const errorMap: Record<string, string> = {
          unauthorized:
            "This Google account is not authorized to access the CMS.",
          google_denied: "Google sign-in was cancelled or denied.",
          unverified_email: "Your Google email address is unverified.",
          account_conflict:
            "This Google account is already linked to another user.",
          invalid_state:
            "Authentication session expired or invalid. Please try again.",
          invalid_request: "Invalid authentication request. Please try again.",
          rate_limited:
            "Too many login attempts. Please try again in 15 minutes.",
          server_error: "Authentication service error. Please try again later.",
          auth_failed: "Authentication failed. Please try again.",
        };
        const message =
          errorMap[errCode] ||
          "Google authentication failed. Please try again.";

        // Defer to next tick so it runs post-mount without hydration mismatch or sync effect warning
        setTimeout(() => {
          setError(message);
        }, 0);

        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

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

            {googleAuthAvailable && (
              <div className="flex flex-col gap-4">
                <a
                  href="/api/auth/google"
                  className="w-full py-3 px-4 bg-[#181818] hover:bg-[#222222] border border-[#333333] hover:border-[#555555] transition-all flex items-center justify-center gap-3 text-white font-medium text-xs tracking-wider uppercase group">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Sign in with Google
                  </span>
                </a>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#262626]" />
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">
                    Or with password
                  </span>
                  <div className="flex-1 h-px bg-[#262626]" />
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-black border border-[#333333] text-white placeholder:text-gray-500 focus:border-[#C5A059] focus:outline-none"
                required
              />
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-16 bg-black border border-[#333333] text-white placeholder:text-gray-500 focus:border-[#C5A059] focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#C5A059] transition-colors">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
                {recoveryMode === "username"
                  ? "Find Username"
                  : "Reset Password"}
              </h1>
            </div>

            {recoveryStep === "request" && (
              <form
                onSubmit={handleRequestRecovery}
                className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  {recoveryMode === "username"
                    ? "Enter your account email. If it matches, we'll email you your username."
                    : "Enter your username or email. If it matches, we'll email you a reset code."}
                </p>
                <input
                  type={recoveryMode === "username" ? "email" : "text"}
                  placeholder={
                    recoveryMode === "username"
                      ? "Account Email"
                      : "Username or Email"
                  }
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white placeholder:text-gray-500 focus:border-[#C5A059] focus:outline-none"
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Sending..." : "Send"}
                </button>
              </form>
            )}

            {recoveryStep === "confirm" && (
              <form
                onSubmit={handleConfirmReset}
                className="flex flex-col gap-4">
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
                  className="w-full p-3 bg-black border border-[#333333] text-white placeholder:text-gray-500 focus:border-[#C5A059] focus:outline-none"
                  required
                  minLength={8}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white placeholder:text-gray-500 focus:border-[#C5A059] focus:outline-none"
                  required
                  minLength={8}
                />
                {error && (
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                )}
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
