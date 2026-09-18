# Phase 6 Legacy History Archive

This branch is an archival reachability collector. It MUST NOT be merged into production authority branches.
Historical branch tips are attached with `git merge -s ours` so their commit DAG remains reachable while the archive branch retains its own file tree.

Current production authorities at archive creation/reconciliation:

- `master` — `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`
- `phase6-integration` — `a7620ecf698ceed827304d345f59f4cdee190482`
- `phase6-vh14-module-integration-runner` — `c346b59d74474459601b3e4f0f6b8b414d2541e4`

| Historical branch | Frozen tip SHA | Preservation |
| --- | --- | --- |
| `ci-log04-continuation-harness` | `ddcb5af2ee038f6fd6407fd19afac0dc276ef7dc` | history-only merge into `archive/phase6-legacy-history` |
| `codex/phase6-windows-watcher-compat-repair-r2` | `4622ac5523c29fc140db962cdd47f3b910cf7648` | history-only merge into `archive/phase6-legacy-history` |
| `foundation-v1-3-exact-proof-dbec3f7` | `04c2d4eedf0edd83fd0ecbcf94cc30dc95f4dfd1` | history-only merge into `archive/phase6-legacy-history` |
| `foundation-v1-3-t3-builder` | `54d9f227fb2b5682fdc0385240fd3de3ce5f05c0` | history-only merge into `archive/phase6-legacy-history` |
| `foundation-v1-3-t3-exact-proof-05600f7` | `a757231d59b64efca624f6c7ba9e4099dc5c4e66` | history-only merge into `archive/phase6-legacy-history` |
| `g-r1-adversarial-transition-quiescence-proof-g01` | `6a5f34953576b31f950ee5a125eb5d9100ca3f0b` | history-only merge into `archive/phase6-legacy-history` |
| `g-r2-r3-ambiguity-folder-recovery-proof-g02` | `8b5deb68a625d11d7543e779acd59a3ea81ae3cd` | history-only merge into `archive/phase6-legacy-history` |
| `g-r2-r3-ambiguity-folder-recovery-proof-g02-r2` | `5f89e4bdc8703d2d219a2656e345989c781b09a8` | history-only merge into `archive/phase6-legacy-history` |
| `g-r2-r3-ambiguity-folder-recovery-proof-g02-r3` | `db0a7cebc8eb15062868c0248184b645566d562d` | history-only merge into `archive/phase6-legacy-history` |
| `h-final-authoritative-clean-verification-h14` | `7d71bfb6e11bc776754789a697ffe11048dccf18` | history-only merge into `archive/phase6-legacy-history` |
| `h-final-canonical-append-h14` | `029f5eaebe39ed91d3a9aa1dca3d318f430b11fb` | history-only merge into `archive/phase6-legacy-history` |
| `h-norm-production-structure-audit-h13` | `72a0fd0c8799fbc661504e4eba5dc01bce1f541a` | history-only merge into `archive/phase6-legacy-history` |
| `h-norm-production-structure-audit2-h13` | `3afa764a33d7a6c51b33e5ab52338d961cc421b5` | history-only merge into `archive/phase6-legacy-history` |
| `h-norm-production-structure-build-h13` | `da05fbb2731c28b6bfcbf129b24c41c9d128d271` | history-only merge into `archive/phase6-legacy-history` |
| `h-norm-production-structure-proof-h13` | `2c30fc378202d668bd6aba365160ad7b1dd59132` | history-only merge into `archive/phase6-legacy-history` |
| `h-norm-residual-comment-fix-h13` | `d03a4039eb506b3c6f1c044ae30c4c1bc48475d3` | history-only merge into `archive/phase6-legacy-history` |
| `h-supervisor-production-normalization-plan` | `b0721f91b7d168a973d0986ed637c8d4833cc432` | history-only merge into `archive/phase6-legacy-history` |
| `h-u4-c2-exit-proof-h02` | `89d667cf91f7056e589e0a542a0f6f3c174a6e27` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p1-proof-h02` | `4c576b0cf546407b68609a640973d67fb11896f7` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p1-proof-h02-r2` | `09bd42e2bc1aa4c3df545ccae61e298f99e10ad0` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p1-proof-h02-r3` | `b34615a65501fda391cbaae339a308685ef907b0` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p10-ios-sync-diagnostics-proof-h12` | `8282784adbe68fa67da9fee114d2cd0790e9f7ff` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p10-ios-sync-diagnostics-proof-h12-r2` | `c4b7ba1af2092b95a53989926586609c97ccb4c2` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p2-olf-static-proof-h04` | `59a604d1e613e200507691d1f27f58762bf3881d` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p2-provenance-restoration-proof-h04` | `7348150e1beb2e53f924019d42fcf04ccba80799` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-diagnostic-h05` | `4f29a7f89ce6c0763c61f6c8e31fa093334d0800` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05` | `c2cddffdb1a3901c6bd1506dec910d2f9faa1cbd` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-2` | `848962f89780d7ab86a60ecf895bd5e5f52651ce` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-final` | `b3cf9b907ea9856a43019737c1bd3dd052451061` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-final2` | `1286e1298db7ec81d1b837aa5251df0a2576482a` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-final3` | `03ea930e03351209e76550c8678006e9a209e57d` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-final4` | `641c31af9ca71539c077314bb37821b6594c6cfd` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p3-group-d-first-sync-proof-h05-final5` | `adcfc0f2d25ffa4915417e6eeaaef860f4eb62d2` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p4-group-d-active-run-proof-h06` | `5a980370da47ae03e6735398cfd7f66ea9ea3511` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p5-group-d-conflict-destruction-proof-h07` | `9885c4cf6b5a304ced4c88a98c5fcfb8d913f39e` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p6-group-d-recovery-coordination-proof-h08` | `99ded1776f0bd3981fc6c37b5249a8c4dd6b8db8` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p7-group-d-acceptance-proof-h09` | `0c5790e0e6e25e7c960a3bbbf478de8a8a913a34` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p8-implementation-h10` | `809c6e618c329b3416ff751561cc7951cdaf7c3b` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p8-remaining-compatibility-proof-h10` | `6f3d2b9fd874ece36aacb355646b6eb65502895c` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p9-candidate-build-h11-r3` | `0be0be425b57ba23b5a0a2663ddf7f027758f5af` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p9-shared-olf-fake-auth-diagnostic-h11-r2` | `b6c8d269755821791ce46babd86bcd1b83ebae7c` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p9-shared-olf-fake-auth-proof-h11` | `5b1961206092e65228afa5bcaa827faafef4b6b0` | history-only merge into `archive/phase6-legacy-history` |
| `h-u5-p9-shared-olf-fake-auth-proof-h11-final` | `e25e856d4377da4b60c65e42d93f1511d98da650` | history-only merge into `archive/phase6-legacy-history` |
| `h-v1-3-abd-authority-proof-h03` | `721b20db77266fd707ef75c23428898dd706b1d8` | history-only merge into `archive/phase6-legacy-history` |
| `h-v1-3-abd-integration-proof-h03` | `aed46a507ac4410383030232f6642ef5cac38486` | history-only merge into `archive/phase6-legacy-history` |
| `h-v1-3-foundation-adoption-proof-h02` | `c02d98420771b38977ba4251c2dd4b77300205f6` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-alpha-ios-local-safety-fix` | `c252526da0fd6752da154c8dcdba8cf468140bab` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-latency-optimization-tasking` | `73aa7e7bcb4d502f46e099ec6a60996c2c7a6926` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-live-windows-watcher-compat-repair` | `6072fb55294a0807b43e002e2fc128613c44265e` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-live-windows-watcher-compat-repair-r1` | `6072fb55294a0807b43e002e2fc128613c44265e` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-logging-log06-diagnostic-bundle-operator-surface` | `4e713755f2cbd7571257bc5a813411d32df93eb4` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-logging-log07-end-to-end-observability-verification` | `694a4278829f9c55c75d8c8a17a9e0903f0ddd7f` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.10` | `736c3a7b3ae52aee0a44e000a5620e3954117215` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.11` | `7b1822db2e0ede3eff8aba19ba864ade6a734976` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.12` | `c14ac5c92ecf059bee1293ac2e03c32a8f68198b` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.13` | `e49de7a4f579cd2c0404deb26e0ddbd04936d422` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.8` | `aa96b63c86a01d288a10e0369720ce7f29dcc31d` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-real-platform-release-0.1.9` | `a35f7997985ba0d810513f01541fdd7ef3c29667` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-release-0.1.10-exec` | `e0d407b7f7326d9b1c588f671ee9666ca15fa770` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-adversarial-model` | `f446789fc6cef268fa9b21448ef42947f767ff91` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-architecture-foundation` | `a27e3e198de0f08a51482ae647ffe5aca967f436` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-foundation-v1.3-failure-provenance` | `888637a216816053698c7f50b9fef17ce161342f` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-lifecycle` | `ebdc995a7880d33597820b1d241dff437b7d7c92` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-local` | `592a6d5fdeb0ace89fbb5fdf1ca3c7cc3cbc0df9` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-local-v1.3-provenance-extension` | `b9a1bad1e6216f0866c44d7d6cb949d2d88faa42` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-merge` | `ce29c398c84df38ceb944a8fc0b4ded3afaf67b6` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-orchestration` | `5497234d8bdb8587f0fad083ade6daed572c144e` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-orchestration-v1.1-continuation` | `bec4b64bb84fc147db39c004f959f8e09db5945e` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-orchestration-v1.2-continuation` | `a4a733bf1e36d768688bb0b3af14108ef3044a60` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-orchestration-v1.2-d-c13` | `0cf088d706b0d78fa193c6886b80be91aeb0d00e` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-orchestration-v1.3-provenance-extension` | `1423d3e0fac6e11cebddabfa16793deb06109c21` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-remote` | `4b7d7a3bd7178477adcb08d4cb318116416f515d` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-remote-v1.2-continuation` | `3a974ca32f10db985a50c02623bd6764f84df617` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-remote-v1.3-provenance-extension` | `c984ef8c48b1b8da546331414985dd76df6a3996` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-state` | `59ed9d4e2e2b08347a68976bb922dd7bf79e5f16` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-sync-state-v1.1-continuation` | `ae9b11bd4ce82e5568f6e5ca2a0bee52657d7392` | history-only merge into `archive/phase6-legacy-history` |
| `phase6-vh04-safety-sandbox-ci-verification` | `a703de0fae7310870cb0dc2a64a145100c5cb894` | history-only merge into `archive/phase6-legacy-history` |
| `proof-d-v1.3-exact-ci` | `68a8a67a1363cdd6af3376d2fa75265ffcd4e711` | history-only merge into `archive/phase6-legacy-history` |
| `proof-d-v1.3-provenance-extension` | `562d7f05feefad4db24be034d496abb1531cdc7c` | history-only merge into `archive/phase6-legacy-history` |
| `proof-d-v1.3-provenance-trigger` | `ff3a1fed7bc407c4decaab50b30b424589f26164` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.11-exec` | `1499df988a2b56a130ea01aba1d8182021a473a5` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.13-exec` | `66946c0aebe566032ebf6072775c5bf80138a256` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.14-exec` | `da7533bb23c2878eff08ac69507f20fccb39c218` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.15-publisher` | `8db1e91d2e9fd377ffcfa41c304b3ccbf48582b5` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.16-publisher` | `19f161f33e813df60580ea39b6a916def3f5d92e` | history-only merge into `archive/phase6-legacy-history` |
| `release-0.1.17-publisher` | `e7219559e0a71740eafbbd2f8d83bf3c7aefba63` | history-only merge into `archive/phase6-legacy-history` |
| `tmp-log05-debug-tooling` | `284973903fc3da82768b0a497d53fe7bb4a29dbb` | history-only merge into `archive/phase6-legacy-history` |
| `tmp-log05-execution-tooling` | `c19a856df7550aca3cc08bc18611e15e03930f39` | history-only merge into `archive/phase6-legacy-history` |
| `tmp-log05-verify-debug` | `0651ba558493741e9e4c0462abcb592ecbd813c2` | history-only merge into `archive/phase6-legacy-history` |
| `vh08-exact-tree-verify-a0159b08` | `9129a85e4f976a66aad727b359d403faa691c25d` | history-only merge into `archive/phase6-legacy-history` |

Deleting the original branch refs after successful reachability verification does not remove these commits from the repository DAG.
