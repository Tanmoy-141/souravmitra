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

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Sourav Mitra Portfolio <auth@yourdomain.com>", // TODO: swap to your verified Resend domain
    to,
    subject,
    text,
  });
}
