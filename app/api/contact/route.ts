import { NextResponse } from "next/server";

interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  projectType?: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Partial<ContactPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { name, email, company, projectType, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { success: false, message: "Name, email, and message are required" },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, message: "Please enter a valid email address" },
      { status: 400 },
    );
  }

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
