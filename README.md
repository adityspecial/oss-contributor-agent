# OSS Contributor Agent

A GitHub App–based service that scans approved repositories on a schedule and opens a pull request only for verified, low-risk improvements.

## What it does

1. A user installs the GitHub App on selected repositories.
2. The app records the installation and selected repository IDs in Postgres.
3. A scheduled job obtains a short-lived installation token, gathers repository context, and asks OpenAI for one safe candidate fix.
4. The service validates the candidate, creates a branch and pull request, and records the run.

The application never stores a user personal-access token. It uses GitHub App installation tokens that are minted only while a scan is running.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Create a GitHub App with repository permissions: `Contents: Read & write`, `Pull requests: Read & write`, `Issues: Read & write`, and `Metadata: Read-only`. Configure its setup URL as `https://YOUR_DOMAIN/api/github/setup`.

Set the GitHub App's callback URL to `https://YOUR_DOMAIN/api/github/callback` if you later add user OAuth. This MVP uses the App-installation flow, which is sufficient for choosing repositories and creating pull requests.

## Deployment

- Deploy to Vercel (or another Node host).
- Provision Postgres and set `DATABASE_URL`.
- Add the values in `.env.example` as encrypted host secrets.
- Configure the scheduler to call `POST /api/cron/scan` twice daily with `Authorization: Bearer $CRON_SECRET`.

## Safety controls

- Only repositories explicitly connected through the app are scanned.
- One PR at most per repository per day.
- Generated changes are limited to a single text file and must include a test plan.
- The agent cannot merge, delete branches, change workflows, or alter dependency lockfiles.
- Production use should add a sandboxed checkout and test runner before enabling automatic PRs.
