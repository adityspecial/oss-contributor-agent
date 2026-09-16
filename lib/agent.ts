import OpenAI from "openai";
import { db } from "@/lib/db";
import { githubForInstallation } from "@/lib/github";
import { allowedChange } from "@/lib/policy";

type Candidate = { issue: string; path: string; content: string; testPlan: string };

function parseCandidate(text: string): Candidate | null {
  try {
    const value = JSON.parse(text) as Candidate;
    return typeof value.issue === "string" &&
      typeof value.path === "string" &&
      typeof value.content === "string" &&
      typeof value.testPlan === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function scanRepository(repositoryId: string) {
  const repository = await db.repository.findUnique({ where: { id: repositoryId } });
  if (!repository || !repository.enabled) return { status: "skipped" };

  const scan = await db.scan.create({ data: { repositoryId, status: "scanning" } });
  const [owner, repo] = repository.fullName.split("/");
  const octokit = githubForInstallation(repository.installationId);

  try {
    const tree = await octokit.git.getTree({
      owner, repo, tree_sha: repository.defaultBranch, recursive: "true"
    });
    const paths = tree.data.tree
      .filter((entry) => entry.type === "blob" && entry.path && /\.(ts|tsx|js|jsx|py|go|rb)$/.test(entry.path))
      .map((entry) => entry.path!)
      .filter((path) => !path.startsWith(".github/") && !path.includes("lock"))
      .slice(0, 6);

    if (!paths.length) throw new Error("No supported source files found.");

    const excerpts = await Promise.all(paths.map(async (path) => {
      const result = await octokit.repos.getContent({ owner, repo, path, ref: repository.defaultBranch });
      if (Array.isArray(result.data) || result.data.type !== "file" || !("content" in result.data)) return "";
      return `FILE: ${path}\n${Buffer.from(result.data.content, "base64").toString("utf8").slice(0, 9000)}`;
    }));

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: `You are a cautious maintenance engineer. Review these files from ${repository.fullName}.
Return only a JSON object with issue, path, content, and testPlan.
Return {\"issue\":\"\",\"path\":\"\",\"content\":\"\",\"testPlan\":\"\"} when there is no genuine, reproducible, low-risk defect.
If proposing a fix, modify exactly one existing source or test file. content must be the complete replacement file. Never alter CI, dependencies, auth, secrets, or deployment configuration.
\n\n${excerpts.filter(Boolean).join("\n\n")}`
    });
    const candidate = parseCandidate(response.output_text);

    await db.repository.update({ where: { id: repositoryId }, data: { lastScannedAt: new Date() } });
    if (!candidate || !candidate.issue || !allowedChange(candidate.path, candidate.content)) {
      await db.scan.update({ where: { id: scan.id }, data: { status: "no_safe_change", summary: "No verified, policy-compliant improvement found." } });
      return { status: "no_safe_change" };
    }

    const existing = await octokit.repos.getContent({ owner, repo, path: candidate.path, ref: repository.defaultBranch });
    if (Array.isArray(existing.data) || existing.data.type !== "file" || !("sha" in existing.data)) {
      throw new Error("The candidate must modify an existing file.");
    }

    const branch = await octokit.repos.getBranch({ owner, repo, branch: repository.defaultBranch });
    const branchName = `oss-agent/${new Date().toISOString().slice(0, 10)}-${scan.id.slice(-6)}`;
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: branch.data.commit.sha });
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, branch: branchName, path: candidate.path,
      message: `fix: ${candidate.issue.slice(0, 72)}`,
      content: Buffer.from(candidate.content).toString("base64"),
      sha: existing.data.sha
    });
    const pr = await octokit.pulls.create({
      owner, repo, head: branchName, base: repository.defaultBranch,
      title: `fix: ${candidate.issue.slice(0, 72)}`,
      body: `## Automated maintenance\n\n**Problem:** ${candidate.issue}\n\n**Validation plan:** ${candidate.testPlan}\n\nThis PR is eligible for automatic squash-merge only after the repository's checks complete successfully.`
    });
    await db.scan.update({ where: { id: scan.id }, data: { status: "waiting_for_checks", summary: candidate.issue, pullRequest: pr.data.number } });
    return { status: "waiting_for_checks", pullRequest: pr.data.number };
  } catch (error) {
    await db.scan.update({ where: { id: scan.id }, data: { status: "failed", summary: error instanceof Error ? error.message : "Unknown scan failure" } });
    return { status: "failed" };
  }
}