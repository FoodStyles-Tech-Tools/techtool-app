import { NextResponse } from "next/server"
import { APP_VERSION } from "@/lib/version"

export const runtime = "edge"
export const revalidate = 0

export async function GET() {
  return NextResponse.json({ version: APP_VERSION })
}
