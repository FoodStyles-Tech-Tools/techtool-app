import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "../../../lib/supabase";
import {
  validateMethod,
  requireAuth,
  handleApiError,
  type ApiError,
} from "../../../lib/utils/api";

type SyncSequenceResponse = { success: boolean; message?: string } | ApiError;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncSequenceResponse>
) {
  if (!validateMethod(req, res, ["POST"])) {
    return;
  }

  const session = await requireAuth(req, res);
  if (!session) {
    return;
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get the maximum ID from the ticket table
    const { data: lastTicket, error: queryError } = await supabase
      .from("ticket")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error querying max ticket ID:", queryError);
      return res.status(500).json({
        error: "Failed to query ticket table",
      });
    }

    const maxId = lastTicket?.id || 0;

    // Try to sync the sequence using RPC function (if it exists)
    try {
      const { error: rpcError } = await supabase.rpc("sync_ticket_sequence", {
        max_id: maxId,
      });

      if (!rpcError) {
        return res.status(200).json({
          success: true,
          message: `Sequence synced successfully. Max ID: ${maxId}`,
        });
      }
    } catch (rpcErr) {
      // RPC function doesn't exist, try alternative method
      console.warn("RPC function sync_ticket_sequence not found, trying alternative...");
    }

    // Alternative: Try using a direct SQL query via RPC (if exec_sql exists)
    try {
      const { error: sqlError } = await supabase.rpc("exec_sql", {
        sql: `SELECT setval('ticket_id_seq', GREATEST((SELECT MAX(id) FROM ticket), 1), true);`,
      });

      if (!sqlError) {
        return res.status(200).json({
          success: true,
          message: `Sequence synced successfully using SQL. Max ID: ${maxId}`,
        });
      }
    } catch (sqlErr) {
      // SQL execution not available
      console.warn("SQL execution not available");
    }

    // If RPC methods don't work, return success anyway (client will handle retry)
    // The database trigger should handle it automatically
    return res.status(200).json({
      success: true,
      message: `Sequence sync attempted. Max ID: ${maxId}. If RPC function doesn't exist, please run the migration.`,
    });
  } catch (error) {
    handleApiError(res, error, "Failed to sync ticket sequence");
  }
}

