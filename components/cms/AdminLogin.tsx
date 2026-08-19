"use client";
import { useState } from "react";

interface AdminLoginProps {
  onSuccess: () => void;
}

type RecoveryMode = "username" | "password" | null;
type RecoveryStep = "request" | "verify" | "reset" | "result";

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(null);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("request");
  const [recoveredUsername, setRecoveredUsername] = useState("");

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

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const action =
      recoveryMode === "username"
        ? "request-username-otp"
        : "request-password-otp";
    const body =
      recoveryMode === "username" ? { action, email } : { action, username };

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryStep("verify");
      } else {
        setError(data.message || "Failed to initiate recovery");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const action =
      recoveryMode === "username"
        ? "verify-username-otp"
        : "verify-password-otp";
    const payload =
      recoveryMode === "username"
        ? { action, otp, email }
        : { action, otp, username };

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (recoveryMode === "username") {
          setRecoveredUsername(data.username);
          setRecoveryStep("result");
        } else {
          setResetToken(data.resetToken);
          setEmail(data.email || email);
          setRecoveryStep("reset");
        }
      } else {
        setError(data.message || "Invalid recovery code");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          email,
          resetToken,
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage("Password reset successfully. You may now sign in.");
        setRecoveryStep("result");
      } else {
        setError(data.message || "Failed to reset password");
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
    setRecoveredUsername("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
    setOtp("");
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
                placeholder="Username or Email"
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
                {recoveryMode === "username"
                  ? "Recover Username"
                  : "Reset Password"}
              </h1>
              <p className="text-gray-400 text-xs tracking-wide uppercase">
                {recoveryStep === "request"
                  ? "Step 1: Identify Account"
                  : recoveryStep === "verify"
                    ? "Step 2: Enter Recovery Code"
                    : recoveryStep === "reset"
                      ? "Step 3: New Password"
                      : "Completed"}
              </p>
            </div>

            {/* STEP 1: REQUEST */}
            {recoveryStep === "request" && (
              <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  {recoveryMode === "username"
                    ? "Enter your account email to retrieve your username."
                    : "Enter your username or email to verify your identity."}
                </p>
                <input
                  type={recoveryMode === "username" ? "email" : "text"}
                  placeholder={
                    recoveryMode === "username"
                      ? "Account Email"
                      : "Username or Email"
                  }
                  value={recoveryMode === "username" ? email : username}
                  onChange={(e) =>
                    recoveryMode === "username"
                      ? setEmail(e.target.value)
                      : setUsername(e.target.value)
                  }
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Processing..." : "Continue"}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER OTP / RECOVERY CODE */}
            {recoveryStep === "verify" && (
              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  Enter your master recovery code to authenticate.
                </p>
                <input
                  type="text"
                  placeholder="Recovery Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white text-center text-lg font-mono tracking-widest focus:border-[#C5A059] outline-none"
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD */}
            {recoveryStep === "reset" && (
              <form
                onSubmit={handleResetPassword}
                className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  Identity verified. Enter a secure new password for your
                  account.
                </p>
                <input
                  type="password"
                  placeholder="New Password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50">
                  {loading ? "Updating Password..." : "Set New Password"}
                </button>
              </form>
            )}

            {/* RESULT VIEW */}
            {recoveryStep === "result" && (
              <div className="flex flex-col gap-6 text-center">
                <div className="p-4 bg-gray-900 border border-[#C5A059]">
                  {recoveryMode === "username" ? (
                    <>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
                        Your account username is
                      </span>
                      <p className="text-2xl text-white font-mono font-bold tracking-tight">
                        {recoveredUsername}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-400 font-medium">
                      {successMessage || "Password updated successfully!"}
                    </p>
                  )}
                </div>
                <button
                  onClick={resetRecovery}
                  className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-[10px]">
                  Return to Sign In
                </button>
              </div>
            )}

            {recoveryStep !== "result" && (
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
