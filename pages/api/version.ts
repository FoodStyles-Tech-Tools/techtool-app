import type { NextApiRequest, NextApiResponse } from "next";
import { getAppVersionInfo } from "../../lib/getAppVersion";
import { getReleaseNotesSinceVersion } from "../../lib/releaseNotes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const info = getAppVersionInfo();
  
  // Get current version from query or use latest
  const currentVersion = (req.query.currentVersion as string) || info.version;
  
  // Get release notes for versions newer than current
  try {
    const releaseNotes = await getReleaseNotesSinceVersion(currentVersion);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({
      ...info,
      releaseNotes: releaseNotes.length > 0 ? releaseNotes : undefined,
    });
  } catch (error) {
    // If release notes fail, still return version info
    console.error("Failed to load release notes:", error);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json(info);
  }
}
