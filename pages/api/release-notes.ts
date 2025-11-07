import type { NextApiRequest, NextApiResponse } from "next";
import { getReleaseNotes, getReleaseNotesForVersion } from "../../lib/releaseNotes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const version = req.query.version as string | undefined;
    
    if (version) {
      // Get release notes for specific version
      const releaseNote = await getReleaseNotesForVersion(version);
      if (!releaseNote) {
        return res.status(404).json({ error: "Release notes not found for version" });
      }
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      return res.status(200).json(releaseNote);
    }
    
    // Get all release notes
    const allNotes = await getReleaseNotes();
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.status(200).json(allNotes);
  } catch (error) {
    console.error("Failed to load release notes:", error);
    res.status(500).json({ error: "Failed to load release notes" });
  }
}

