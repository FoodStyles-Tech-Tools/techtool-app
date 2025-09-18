import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getSupabaseServerClient } from "../../../lib/supabase";

type TicketPayload = {
  id: number;
  title?: string | null;
  type?: string | null;
  priority?: string | null;
  assigneeId?: number | null;
};

type DiscordUserInfo = {
  id: number;
  discordId?: string | null;
  name?: string | null;
};

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

  const { insertedTickets, creatorName } = req.body as {
    insertedTickets?: TicketPayload[];
    creatorName?: string;
  };

  if (!insertedTickets || insertedTickets.length === 0) {
    return res.status(400).json({ error: "No tickets provided" });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Discord webhook URL not configured; skipping notification.");
    return res.status(200).json({ success: true });
  }

  const supabase = getSupabaseServerClient();
  const assigneeIds = Array.from(
    new Set(
      insertedTickets
        .map((ticket) => ticket.assigneeId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  let discordMap: Record<number, DiscordUserInfo> = {};
  if (assigneeIds.length > 0) {
    const { data, error } = await supabase
      .from("user")
      .select("id, discordId, name")
      .in("id", assigneeIds);

    if (error) {
      console.error("Failed to fetch Discord IDs", error);
    } else if (data) {
      discordMap = data.reduce<Record<number, DiscordUserInfo>>(
        (acc, user) => {
          acc[user.id] = user as DiscordUserInfo;
          return acc;
        },
        {}
      );
    }
  }

  const appUrlBase =
    process.env.TICKET_URL_BASE ??
    (process.env.NODE_ENV === "production" 
      ? "https://techtool-app.vercel.app/app?ticket=HRB-"
      : "http://localhost:3000/app?ticket=HRB-");

  const roleIdToMention = process.env.DISCORD_ROLE_ID ?? "1174256958853881936";

  const description = insertedTickets
    .map((ticket) => {
      const ticketUrl = `${appUrlBase}${ticket.id}`;
      const safeTitle = ticket.title ?? "Untitled";
      const assigneeInfo =
        ticket.assigneeId != null ? discordMap[ticket.assigneeId] : undefined;

      let assigneeText = `Available to Pull <@&${roleIdToMention}>`;
      if (assigneeInfo) {
        if (assigneeInfo.discordId) {
          assigneeText = `<@${assigneeInfo.discordId}>`;
        } else if (assigneeInfo.name) {
          assigneeText = `*${assigneeInfo.name}*`;
        } else {
          assigneeText = `*Unknown User (ID: ${ticket.assigneeId})*`;
        }
      } else if (ticket.assigneeId) {
        assigneeText = `*Unknown User (ID: ${ticket.assigneeId})*`;
      }

      return `[` +
        `**[HRB-${ticket.id}]** - ${safeTitle}` +
        `](${ticketUrl})\n**Assignee:** ${assigneeText}\n` +
        `**Type:** ${ticket.type ?? ""} | **Priority:** ${ticket.priority ?? ""}`;
    })
    .join("\n\n");

  const payload = {
    username: "HarryBotter",
    avatar_url:
      "https://drive.google.com/uc?export=download&id=1LE0v5c_VUERk5ZhW4laTa2S-A0pLcRnd",
    embeds: [
      {
        author: {
          name: `${creatorName ?? "A user"} created ${
            insertedTickets.length
          } new ticket(s)!`,
        },
        description,
        color: 5198181,
        footer: {
          text: "TechTool Notification System",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Discord webhook request failed");
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Failed to send Discord notification", error);
    return res
      .status(500)
      .json({ error: error?.message ?? "Failed to send Discord notification" });
  }
}
