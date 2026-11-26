// Until RESEND_API_KEY is set, this logs a warning instead of
// failing, so password reset / username recovery are fully testable
// locally before Resend is configured.

/**
 * Neutralizes newlines and control characters before plain-text logging
 * to prevent log-injection and terminal-escape spoofing.
 */
export function sanitizeLogValue(value: unknown): string {
  const str = typeof value === "string" ? value : String(value ?? "");
  // Normalize control/line characters to spaces so lines stay readable,
  // then apply CodeQL's empty-string newline strip recognized by js/log-injection.
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, " ")
    .replace(/\n|\r/g, "");
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

function logSuppressedEmailPreview({ to, subject, text }: SendEmailParams) {
  const safeTo = sanitizeLogValue(to);
  const safeSubject = sanitizeLogValue(subject);
  const safeText = sanitizeLogValue(text);
  console.log(`  To: ${safeTo}`);
  console.log(`  Subject: ${safeSubject}`);
  console.log(`  Body: ${safeText}`);
}

export async function sendEmail({ to, subject, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!apiKey) {
    if (isProduction) {
      console.warn(
        "[email] RESEND_API_KEY not configured in production. Email suppressed for security.",
      );
    } else {
      console.log("[email] RESEND_API_KEY not set — logging instead of sending:");
      logSuppressedEmailPreview({ to, subject, text });
    }
    return;
  }

  // Resend rejects sends whose "from" address isn't on a domain verified in
  // your Resend dashboard. There is no safe default for this, so it must be
  // configured explicitly rather than hardcoded to a placeholder domain.
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!fromAddress) {
    if (isProduction) {
      console.warn(
        "[email] RESEND_FROM_EMAIL is missing in production. Email suppressed for security.",
      );
    } else {
      console.error(
        '[email] RESEND_API_KEY is set but RESEND_FROM_EMAIL is missing. ' +
          'Set RESEND_FROM_EMAIL to an address on a domain verified in your ' +
          'Resend dashboard (e.g. "Sourav Mitra Portfolio <hello@yourdomain.com>"). ' +
          "Logging instead of sending:",
      );
      logSuppressedEmailPreview({ to, subject, text });
    }
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    text,
  });

  // resend.emails.send() resolves normally even when the API rejects the
  // send (e.g. unverified domain, invalid recipient) — it reports the
  // failure in `error` instead of throwing. Not checking it here is why
  // sends could fail with nothing visible anywhere.
  if (error) {
    console.error("[email] Resend API returned an error:", error);
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}
