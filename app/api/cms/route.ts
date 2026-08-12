import { NextResponse } from "next/server";
import { defaultCustomPages } from "@/data/cms";

// In a real production app with Vercel, this would use Vercel KV:
// import { kv } from '@vercel/kv';
// For now, we simulate a global persistent store.
const globalCmsData = {
  pages: defaultCustomPages,
};

export async function GET() {
  return NextResponse.json(globalCmsData);
}

export async function POST(req: Request) {
  try {
    const { pages, token } = await req.json();

    // Verify "session" token (simple mock for now)
    if (token !== "session_active_token") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    globalCmsData.pages = pages;
    return NextResponse.json({
      success: true,
      message: "Site updated globally!",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to save" },
      { status: 500 },
    );
  }
}
