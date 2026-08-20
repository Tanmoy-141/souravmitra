/**
 * Utility for sending transactional emails (OTP codes, password resets) via Resend.
 */
export async function sendOtpEmail({
  to,
  otpCode,
  purpose,
}: {
  to: string;
  otpCode: string;
  purpose: "Password Reset" | "Username Recovery" | "Email Verification";
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `\n[EMAIL SERVICE - DEV MODE]\n----------------------------------------\nTO: ${to}\nPURPOSE: ${purpose}\nOTP CODE: ${otpCode}\nEXPIRES IN: 10 minutes\n----------------------------------------\n(Set RESEND_API_KEY in production to deliver via inbox)\n`,
    );
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Security <onboarding@resend.dev>",
        to: [to],
        subject: `Your ${purpose} Code: ${otpCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #0d0d0d; color: #ffffff; border: 1px solid #222222; border-radius: 8px;">
            <p style="color: #c5a059; text-transform: uppercase; font-size: 11px; letter-spacing: 0.2em; font-weight: 700; margin-bottom: 8px;">Account Security</p>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #ffffff;">${purpose}</h1>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">Use the 6-digit verification code below to complete your request. This single-use code will expire in 10 minutes.</p>
            
            <div style="background-color: #18181b; border: 1px solid #27272a; padding: 20px; text-align: center; border-radius: 6px; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #c5a059;">${otpCode}</span>
            </div>
            
            <p style="font-size: 12px; color: #71717a; line-height: 1.5; margin: 0;">If you did not request this verification code, please ignore this email. No changes will be made to your account.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("[Email Error]:", data);
      return {
        success: false,
        error: data.message || "Failed to deliver email",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("[Email Exception]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error sending email",
    };
  }
}
