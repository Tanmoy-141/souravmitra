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

  const parsed = result.data;
  const fullName =
    parsed.name?.trim() ||
    [parsed.firstName?.trim(), parsed.lastName?.trim()].filter(Boolean).join(" ") ||
    "Visitor";
  const role =
    parsed.role ||
    parsed.userType ||
    parsed.projectType ||
    parsed.company ||
    "Individual";
  const message = parsed.message?.trim() || "(No message provided)";

  try {
    await db.insert(inquiries).values({
      name: fullName,
      email: parsed.email,
      company: role,
      projectType: role,
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
      subject: `New inquiry from ${fullName} (${role})`,
      text: `New portfolio inquiry received:\n\nName: ${fullName}\nEmail: ${parsed.email}\nRole: ${role}\n\nMessage:\n${message}`,
    });
  } catch (err) {
    console.error("[contact] failed to send email notification:", err);
    // Don't fail the user request if email notification fails, since the inquiry is saved in DB.
  }

  return NextResponse.json({ success: true });
}
