import { db } from "@/lib/db";
import { githubForInstallation } from "@/lib/github";

const PASSING = new Set(["success", "neutral", "skipped"]);

export async function mergeReadyPullRequests() {
  const scans = await db.scan.findMany({
    where: { status: "waiting_for_checks", pullRequest: { not: null } },
    include: { repository: true }
  });

  return Promise.all(scans.map(async (scan) => {
    const [owner, repo] = scan.repository.fullName.split("/");
    const octokit = githubForInstallation(scan.repository.installationId);
    const pr = await octokit.pulls.get({ owner, repo, pull_number: scan.pullRequest! });
    const checks = await octokit.checks.listForRef({ owner, repo, ref: pr.data.head.sha, per_page: 100 });
    const complete = checks.data.total_count > 0 &&
      checks.data.check_runs.every((check) => check.status === "completed" && PASSING.has(check.conclusion ?? ""));

    if (!complete) return { pullRequest: scan.pullRequest, status: "waiting_for_checks" };

    try {
      await octokit.pulls.merge({ owner, repo, pull_number: scan.pullRequest!, merge_method: "squash" });
      await db.scan.update({ where: { id: scan.id }, data: { status: "merged" } });
      return { pullRequest: scan.pullRequest, status: "merged" };
    } catch (error) {
      await db.scan.update({ where: { id: scan.id }, data: { status: "merge_blocked", summary: error instanceof Error ? error.message : "GitHub prevented merge" } });
      return { pullRequest: scan.pullRequest, status: "merge_blocked" };
    }
  }));
}