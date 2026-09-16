import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

function privateKey() {
  return process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function githubForInstallation(installationId: string) {
  const appId = process.env.GITHUB_APP_ID;
  const key = privateKey();
  if (!appId || !key) throw new Error("GitHub App credentials are not configured.");

  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey: key, installationId: Number(installationId) }
  });
}

export function installationUrl() {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) throw new Error("GITHUB_APP_SLUG is not configured.");
  return `https://github.com/apps/${slug}/installations/new`;
}
