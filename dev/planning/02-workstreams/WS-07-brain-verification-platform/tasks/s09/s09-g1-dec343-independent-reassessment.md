# Independent Adversarial Reassessment — S09 G1 Plugin Data Integrity + DEC-343 Development-Artifact Gate

## 1. Assignment and immutability

You are the **independent architectural, correctness, security, and governance reviewer** for the BRAIN Obsidian/Google Drive synchronization product. You are **not** the implementing agent.

This is **STRICTLY READ-ONLY**. Review source and evidence with the connected GitHub and Google Drive tools. **Do not** edit any file, create commits/branches/PRs, run tests/builds/scripts/PHX-CI, install or activate software, manipulate a vault or Google Drive data, initiate S09 physical work, merge, or approve a release artifact. This assignment requests a finding and recommendation, not implementation or owner authorization.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`

| Identity | Exact value |
|---|---|
| **PHX-CI-verified implementation source** | `41dcc92954608214329974bd847b1741b6d37ba5` |
| Verified source Git tree | `363b011f2eec1220e007d8b3112ec06c66bc36e9` |
| Accepted pre-change `master` baseline | `b1e2ebaee3077e34a4eefaf601ee8124078b7400` |
| Implementation branch | `fix/s09g1-plugin-data-existing-null-guard-20261014` |
| PHX-CI run ID | `1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc` |
| PHX-CI runtime SHA | `69c4aa077d4a1a46d1e85e59f39d36285be99e83` |
| Framework version | `0.2.0-dev.2` |
| **Original PHX-CI evidence commit** | `4e0b225b44e0227390decc176b762ed8ff435556` |
| Canonical evidence-recovery / state-only descendant | `c855ad42e7b55c6a1efcc638986d22be6035fde3` |
| Development `main.js` size | 905,089 bytes |
| Development `main.js` SHA-256 | `98cb628178e2591c1e2ca95554a4cee2650127b685cdb3cc1a689416411338b8` |

The original evidence commit is a direct descendant of the verified source, and later evidence/handoff/reviewer-prompt commits **must not** be substituted as the source SHA tested. Resolve the repository's latest refs for orientation but inspect the exact immutable implementation commit when evaluating changed code.

PHX-CI outcome for that source: **COMPLETE / PASS**, all **11/11** stages PASS, focused BVP **403/403**, full product **990/990**, typecheck/build/repository gates and artifact checks PASS, exit 0. This establishes **software verification**, not independent-review approval, owner promotion authorization, device-level physical acceptance, or permission to install/release/activate.

## 2. Required governance and evidence reading

Read and apply:

1. Original [Agent-Led Software Engineering Operating Protocol](https://docs.google.com/document/d/1cbJV1WIVkhIy86zZLkvw6Gkk-bKjSyLCWU9whlhfLRc), especially §§4–5.1, 8, 17, 21.1–21.2, 27.1, 35, 35.1, and 37.1. Review-only evidence inspection is permitted; PHX-CI remains the exclusive executable validation authority.
2. `dev/authority/decision-register.yaml`: **DEC-340, DEC-341, DEC-342, DEC-343**, including exact boundaries of earlier owner decisions and inherited release restrictions.
3. `dev/authority/governance/locks/testing-platform-boundary.yaml`, and relevant `dev/planning/01-target-system/**`, `dev/planning/02-workstreams/WS-07-brain-verification-platform/**`, `dev/planning/03-verification/**` controls. Read the accepted current sources necessary to establish the pertinent constraints; do not treat archived historical tasks as new authority.
4. `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`, especially **Established evidence and limits**, **Required before acceptance**, and **DEC-343 — ordinary development verification gate staged, unverified**. Historical statements marked unverified are superseded by the exact later PHX-CI results; do not erase the still-unresolved physical data-loss question.
5. `dev/state/current-state.yaml` and `dev/state/handoffs/current-engineering-handoff.md` as of the evidence-recovery descendant. Distinguish administrative state changes from implementation changes.
6. Canonical evidence `dev/test-results/1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc/result.json`, `result.md`, `terminal.log`, and `evidence-recovery.md`. Reconcile with the original timestamped PHX-CI files published in evidence commit `4e0b225b44e0227390decc176b762ed8ff435556`, and with `dev/_ca-output.json` / `dev/_ca-output.md` at the original evidence commit.
7. Historical independent DEC-339/DEC-340 review and DEC-340-01 finding from `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-post-platform-integration-independent-reassessment.md` and its identified review/governance records, for context **only**. They do not themselves approve or reject this distinct candidate.

Perform a line-grounded Git comparison of the exact source commit against the baseline. Avoid trusting implementation-agent commentary in place of direct code and evidence review.

## 3. Mandatory adversarial questions — G1 plugin-data safety

Inspect `src/main.ts`, `src/product/plugin-data.ts`, `test/plugin-data-integrity-regression.test.ts`, `test/phase5-product.test.ts`, the amended legacy test fixtures, and the actual Obsidian adapter and plugin configuration contracts as available.

1. Does `PluginDataHost.dataFileExists()` point to **the same canonical file** that Obsidian `Plugin.loadData()` / `Plugin.saveData()` use on all supported configurations? Check `manifest.dir`, `manifest.id`, `vault.configDir`, `normalizePath`, adapter visibility, and mobile/desktop path assumptions.
2. Does a null/undefined load with an existing file **fail closed before any write**, without accidental settings, device ID, vault ID, remote-root ID, diagnostics, sync-attention, or audit reinitialization? Examine rejected promise reuse, error propagation through `onload()`, and alternate save paths.
3. Are absent-file, unreadable-file, malformed-root, partial-object, exception, permission, and race/TOCTOU cases handled according to the actual contract? Distinguish proven behavior from untested filesystem/provider assumptions; specifically analyze whether `exists() === false` is sufficient evidence of a legitimate first installation versus a disappeared prior data file.
4. Does serialized `saveData()` preserve independent fields and immutable snapshots after failure, cancellation, concurrent settings/diagnostics/audit activity, or subsequent retry?
5. Are the five new G1 regressions and four corrected legacy mocks semantically faithful, sufficient, and actually counted within the PHX-CI executed suite? Identify missing **high-risk** tests even if all current tests passed.
6. Is this a **risk mitigation**, not proof of the original physical `data.json` loss/corruption mechanism? Do not claim S09A physical acceptance or root-cause closure absent evidence.

## 4. Mandatory adversarial questions — DEC-343 governance/security

Inspect the exact diffs of `test-platform/src/repository-check.ts`, `test-platform/test/repository-check-integration.test.ts`, associated architecture guards/locks and PHX-CI context handoff.

1. Prove or falsify that explicit `BRAIN_ARTIFACT_PURPOSE=development` allows PHX-CI development artifact SHA observation for **ordinary** code changes, while ordinary frozen-surface modifications remain blocked, and the combined frozen DEC-343 change was appropriately classified as **authorized-governance**.
2. Verify that default/`promotion` preserves the frozen historical release-hash allowlist, package identity, required artifact existence/readability, independent architecture guard and LOC budgets, source provenance, production/test isolation, and fail-closed behavior. No newly observed `main.js` SHA is release approved.
3. **Independently reexamine confirmed DEC-340-01 (MAJOR)**: caller-supplied development-mode flags and a structurally valid but unauthenticated verification-context JSON previously permitted a forged development-observation PASS. Does DEC-343 retain or enlarge this risk for ordinary builds? Explore attack paths without executing proof scripts or tests; identify any new distinct vulnerabilities and whether the unchanged finding has material bearing on this candidate.
4. DEC-341 was a **bounded prior deferral** and DEC-342 was a **separate prior merge decision**; neither silently grants a waiver or merge authorization for this new G1/DEC-343 candidate. Assess the independent verdict and owner decision boundary explicitly; never downgrade a known MAJOR defect because prior software-only integration occurred.
5. Confirm the new artifact hash is only a recorded development observation and that it does not turn on synchronization, verification-platform authority, installation, release, or activation.

## 5. Evidence and promotion boundary

Validate by **reading** PHX-CI evidence, without rerunning it:

- Verify the exact source SHA, tree, baseline, runtime, run ID, all stage statuses, test counts, command scopes, build result, architecture/repository-check result, generated `main.js` size and SHA-256.
- Confirm whether the evidence-recovery descendant contains only administrative/evidence/handoff files, with the canonical `dev/test-results/1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc/` copies using the **same original Git blob identities**. Administrative evidence recovery must not be misrepresented as a new verification execution or prompt a repeated owner-run SUT test under §37.1.
- Keep four questions separate: **(a)** SUT PHX-CI PASS, **(b)** independent reviewer verdict, **(c)** owner-controlled software master promotion, and **(d)** separately gated artifact release/physical S09/activation.
- Do not authorize master merge as part of this review. Release/activation remains blocked regardless of software review outcome. Historical `data.json` loss root cause and S09 physical evidence are still outstanding.

## 6. Required report and stop

Return a concise, substantive **APPROVE / REJECT / INDETERMINATE** verdict **for this combined S09 G1 + DEC-343 candidate**. Separately identify **G1 correctness/safety** and **DEC-343 governance/security** dispositions before the combined verdict.

For every material finding provide: **severity (CRITICAL/MAJOR/MINOR), immutable source path and line(s), failure mechanism, exact evidence, impact, and smallest bounded correction**. Identify established defects separately from plausible risks or evidence gaps. Explicitly restate original verified source/run/evidence identities, confirmed PHX-CI status, scope actually reviewed, surviving prior DEC-340-01 disposition, and whether this candidate may be **presented for a separate owner software-promotion decision**. Do not assume the prior owner deferral authorizes this candidate. Indicate unreviewed material scope as INDETERMINATE rather than declaring success.

**STOP after the read-only report.** No code changes, tests, PHX-CI reruns, issue filing, branch changes, merge, installation, live Drive/vault activity, or release/activation.

**Exact Tasking Location:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`, S09 entries; active G1 tasking `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`, **Required before acceptance**. This independent-review prompt is a review gate, **not** authorization to begin preplanned physical task `tasks/s09/09a-windows-ios-install-authentication-and-pairing-baseline.md`.
