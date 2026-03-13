import { useEffect, useState } from "react";
import { getClientBackendUrl, getClientAppVersion } from "@client/lib/config/client-env";

type VersionStatus = "unknown" | "up_to_date" | "outdated";

type VersionState = {
  status: VersionStatus;
  clientVersion?: string;
  serverVersion?: string;
  lastCheckedAt?: number;
};

async function fetchServerVersion(baseUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(new URL("/api/version", baseUrl).toString(), {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as { version?: string };
    if (typeof data.version === "string" && data.version.trim()) {
      return data.version.trim().slice(0, 7);
    }
  } catch {
    // ignore network errors, we'll retry later
  }

  return undefined;
}

export function useVersionStatus(pollIntervalMs: number = 60_000): VersionState {
  const [state, setState] = useState<VersionState>(() => ({
    status: "unknown",
    clientVersion: getClientAppVersion(),
  }));

  useEffect(() => {
    let cancelled = false;
    const backendUrl = getClientBackendUrl();

    async function checkVersion() {
      const clientVersion = getClientAppVersion();
      const serverVersion = await fetchServerVersion(backendUrl);

      if (cancelled) return;

      if (!serverVersion || !clientVersion) {
        setState((prev) => ({
          ...prev,
          clientVersion,
          serverVersion,
          status: "unknown",
          lastCheckedAt: Date.now(),
        }));
        return;
      }

      const status: VersionStatus =
        serverVersion === clientVersion ? "up_to_date" : "outdated";

      setState({
        status,
        clientVersion,
        serverVersion,
        lastCheckedAt: Date.now(),
      });
    }

    // initial check
    void checkVersion();

    const id = window.setInterval(() => {
      void checkVersion();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollIntervalMs]);

  return state;
}

