const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getGitSha() {
  try {
    const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    if (sha) return sha;
  } catch {
    // ignore, fall back to package.json version
  }
  return null;
}

function main() {
  const rootDir = __dirname ? path.resolve(__dirname, "..") : process.cwd();
  const envPath = path.join(rootDir, ".env");

  const packageJson = require(path.join(rootDir, "package.json"));
  const pkgVersion = (packageJson.version || "0.0.0").trim();

  const gitSha = getGitSha();
  const appVersion = gitSha || pkgVersion;

  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  }

  const lines = existing.split(/\r?\n/).filter(Boolean).filter((line) => !line.startsWith("VITE_APP_VERSION="));
  lines.push(`VITE_APP_VERSION=${appVersion}`);

  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`[set-app-version-env] VITE_APP_VERSION=${appVersion}`);
}

main();

