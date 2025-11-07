import type { NextApiRequest, NextApiResponse } from "next";
import { setUserMode } from "../../../lib/supabase";
import {
  validateMethod,
  requireAuth,
  handleApiError,
  type ApiError,
} from "../../../lib/utils/api";

type ModeResponse = { success: boolean } | ApiError;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModeResponse>
) {
  if (!validateMethod(req, res, ["POST"])) {
    return;
  }

  const session = await requireAuth(req, res);
  if (!session) {
    return;
  }

  const { mode } = req.body as { mode?: string };

  if (!mode || (mode !== "light" && mode !== "dark")) {
    return res.status(400).json({ error: "Invalid mode" });
  }

  try {
    await setUserMode(session.user.email!, mode);
    return res.status(200).json({ success: true });
  } catch (error) {
    handleApiError(res, error, "Failed to update mode");
  }
}
