import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ContactSchema } from "@/lib/schemas";

const CONTACT_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT);
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, message: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const result = ContactSchema.safeParse(body);
  if (!result.success || (result.data.hp_company && result.data.hp_company !== "")) {
    // Silently drop if honeypot is filled or validation fails
    return NextResponse.json({ success: true });
  }

  const { name, email, company, projectType, message } = result.data;

  // TODO(Phase: Auth/Email — Resend): once RESEND_API_KEY is configured,
  // send this as a real email to the site owner here, e.g.:
  //
  //   import { Resend } from "resend";
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({
  //     from: "Portfolio Contact <contact@yourdomain.com>",
  //     to: "sourav@example.com",
  //     replyTo: email,
  //     subject: `New inquiry from ${name}`,
  //     text: `${name} (${email})\n${company ?? ""}\n${projectType ?? ""}\n\n${message}`,
  //   });
  //
  // Until then, log server-side so submissions aren't silently dropped.
  console.log("[contact] new submission:", {
    name,
    email,
    company,
    projectType,
    message,
  });

  return NextResponse.json({ success: true });
}
