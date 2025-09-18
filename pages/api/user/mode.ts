import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { setUserMode } from "../../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { mode } = req.body as { mode?: string };

  if (!mode || (mode !== "light" && mode !== "dark")) {
    return res.status(400).json({ error: "Invalid mode" });
  }

  try {
    await setUserMode(session.user.email, mode);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Failed to update mode", error);
    return res
      .status(500)
      .json({ error: error?.message ?? "Failed to update mode" });
  }
}
