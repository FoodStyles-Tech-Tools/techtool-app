/**
 * Release Notes Management
 * Handles parsing and retrieval of release notes from markdown file
 */

import { promises as fs } from "fs";
import path from "path";

export interface ReleaseNote {
  version: string;
  releaseDate: string;
  status: "Stable" | "Beta" | "Alpha" | "Development";
  sections: {
    type: "major" | "features" | "improvements" | "fixes" | "security" | "documentation";
    title: string;
    items: string[];
  }[];
}

export interface ReleaseNotesData {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: ReleaseNote[];
}

/**
 * Parses release notes from markdown file
 */
export async function getReleaseNotes(): Promise<ReleaseNote[]> {
  const releaseNotesPath = path.join(process.cwd(), "RELEASE_NOTES.md");
  
  try {
    const content = await fs.readFile(releaseNotesPath, "utf8");
    return parseReleaseNotes(content);
  } catch (error) {
    console.error("Failed to read release notes:", error);
    return [];
  }
}

/**
 * Parses markdown content into structured release notes
 */
function parseReleaseNotes(content: string): ReleaseNote[] {
  const releases: ReleaseNote[] = [];
  const lines = content.split("\n");
  
  let currentRelease: Partial<ReleaseNote> | null = null;
  let currentSection: ReleaseNote["sections"][0] | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match version header: ### Version: X.Y.Z
    const versionMatch = line.match(/^### Version:\s*(.+)$/);
    if (versionMatch) {
      // Save previous release if exists
      if (currentRelease && currentSection) {
        // Ensure sections array exists
        if (!currentRelease.sections) {
          currentRelease.sections = [];
        }
        currentRelease.sections.push(currentSection);
        currentSection = null;
      }
      if (currentRelease) {
        // Ensure sections array exists before pushing
        if (!currentRelease.sections) {
          currentRelease.sections = [];
        }
        releases.push(currentRelease as ReleaseNote);
      }
      
      currentRelease = {
        version: versionMatch[1].trim(),
        releaseDate: "",
        status: "Development" as const,
        sections: [],
      };
      currentSection = null;
      continue;
    }
    
    // Match release date: **Release Date**: YYYY-MM-DD
    const dateMatch = line.match(/\*\*Release Date\*\*:\s*(.+)/);
    if (dateMatch && currentRelease) {
      currentRelease.releaseDate = dateMatch[1].trim();
      continue;
    }
    
    // Match status: **Status**: Stable | Beta | Alpha
    const statusMatch = line.match(/\*\*Status\*\*:\s*(.+)/);
    if (statusMatch && currentRelease) {
      const status = statusMatch[1].trim() as ReleaseNote["status"];
      currentRelease.status = status;
      continue;
    }
    
    // Match section headers: #### 🎉 Major Changes, #### ✨ New Features, etc.
    const sectionMatch = line.match(/^####\s+(.+)$/);
    if (sectionMatch && currentRelease) {
      // Ensure sections array exists
      if (!currentRelease.sections) {
        currentRelease.sections = [];
      }
      
      // Save previous section if exists
      if (currentSection) {
        currentRelease.sections.push(currentSection);
      }
      
      const sectionTitle = sectionMatch[1].trim();
      const sectionType = getSectionType(sectionTitle);
      
      currentSection = {
        type: sectionType,
        title: sectionTitle,
        items: [],
      };
      continue;
    }
    
    // Match list items: - Item text
    const itemMatch = line.match(/^-\s+(.+)$/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1].trim());
      continue;
    }
  }
  
  // Save last section and release
  if (currentSection && currentRelease) {
    // Ensure sections array exists
    if (!currentRelease.sections) {
      currentRelease.sections = [];
    }
    currentRelease.sections.push(currentSection);
  }
  if (currentRelease) {
    // Ensure sections array exists before pushing
    if (!currentRelease.sections) {
      currentRelease.sections = [];
    }
    releases.push(currentRelease as ReleaseNote);
  }
  
  return releases;
}

/**
 * Maps section titles to section types
 */
function getSectionType(title: string): ReleaseNote["sections"][0]["type"] {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("major") || lowerTitle.includes("breaking")) {
    return "major";
  }
  if (lowerTitle.includes("feature") || lowerTitle.includes("new")) {
    return "features";
  }
  if (lowerTitle.includes("improvement") || lowerTitle.includes("enhance")) {
    return "improvements";
  }
  if (lowerTitle.includes("fix") || lowerTitle.includes("bug")) {
    return "fixes";
  }
  if (lowerTitle.includes("security")) {
    return "security";
  }
  if (lowerTitle.includes("documentation") || lowerTitle.includes("doc")) {
    return "documentation";
  }
  
  return "improvements"; // Default
}

/**
 * Gets release notes for a specific version
 */
export async function getReleaseNotesForVersion(
  version: string
): Promise<ReleaseNote | null> {
  const allNotes = await getReleaseNotes();
  return allNotes.find((note) => note.version === version) || null;
}

/**
 * Gets release notes for versions newer than the specified version
 */
export async function getReleaseNotesSinceVersion(
  currentVersion: string
): Promise<ReleaseNote[]> {
  const allNotes = await getReleaseNotes();
  const currentIndex = allNotes.findIndex((note) => note.version === currentVersion);
  
  if (currentIndex === -1) {
    // If current version not found, return all notes
    return allNotes;
  }
  
  // Return notes for versions after current version
  return allNotes.slice(0, currentIndex);
}

