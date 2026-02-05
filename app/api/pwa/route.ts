import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "LuxApp",
    short_name: "LuxApp",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0F",
    theme_color: "#0B0B0F"
  });
}

