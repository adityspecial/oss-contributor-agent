import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanRepository } from "@/lib/agent";
import { mergeReadyPullRequests } from "@/lib/merge";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merges = await mergeReadyPullRequests();
  const repositories = await db.repository.findMany({ where: { enabled: true } });
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const eligible = repositories.filter((repo) => !repo.lastScannedAt || repo.lastScannedAt.getTime() < cutoff);
  const scans = [];
  for (const repository of eligible) scans.push(await scanRepository(repository.id));

  return NextResponse.json({ merges, scans });
}