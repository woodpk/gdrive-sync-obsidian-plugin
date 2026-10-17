# TG-02 — Azure OAuth Callback Deployment Without GitHub Actions

**Status:** PLANNING HANDOFF / DEPLOYMENT OWNER DECISION REQUIRED; NO DEPLOYMENT AUTHORIZED  
**Repository:** woodpk/gdrive-sync-obsidian-plugin  
**Original baseline:** `b1e2ebaee3077e34a4eefaf601ee8124078b7400`  
**Remediation branch:** `repair/testing-governance-ptar-v2-20261017`  
**Governance:** Current shared Operating Protocol §21.1; accepted DEC-338; explicit owner directive: GitHub Actions must not be used.

## Retired current source

The candidate remediation branch deletes these workflows to eliminate prohibited GitHub Actions mechanisms:
- `.github/workflows/phase1-ci.yml` — master CI / typecheck / test / build / optional lockfile-writing.
- `.github/workflows/phase6-alpha-diagnostic-ci.yml` — phase6 CI / testing / evidence.
- `.github/workflows/azure-static-web-apps-witty-water-08743b310.yml` — Azure Static Web Apps OAuth callback deployment/cleanup from phase6-integration branch events.

The deletions preserve prior Git history, do not modify `oauth-callback/**` or existing externally deployed callback bytes, and have NO effect on master until separately approved integration. Do not interpret workflow removal as verifying the OAuth callback, its availability, or a new deployment method.

## Safe future end state

A designated integration/deployment owner must select and document an explicit, independently authorized **non-GitHub-Actions** way to deploy a validated immutable `oauth-callback/**` artifact to Azure Static Web Apps, using owner-controlled credentials without exposing tokens. Any executable software build/check/artifact-integrity/deployment-readiness verification must run in or be coordinated by PHX-CI; a direct external deployment operation must not become a second validation authority. Keep production OAuth behavior, hosted callback URL and token nonpersistence contract unchanged. Require exact source/artifact/deployment identity and rollback/maintenance plan before production changes.

If no approved deployment interface exists, callback redeployment is **BLOCKED**. This does not by itself imply the previously deployed service has stopped working. Do not activate or redeploy now.

## Ownership and stop

**Owner:** deployment/infrastructure maintainer under supervisor and product-owner authority, separately from independent Test Author. **Test ownership:** independent test author for any callback validation coverage; **execution:** distinct PHX-CI Test Execution Agent. This task is a future plan, not deployment authorization.