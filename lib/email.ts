// Until RESEND_API_KEY is set, this logs to the server console instead of
// failing, so password reset / username recovery are fully testable
// locally before Resend is configured.

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[email] RESEND_API_KEY not set — logging instead of sending:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text}`);
    return;
  }

  // Resend rejects sends whose "from" address isn't on a domain verified in
  // your Resend dashboard. There is no safe default for this, so it must be
  // configured explicitly rather than hardcoded to a placeholder domain.
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!fromAddress) {
    console.error(
      '[email] RESEND_API_KEY is set but RESEND_FROM_EMAIL is missing. ' +
        'Set RESEND_FROM_EMAIL to an address on a domain verified in your ' +
        'Resend dashboard (e.g. "Sourav Mitra Portfolio <hello@yourdomain.com>"). ' +
        "Logging instead of sending:",
    );
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text}`);
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
