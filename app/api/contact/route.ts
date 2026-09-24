import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ContactSchema } from "@/lib/schemas";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { sendEmail } from "@/lib/email";

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

  try {
    await db.insert(inquiries).values({
      name,
      email,
      company: company || null,
      projectType: projectType || null,
      message,
      ipAddress: ip,
    });
  } catch (err) {
    console.error("[contact] failed to insert inquiry into database:", err);
    return NextResponse.json(
      { success: false, message: "Failed to save submission. Please try again later." },
      { status: 500 },
    );
  }

  const ownerEmail = process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || "sourav@example.com";
  try {
    await sendEmail({
      to: ownerEmail,
      subject: `New inquiry from ${name}${projectType ? ` (${projectType})` : ""}`,
      text: `New portfolio inquiry received:\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || "N/A"}\nProject Type: ${projectType || "N/A"}\n\nMessage:\n${message}`,
    });
  } catch (err) {
    console.error("[contact] failed to send email notification:", err);
    // Don't fail the user request if email notification fails, since the inquiry is saved in DB.
  }

  return NextResponse.json({ success: true });
}
