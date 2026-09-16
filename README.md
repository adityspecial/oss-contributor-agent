# OSS Contributor Agent

A GitHub App-based service that autonomously scans approved repositories, produces one verified low-risk improvement, opens a pull request, and merges it when the repository's checks pass.

## End-to-end flow

Install GitHub App → selected repositories saved → twice-daily scan → candidate fix → branch + PR → target-repository CI checks pass → signed GitHub webhook → squash merge

No human approval is needed in the normal path. A merge is deliberately blocked if there are no completed checks, a check fails, GitHub branch protection rejects it, or the proposed change violates policy.

## Credentials and access

The service never stores a user's personal access token.

- A user installs the GitHub App only on chosen repositories.
- The service records the installation ID and repository IDs in Postgres.
- At scan time, it mints a short-lived GitHub App installation token.
- OpenAI access uses a server-side API key held only in the deployment's encrypted environment secrets.
- The browser receives neither credential.

Create a GitHub App with repository permissions: Contents Read & write, Pull requests Read & write, Issues Read & write, and Metadata Read-only.

Configure the app URLs:

- Setup URL: https://YOUR_DOMAIN/api/github/setup
- Webhook URL: https://YOUR_DOMAIN/api/github/webhook
- Webhook secret: the same value as GITHUB_WEBHOOK_SECRET
- Events: Check suite

## Local setup

Run: npm install, then copy .env.example to .env, run npm run db:generate, npm run db:migrate, and npm run dev.

## Deployment

1. Deploy to a Node-compatible host such as Vercel.
2. Provision Postgres and configure DATABASE_URL.
3. Add every value in .env.example as an encrypted deployment secret.
4. Configure a twice-daily scheduler to call POST /api/cron/scan with Authorization: Bearer $CRON_SECRET. Vercel uses vercel.json automatically.
5. Enable CI checks in every connected target repository.

## Automatic merge prerequisites

For full automation, each target repository must permit the GitHub App to create and merge pull requests and must have at least one required CI check. Do not require a human review from the App itself: GitHub will correctly reject a self-approved PR. Branch protection remains the final authority.

## Guardrails

- Only repositories selected during GitHub App installation are scanned.
- One agent PR per repository per 24 hours.
- The agent edits exactly one existing source or test file.
- It cannot touch workflows, lock files, deployment configuration, credentials, or infrastructure.
- It uses squash merge only after all reported checks are completed with success, neutral, or skipped.
