import { NextResponse } from "next/server";

const DEFAULT_ADMIN_USERNAME = "sourav";
const DEFAULT_ADMIN_PASSWORD = "password123";
const DEFAULT_ADMIN_EMAIL = "sourav@example.com";
const DEFAULT_RECOVERY_CODE = "123456"; // OTP-style default

export async function POST(req: Request) {
  try {
    const { action, username, password, email, otp } = await req.json();

    const envUsername = process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    const envEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const envRecoveryCode = process.env.RECOVERY_CODE || DEFAULT_RECOVERY_CODE;

    if (action === "login") {
      if (username === envUsername && password === envPassword) {
        return NextResponse.json({
          success: true,
          token: "session_active_token",
        });
      }
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 },
      );
    }

    // Forgot Username Flow
    if (action === "request-username-otp") {
      if (email === envEmail) {
        return NextResponse.json({
          success: true,
          message: "OTP sent to your email",
        });
      }
      return NextResponse.json(
        { success: false, message: "Email not found" },
        { status: 404 },
      );
    }

    if (action === "verify-username-otp") {
      if (otp === envRecoveryCode) {
        return NextResponse.json({ success: true, username: envUsername });
      }
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 401 },
      );
    }

    // Forgot Password Flow
    if (action === "request-password-otp") {
      if (username === envUsername) {
        return NextResponse.json({
          success: true,
          message: "OTP sent to your email",
        });
      }
      return NextResponse.json(
        { success: false, message: "Username not found" },
        { status: 404 },
      );
    }

    if (action === "verify-password-otp") {
      if (otp === envRecoveryCode) {
        return NextResponse.json({ success: true, password: envPassword });
      }
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
