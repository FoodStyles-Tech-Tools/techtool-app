import type { NextApiRequest, NextApiResponse } from "next";
import { getAppVersionInfo } from "../../lib/getAppVersion";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const info = getAppVersionInfo();
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json(info);
}
