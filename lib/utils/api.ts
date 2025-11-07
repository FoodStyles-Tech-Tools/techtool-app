/**
 * Utility functions for API route handlers
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../pages/api/auth/[...nextauth]";

export interface ApiError {
  error: string;
}

/**
 * Validates that the request method is allowed
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns true if method is allowed, false otherwise
 */
export function validateMethod(
  req: NextApiRequest,
  res: NextApiResponse<ApiError>,
  allowedMethods: string[]
): boolean {
  if (!allowedMethods.includes(req.method ?? "")) {
    res.setHeader("Allow", allowedMethods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

/**
 * Validates that the user is authenticated
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @returns The session if authenticated, null otherwise
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse<ApiError>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return session;
}

/**
 * Handles API errors consistently
 * @param res - Next.js API response
 * @param error - The error object
 * @param defaultMessage - Default error message if error message is not available
 */
export function handleApiError(
  res: NextApiResponse<ApiError>,
  error: unknown,
  defaultMessage: string
): void {
  console.error(defaultMessage, error);
  const message =
    error instanceof Error ? error.message : defaultMessage;
  res.status(500).json({ error: message });
}

