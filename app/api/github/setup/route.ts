import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { githubForInstallation } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const installationId = request.nextUrl.searchParams.get("installation_id");
  if (!installationId) return NextResponse.json({ error: "Missing GitHub installation ID." }, { status: 400 });

  const octokit = githubForInstallation(installationId);
  const result = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 });
  const account = result.data.repositories[0]?.owner.login ?? "github-installation";

  await db.installation.upsert({
    where: { id: installationId },
    create: { id: installationId, account },
    update: { account }
  });
  await Promise.all(result.data.repositories.map((repo) =>
    db.repository.upsert({
      where: { id: String(repo.id) },
      create: { id: String(repo.id), fullName: repo.full_name, defaultBranch: repo.default_branch, installationId },
      update: { fullName: repo.full_name, defaultBranch: repo.default_branch, installationId, enabled: true }
    })
  ));
  return NextResponse.redirect(new URL("/?connected=1", request.url));
}