# BRAIN Verification Platform — Authority Transition Reconciliation

## Purpose

This reconciliation records the relationship between the historical Phase-6 internal validation-harness authority transition and the repository's current canonical development-directory standard. It does not create a competing decision system; controlling decisions remain in `dev/authority/decision-register.yaml`.

## Historical transition retained

The earlier BVP authority transition correctly established that:

- the internal Phase-6 validation-harness architecture was superseded;
- DEC-301 through DEC-310 became historical rather than active architecture authority;
- the BRAIN Verification Platform became the active automated-testing architecture;
- obsolete validation-harness tasking and evidence had to become inert historical material rather than remain active implementation authority.

Those conclusions remain valid.

## Repository-layout supersession

The historical transition originally placed retired development material under `dev/archive/**` and kept current authority/planning under legacy locations such as `dev/planning-and-building/**` and `dev/governance/**`.

That location model is superseded by DEC-332 through DEC-335 and by the shared external engineering standards referenced from `dev/authority/external-authorities.md`.

Current canonical rules are:

- retired development generations live outside active `dev/` under `archive/<generation>/DEV/**`;
- material decisions live in `dev/authority/decision-register.yaml`;
- repository contracts live in `dev/authority/contracts/`;
- governance locks live in `dev/authority/governance/locks/`;
- active target/workstream/verification planning lives in `dev/planning/`;
- current continuity state lives in `dev/state/`;
- historical PHX-CI execution evidence lives in `dev/Test-Results/<runId>/`;
- no standardized `dev/agents/` hierarchy exists.

## Current migration mapping

| Historical active location | Canonical destination |
| --- | --- |
| `dev/planning-and-building/decision-register.yaml` | `dev/authority/decision-register.yaml` |
| `dev/planning-and-building/phase6-sync-architecture-foundation.md` | `dev/authority/contracts/phase6-sync-architecture-foundation.md` |
| `dev/planning-and-building/phase6-sync-contract-freeze.md` | `dev/authority/contracts/phase6-sync-contract-freeze.md` |
| `dev/governance/testing-platform-boundary.yaml` | `dev/authority/governance/locks/testing-platform-boundary.yaml` |
| `dev/archive/**` | `archive/pre-standard-dev-layout-2026-10/DEV/archive/**` during the current migration |

The original detailed transition mechanics remain recoverable from Git history and the preserved pre-standard archive generation. They are historical evidence, not current location authority.
