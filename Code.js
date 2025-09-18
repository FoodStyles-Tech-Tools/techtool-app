// Client ID and Secret from Script Properties.
const CLIENT_ID =
  PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
const CLIENT_SECRET =
  PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");

// NEW: Supabase configuration from Script Properties
const SUPABASE_URL =
  PropertiesService.getScriptProperties().getProperty("SUPABASE_URL");
const SUPABASE_ANON_KEY =
  PropertiesService.getScriptProperties().getProperty("SUPABASE_ANON_KEY");

// MODIFIED: Changed table name from "teamMember" to "user" to match your Supabase schema.
const SUPABASE_TABLE_NAME = "user";

const FAVICON_URL =
  "https://drive.google.com/uc?export=download" +
  "&id=1Lp_N2cdiIQUDGdoFNn9b-wDDA9TiQFcu" +
  "&format=png";

/**
 * Main function that runs when the web app is accessed.
 */
function doGet(e) {
  // helper to inject favicon + title
  function withFavicon(htmlOutput, title) {
    return htmlOutput.setFaviconUrl(FAVICON_URL).setTitle(title);
  }

  // MODIFIED: Read both 'ticket' and 'unassigned' parameters
  let ticket = e.parameter.ticket || null;
  let unassigned = e.parameter.unassigned || null;

  // Flow 1: returning from OAuth
  if (e.parameter.code) {
    if (e.parameter.state) {
      try {
        const decodedState = decodeURIComponent(e.parameter.state);
        const state = JSON.parse(decodedState);
        // MODIFIED: Restore both parameters from state
        ticket = state.ticket || ticket;
        unassigned = state.unassigned || unassigned;
      } catch (err) {
        console.error("Could not parse state parameter: " + err);
      }
    }

    exchangeCodeForToken(e.parameter.code);
    Utilities.sleep(1000);
    const token = getValidToken();
    if (token) {
      const userInfo = getUserInfo(token);
      if (userInfo && userInfo.email) {
        // MODIFIED: Pass both parameters to the router
        return withFavicon(
          routeUser(userInfo.email, ticket, unassigned),
          "TechTool App"
        );
      }
    }
    // Fallback to login page with toast.
    const tpl1 = HtmlService.createTemplateFromFile("LoginPage");
    // MODIFIED: Pass both parameters to generate auth URL
    tpl1.authorizationUrl = getAuthorizationUrl(ticket, unassigned);
    tpl1.scriptUrl = ScriptApp.getService().getUrl();
    tpl1.showToast = true;
    return withFavicon(tpl1.evaluate(), "Login Required");
  }

  // Flow 2: existing session
  const token = getValidToken();
  if (token) {
    const userInfo = getUserInfo(token);
    if (userInfo && userInfo.email) {
      // MODIFIED: Pass both parameters to the router
      return withFavicon(
        routeUser(userInfo.email, ticket, unassigned),
        "TechTool App"
      );
    }
  }

  // Flow 3: fresh visit
  const tpl2 = HtmlService.createTemplateFromFile("LoginPage");
  // MODIFIED: Pass both parameters to generate auth URL
  tpl2.authorizationUrl = getAuthorizationUrl(ticket, unassigned);
  tpl2.scriptUrl = ScriptApp.getService().getUrl();
  tpl2.showToast = false;
  return withFavicon(tpl2.evaluate(), "Login Required");
}

// In your Code.gs file, find the routeUser function

function routeUser(email, ticket, unassigned) {
  const userData = getUserData(email);
  if (userData.isWhitelisted) {
    const template = HtmlService.createTemplateFromFile("webapp.html");
    template.email = email;
    template.name = userData.name || "User";
    template.mode = userData.mode || "light";
    // MODIFICATION: Pass the user's role to the client.
    template.role = userData.role || "User";

    if (unassigned) {
      template.initialView = "unassigned";
      template.ticketNumber = unassigned;
    } else if (ticket) {
      // MODIFIED: Changed 'all' to 'my-ticket'
      template.initialView = "my-ticket";
      template.ticketNumber = ticket;
    } else {
      template.initialView = "";
      template.ticketNumber = "";
    }

    template.scriptUrl = ScriptApp.getService().getUrl();
    template.faviconUrl = FAVICON_URL;
    return template.evaluate().setTitle("TechTool App");
  } else {
    // ... (rest of the function is unchanged)
    const template = HtmlService.createTemplateFromFile("NotRegisteredPage");
    template.email = email;
    template.scriptUrl = ScriptApp.getService().getUrl();
    return template.evaluate().setTitle("Access Denied");
  }
}

function getAuthorizationUrl(ticket, unassigned) {
  // MODIFIED: Added 'unassigned' parameter
  const redirectUri = ScriptApp.getService().getUrl();
  let authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  authUrl += `?client_id=${CLIENT_ID}`;
  authUrl += `&redirect_uri=${redirectUri}`;
  authUrl += "&response_type=code";
  authUrl += "&scope=https://www.googleapis.com/auth/userinfo.email";
  authUrl += "&access_type=offline&prompt=consent";

  // MODIFIED: Build a state object with any available parameters
  const state = {};
  if (ticket) {
    state.ticket = ticket;
  }
  if (unassigned) {
    state.unassigned = unassigned;
  }

  // Only add the state parameter if we have something to store
  if (Object.keys(state).length > 0) {
    authUrl += `&state=${encodeURIComponent(JSON.stringify(state))}`;
  }

  return authUrl;
}

/**
 * MODIFIED: Fetches user data from the 'user' table with added DEBUG logging.
 */
function getUserData(email) {
  // --- Start of Debugging ---
  console.log("--- Starting getUserData ---");
  console.log(`Step 1: Received email for lookup: ${email}`);

  const urlFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_URL");
  const keyFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_ANON_KEY");

  console.log(`Step 2: Supabase URL from Script Properties: ${urlFromProps}`);
  console.log(
    `Step 3: Supabase Anon Key from Script Properties is ${
      keyFromProps ? "set" : "NOT SET or empty"
    }.`
  );
  // --- End of Debugging ---

  if (!urlFromProps || !keyFromProps) {
    console.error(
      "CRITICAL ERROR: Supabase URL or Anon Key is not configured correctly in Project Settings > Script Properties."
    );
    return { isWhitelisted: false, name: null, mode: null, role: null };
  }

  // MODIFICATION: Added 'role' to the select query.
  const constructedUrl = `${urlFromProps}/rest/v1/${SUPABASE_TABLE_NAME}?select=name,email,mode,role&email=ilike.${encodeURIComponent(
    email
  )}`;

  // --- Start of Debugging ---
  console.log(
    `Step 4: Constructed URL for Supabase request: ${constructedUrl}`
  );
  // --- End of Debugging ---

  try {
    const response = UrlFetchApp.fetch(constructedUrl, {
      headers: {
        apikey: keyFromProps,
        Authorization: `Bearer ${keyFromProps}`,
      },
      muteHttpExceptions: true,
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // --- Start of Debugging ---
    console.log(`Step 5: Received HTTP Response Code: ${responseCode}`);
    console.log(
      `Step 6: Received raw text response from Supabase: ${responseText}`
    );
    // --- End of Debugging ---

    if (responseCode !== 200) {
      console.error(
        `Supabase query failed. Check your URL, Key, and Table Name.`
      );
      return { isWhitelisted: false, name: null, mode: null, role: null };
    }

    const data = JSON.parse(responseText);

    if (data && data.length > 0) {
      console.log("Step 7: SUCCESS - User found in Supabase data.");
      const user = data[0];
      return {
        isWhitelisted: true,
        name: user.name,
        mode: user.mode,
        // MODIFICATION: Return the user's role.
        role: user.role,
      };
    } else {
      console.log(
        "Step 7: FAILED - User was NOT found in the Supabase response (response was empty). This is causing the 'Access Denied' error."
      );
      return { isWhitelisted: false, name: null, mode: null, role: null };
    }
  } catch (e) {
    console.error("CRITICAL ERROR in getUserData function: " + e.toString());
    return { isWhitelisted: false, name: null, mode: null, role: null };
  }
}

/**
 * MODIFIED: Updates the user's display mode in the 'user' table.
 */
function updateUserMode(mode) {
  const token = getValidToken();
  if (!token) return;

  const userInfo = getUserInfo(token);
  if (!userInfo || !userInfo.email) return;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "Supabase URL or Anon Key is not configured in Script Properties."
    );
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?email=eq.${encodeURIComponent(
    userInfo.email
  )}`;

  try {
    UrlFetchApp.fetch(url, {
      method: "patch",
      contentType: "application/json",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      payload: JSON.stringify({ mode: mode }),
      muteHttpExceptions: true,
    });
  } catch (e) {
    console.error("Error in updateUserMode for Supabase: " + e.toString());
  }
}

// --- OAUTH AND UTILITY FUNCTIONS (Unchanged) ---

function exchangeCodeForToken(code) {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const payload = {
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: ScriptApp.getService().getUrl(),
    grant_type: "authorization_code",
  };
  const options = {
    method: "post",
    payload: payload,
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(tokenUrl, options);
  const data = JSON.parse(response.getContentText());

  if (data.access_token) {
    const userProperties = PropertiesService.getUserProperties();
    const existingToken = JSON.parse(
      userProperties.getProperty("googleToken") || "{}"
    );
    data.granted_time = Date.now();
    const newToken = { ...existingToken, ...data };
    userProperties.setProperty("googleToken", JSON.stringify(newToken));
  } else {
    console.error("Error exchanging code for token: " + JSON.stringify(data));
  }
}

function getValidToken() {
  const userProperties = PropertiesService.getUserProperties();
  const tokenString = userProperties.getProperty("googleToken");
  if (!tokenString) return null;

  let token = JSON.parse(tokenString);
  const isExpired =
    token.granted_time + (token.expires_in - 60) * 1000 < Date.now();
  if (isExpired) {
    if (!token.refresh_token) {
      console.error("Token expired, but no refresh token is available.");
      return null;
    }

    const tokenUrl = "https://oauth2.googleapis.com/token";
    const payload = {
      refresh_token: token.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    };
    const options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(tokenUrl, options);
    const refreshedData = JSON.parse(response.getContentText());

    if (refreshedData.access_token) {
      refreshedData.granted_time = Date.now();
      token = { ...token, ...refreshedData };
      userProperties.setProperty("googleToken", JSON.stringify(token));
    } else {
      console.error(
        "Failed to refresh token: " + JSON.stringify(refreshedData)
      );
      return null;
    }
  }

  return token;
}

function getUserInfo(token) {
  if (!token || !token.access_token) return null;
  const url = "https://www.googleapis.com/oauth2/v2/userinfo";
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + token.access_token },
    muteHttpExceptions: true,
  });
  const responseText = response.getContentText();
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse user info: " + responseText);
    return null;
  }
}

function logout() {
  const token = getValidToken();
  if (token) {
    const tokenToRevoke = token.refresh_token || token.access_token;
    const revokeUrl =
      "https://oauth2.googleapis.com/revoke?token=" + tokenToRevoke;
    UrlFetchApp.fetch(revokeUrl, {
      method: "get",
      muteHttpExceptions: true,
    });
  }
  PropertiesService.getUserProperties().deleteProperty("googleToken");
}

/**
 * Fetches Discord IDs and names for a given list of user IDs from Supabase.
 * @param {number[]} userIds - An array of user IDs.
 * @returns {object} A map of userId -> { discordId, name }.
 */
function getDiscordIds(userIds) {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const urlFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_URL");
  const keyFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_ANON_KEY");

  // Fetch both the discordId AND the name for a fallback, looking up by user ID
  const constructedUrl = `${urlFromProps}/rest/v1/user?select=id,discordId,name&id=in.(${userIds.join(
    ","
  )})`;

  try {
    const response = UrlFetchApp.fetch(constructedUrl, {
      headers: {
        apikey: keyFromProps,
        Authorization: `Bearer ${keyFromProps}`,
      },
      muteHttpExceptions: true,
    });

    const data = JSON.parse(response.getContentText());
    if (data && data.length > 0) {
      // Create a map of { userId: { discordId, name } } for easy lookup
      return data.reduce((acc, user) => {
        acc[user.id] = { discordId: user.discordId, name: user.name };
        return acc;
      }, {});
    }
  } catch (e) {
    console.error("Error fetching Discord IDs: " + e.toString());
  }
  return {};
}

/**
 * Fetches Discord IDs for a given list of user names from Supabase.
 * @param {string[]} userNames - An array of user names.
 * @returns {object} A map of userName -> discordId.
 */
function getDiscordIdsByNames(userNames) {
  if (!userNames || userNames.length === 0) {
    return {};
  }

  const urlFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_URL");
  const keyFromProps =
    PropertiesService.getScriptProperties().getProperty("SUPABASE_ANON_KEY");

  // Query the 'user' table where the 'name' column is in our list of names
  const constructedUrl = `${urlFromProps}/rest/v1/user?select=name,discordId&name=in.(${userNames
    .map((name) => `"${encodeURIComponent(name)}"`)
    .join(",")})`;

  try {
    const response = UrlFetchApp.fetch(constructedUrl, {
      headers: {
        apikey: keyFromProps,
        Authorization: `Bearer ${keyFromProps}`,
      },
      muteHttpExceptions: true,
    });

    const data = JSON.parse(response.getContentText());
    if (data && data.length > 0) {
      // Create a map of { userName: discordId } for easy lookup
      return data.reduce((acc, user) => {
        acc[user.name] = user.discordId;
        return acc;
      }, {});
    }
  } catch (e) {
    console.error("Error fetching Discord IDs by name: " + e.toString());
  }
  return {};
}

/**
 * Constructs and sends a formatted notification to Discord via webhook.
 * @param {Array<object>} insertedTickets - The array of new ticket objects from the client.
 * @param {string} creatorName - The name of the user who created the tickets.
 */
function sendDiscordNotification(insertedTickets, creatorName) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty(
    "DISCORD_WEBHOOK_URL"
  );
  if (!webhookUrl || !insertedTickets || insertedTickets.length === 0) {
    return;
  }

  // 1. Get all unique assignee IDs that need a Discord ID lookup
  const assigneeIdsToFetch = [
    ...new Set(
      insertedTickets
        .map((ticket) => ticket.assigneeId) // Using assigneeId again
        .filter((id) => id != null)
    ),
  ];

  // 2. Fetch the corresponding Discord IDs using the ID-based function
  const discordIdMap = getDiscordIds(assigneeIdsToFetch);
  const appUrlBase =
    "https://script.google.com/a/macros/foodstyles.com/s/AKfycbyLsFfdDaPFxxV3uGm92BbnAK1_Ai_pbfXSnMPOjKHX9aeBXUUmXultZ65cjudinE_b0Q/exec?authuser=0&ticket=HRB-";
  const roleIdToMention = "1174256958853881936";

  // 3. Build the description by iterating through each new ticket
  let description = insertedTickets
    .map((ticket) => {
      const ticketUrl = `${appUrlBase}${ticket.id}`;
      const titleLink = `[**[HRB-${ticket.id}]** - ${
        ticket.title || "Untitled"
      }](${ticketUrl})`;

      let assigneeText;
      if (ticket.assigneeId) {
        const assigneeInfo = discordIdMap[ticket.assigneeId]; // Look up by ID
        if (assigneeInfo && assigneeInfo.discordId) {
          // Use Discord ID mention if available
          assigneeText = `<@${assigneeInfo.discordId}>`;
        } else if (assigneeInfo && assigneeInfo.name) {
          // Fallback to the user's name if no Discord ID is found
          assigneeText = `*${assigneeInfo.name}*`;
        } else {
          assigneeText = `*Unknown User (ID: ${ticket.assigneeId})*`;
        }
      } else {
        assigneeText = `Available to Pull <@&${roleIdToMention}>`;
      }

      const details = `**Type:** ${ticket.type} | **Priority:** ${ticket.priority}`;

      return `${titleLink}\n**Assignee:** ${assigneeText}\n${details}`;
    })
    .join("\n\n");

  // 4. Construct the final Discord embed payload
  const payload = {
    username: "HarryBotter",
    avatar_url:
      "https://drive.google.com/uc?export=download&id=1LE0v5c_VUERk5ZhW4laTa2S-A0pLcRnd",
    embeds: [
      {
        author: {
          name: `${creatorName} created ${insertedTickets.length} new ticket(s)!`,
        },
        description: description,
        color: 5198181,
        footer: {
          text: "TechTool Notification System",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // 5. Send the request to Discord
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (e) {
    console.error("Failed to send Discord notification: " + e.toString());
  }
}
