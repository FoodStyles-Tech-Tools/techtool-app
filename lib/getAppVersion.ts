const BUILD_VERSION_SOURCES = [
  process.env.NEXT_PUBLIC_APP_VERSION,
  process.env.APP_VERSION,
  process.env.VERCEL_GIT_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.npm_package_version,
];

const BUILD_TIME_SOURCES = [
  process.env.NEXT_PUBLIC_APP_BUILD_TIME,
  process.env.APP_BUILD_TIME,
  process.env.VERCEL_GIT_COMMIT_TIME,
  process.env.BUILD_TIMESTAMP,
];

const resolvedVersion =
  BUILD_VERSION_SOURCES.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ||
  "dev";

const resolvedBuildTime =
  BUILD_TIME_SOURCES.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ||
  new Date().toISOString();

export type AppVersionInfo = {
  version: string;
  buildTime: string;
  shortVersion: string;
};

const appVersionInfo: AppVersionInfo = {
  version: resolvedVersion,
  buildTime: resolvedBuildTime,
  shortVersion: resolvedVersion.length > 12 ? resolvedVersion.slice(0, 12) : resolvedVersion,
};

export function getAppVersionInfo(): AppVersionInfo {
  return appVersionInfo;
}

export function getAppVersion(): string {
  return appVersionInfo.version;
}
