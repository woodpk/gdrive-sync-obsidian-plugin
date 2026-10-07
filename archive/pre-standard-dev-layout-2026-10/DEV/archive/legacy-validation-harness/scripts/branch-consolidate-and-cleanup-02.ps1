# Phase 6 branch consolidation + cleanup
# Repository: woodpk/gdrive-sync-obsidian-plugin
# Generated 2026-09-18 from the user's branch-cleanup-01-delete.ps1 safety model.
#
# SAFETY MODEL
# - Default behavior is AUDIT ONLY. No remote writes are performed unless -Execute is explicitly supplied.
# - Audit mode may run `git fetch` locally to refresh remote-tracking refs; it creates no commits, branches,
#   worktrees, PR state changes, tags, or remote refs.
# - Execute mode never merges historical branches into master, phase6-integration, or the current VH control branch.
# - Unique historical lineage is preserved in ONE archive collector branch using `git merge -s ours` so the
#   commit DAG remains reachable without importing obsolete file trees into production.
# - Branch deletion occurs only after the exact audited SHA is preserved by an authority branch, immutable tag,
#   or the archive collector, and after all open-PR protection checks pass.
# - The current working tree is never switched/reset/cleaned. Archive work is performed in a temporary worktree.
# - No force-push. No tag deletion. No local branch deletion. No user worktree deletion.
#
# Recommended use:
#   .\dev\scripts\branch-consolidate-and-cleanup-02.ps1 -AuditOnly
#   .\dev\scripts\branch-consolidate-and-cleanup-02.ps1 -Execute

[CmdletBinding(DefaultParameterSetName = 'Audit')]
param (
    [Parameter(ParameterSetName = 'Audit')]
    [switch]$AuditOnly,

    [Parameter(Mandatory = $true, ParameterSetName = 'Execute')]
    [switch]$Execute
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Mode = if ($Execute) { 'EXECUTE' } else { 'AUDIT_ONLY' }
$Repo = 'woodpk/gdrive-sync-obsidian-plugin'
$DefaultBranch = 'master'
$DefaultSha = 'b1b3a4bd70cd14be49ae9085a8305f5825fccf4f'
$IntegrationBranch = 'phase6-integration'
$IntegrationSha = 'a7620ecf698ceed827304d345f59f4cdee190482'
$ControlBranch = 'phase6-vh14-module-integration-runner'
$ControlSha = 'c346b59d74474459601b3e4f0f6b8b414d2541e4'
$EvidencePath = 'dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md'
$ArchiveBranch = 'archive/phase6-legacy-history'
$ArchiveManifestPath = 'dev/archive/phase6-legacy-history.md'

$Audit = @{
    'c1-uninitialized-first-sync-fix' = 'ee7d92359228967eb3a0e68310f644ec3f647ce4'
    'ci-log04-continuation-harness' = 'ddcb5af2ee038f6fd6407fd19afac0dc276ef7dc'
    'codex/phase6-windows-watcher-compat-repair-r2' = '4622ac5523c29fc140db962cdd47f3b910cf7648'
    'dev-agent-address-codes' = 'b6057625078f28faffcd9930a9368e8ffde7fb65'
    'dev-agent-address-codes-r1' = 'fca851f222c9d82838d47417eef3282d5d6b28fa'
    'dev-agents-stage-organization-c01-path-repair-task' = 'df3e575365f31196b406b78801b27f6925095d73'
    'foundation-v1-3-exact-proof-dbec3f7' = '04c2d4eedf0edd83fd0ecbcf94cc30dc95f4dfd1'
    'foundation-v1-3-t3-builder' = '54d9f227fb2b5682fdc0385240fd3de3ce5f05c0'
    'foundation-v1-3-t3-exact-proof-05600f7' = 'a757231d59b64efca624f6c7ba9e4099dc5c4e66'
    'g-r1-adversarial-transition-quiescence-proof-g01' = '6a5f34953576b31f950ee5a125eb5d9100ca3f0b'
    'g-r2-r3-ambiguity-folder-recovery-proof-g02-r2' = '5f89e4bdc8703d2d219a2656e345989c781b09a8'
    'g-r2-r3-ambiguity-folder-recovery-proof-g02-r3' = 'db0a7cebc8eb15062868c0248184b645566d562d'
    'g-r2-r3-ambiguity-folder-recovery-proof-g02' = '8b5deb68a625d11d7543e779acd59a3ea81ae3cd'
    'h-final-authoritative-clean-verification-h14' = '7d71bfb6e11bc776754789a697ffe11048dccf18'
    'h-final-canonical-append-h14' = '029f5eaebe39ed91d3a9aa1dca3d318f430b11fb'
    'h-norm-production-structure-audit2-h13' = '3afa764a33d7a6c51b33e5ab52338d961cc421b5'
    'h-norm-production-structure-audit-h13' = '72a0fd0c8799fbc661504e4eba5dc01bce1f541a'
    'h-norm-production-structure-build-h13' = 'da05fbb2731c28b6bfcbf129b24c41c9d128d271'
    'h-norm-production-structure-proof-h13' = '2c30fc378202d668bd6aba365160ad7b1dd59132'
    'h-norm-residual-comment-fix-h13' = 'd03a4039eb506b3c6f1c044ae30c4c1bc48475d3'
    'h-supervisor-production-normalization-plan' = 'b0721f91b7d168a973d0986ed637c8d4833cc432'
    'h-u4-c2-exit-proof-h02' = '89d667cf91f7056e589e0a542a0f6f3c174a6e27'
    'h-u5-p1-proof-h02-r2' = '09bd42e2bc1aa4c3df545ccae61e298f99e10ad0'
    'h-u5-p1-proof-h02-r3' = 'b34615a65501fda391cbaae339a308685ef907b0'
    'h-u5-p1-proof-h02' = '4c576b0cf546407b68609a640973d67fb11896f7'
    'h-u5-p2-olf-static-proof-h04' = '59a604d1e613e200507691d1f27f58762bf3881d'
    'h-u5-p2-provenance-restoration-proof-h04' = '7348150e1beb2e53f924019d42fcf04ccba80799'
    'h-u5-p3-group-d-first-sync-diagnostic-h05' = '4f29a7f89ce6c0763c61f6c8e31fa093334d0800'
    'h-u5-p3-group-d-first-sync-proof-h05-2' = '848962f89780d7ab86a60ecf895bd5e5f52651ce'
    'h-u5-p3-group-d-first-sync-proof-h05-final' = 'b3cf9b907ea9856a43019737c1bd3dd052451061'
    'h-u5-p3-group-d-first-sync-proof-h05-final2' = '1286e1298db7ec81d1b837aa5251df0a2576482a'
    'h-u5-p3-group-d-first-sync-proof-h05-final3' = '03ea930e03351209e76550c8678006e9a209e57d'
    'h-u5-p3-group-d-first-sync-proof-h05-final4' = '641c31af9ca71539c077314bb37821b6594c6cfd'
    'h-u5-p3-group-d-first-sync-proof-h05-final5' = 'adcfc0f2d25ffa4915417e6eeaaef860f4eb62d2'
    'h-u5-p3-group-d-first-sync-proof-h05' = 'c2cddffdb1a3901c6bd1506dec910d2f9faa1cbd'
    'h-u5-p4-group-d-active-run-proof-h06' = '5a980370da47ae03e6735398cfd7f66ea9ea3511'
    'h-u5-p5-group-d-conflict-destruction-proof-h07' = '9885c4cf6b5a304ced4c88a98c5fcfb8d913f39e'
    'h-u5-p6-group-d-recovery-coordination-proof-h08' = '99ded1776f0bd3981fc6c37b5249a8c4dd6b8db8'
    'h-u5-p7-group-d-acceptance-proof-h09' = '0c5790e0e6e25e7c960a3bbbf478de8a8a913a34'
    'h-u5-p8-implementation-h10' = '809c6e618c329b3416ff751561cc7951cdaf7c3b'
    'h-u5-p8-remaining-compatibility-proof-h10' = '6f3d2b9fd874ece36aacb355646b6eb65502895c'
    'h-u5-p8-successor-h10' = 'b91d69f6a0460ee77fd0499b82302e8b8957eaa3'
    'h-u5-p9-candidate-build-h11-r3' = '0be0be425b57ba23b5a0a2663ddf7f027758f5af'
    'h-u5-p9-candidate-r3-h11' = '98927846c7e2db622eda38c005389d83be153bc6'
    'h-u5-p9-shared-olf-fake-auth-diagnostic-h11-r2' = 'b6c8d269755821791ce46babd86bcd1b83ebae7c'
    'h-u5-p9-shared-olf-fake-auth-proof-h11-final' = 'e25e856d4377da4b60c65e42d93f1511d98da650'
    'h-u5-p9-shared-olf-fake-auth-proof-h11' = '5b1961206092e65228afa5bcaa827faafef4b6b0'
    'h-u5-p10-ios-sync-diagnostics-proof-h12-r2' = 'c4b7ba1af2092b95a53989926586609c97ccb4c2'
    'h-u5-p10-ios-sync-diagnostics-proof-h12' = '8282784adbe68fa67da9fee114d2cd0790e9f7ff'
    'h-v1-3-abd-authority-proof-h03' = '721b20db77266fd707ef75c23428898dd706b1d8'
    'h-v1-3-abd-integration-proof-h03' = 'aed46a507ac4410383030232f6642ef5cac38486'
    'h-v1-3-foundation-adoption-proof-h02' = 'c02d98420771b38977ba4251c2dd4b77300205f6'
    'master' = 'b1b3a4bd70cd14be49ae9085a8305f5825fccf4f'
    'p6-prelive-correctness-wp1' = 'f7657ba99a5a0b464b66f5f9d46ef2c4fa3e877b'
    'phase6-a03-first-sync-conflict-resolution-authority-repair' = '0226366cba21a1c31651891c6e7d4ba0a5b33335'
    'phase6-a03-first-sync-conflict-resolution-authority-repair-r1' = '145ff6898225c5737fea7dfbab2b79dc4ae7b02f'
    'phase6-a03-first-sync-lifecycle-provenance-repair-r2' = 'a707f578f6ef587b4afde6aae3002900086dca8d'
    'phase6-alpha-full-sync-remediation' = '85d509d90d475717d609c559fad870f64b956e9e'
    'phase6-alpha-ios-adapter-boundary-refactor' = '5e4b328ff31682060035ab199d95aa3712c1ee12'
    'phase6-alpha-ios-local-safety-fix' = 'c252526da0fd6752da154c8dcdba8cf468140bab'
    'phase6-alpha-ios-sync-diagnostic-logging' = '87167260c3c730003c608bf0a983429c183c7e70'
    'phase6-alpha-mixed-plan-isolation' = '9aa425d088411ab0c95da1aa8c91275bbf4e67b2'
    'phase6-alpha-plan-errors-stability' = '19187e418c3af85d9edf94aa6d9dc7cb5cf1c6ca'
    'phase6-b01-duplicate-remote-identity-root-cause-repair' = 'ab3dd0a46ab0215879cb0404d66d94e73c90dedd'
    'phase6-c01-close-c02-prep' = '2680d990362d9af4f686446fc448e2b7affbcb6e'
    'phase6-c01-ios-local-transaction-artifact-path-repair' = 'aeb37485da06d0278f1f89c1a50c50a060212615'
    'phase6-integration' = 'a7620ecf698ceed827304d345f59f4cdee190482'
    'phase6-ios-oauth-mobile-two-tap-fix' = 'a4b9ebfdf004b7d810d3d398ebd1195b00cfe3bd'
    'phase6-ios-oauth-prepared-launch-diagnostic' = 'e3b27109c92f1f9ba9226a7cae19e3c0b617797c'
    'phase6-latency-opt-01-measurement-foundation' = '73edc1af3c4bf656fdbc51a6a84ca34bcd0e2cbd'
    'phase6-latency-opt-02-local-observation-concurrency' = 'abe4e85b953e2871cae5c2f2e214d721a25007d1'
    'phase6-latency-opt-03-run-scoped-local-evidence' = '4fb05ed39527afbba3cd2c8c21cca9288e709e62'
    'phase6-latency-opt-04-precondition-dedup' = 'c7988ea0b585e1cdee1e9720f5eea509088f41e8'
    'phase6-latency-opt-05-remote-planning-fast-path' = 'a1b7aa2d98e690e1fb8c6be3fbd145d654766b9d'
    'phase6-latency-optimization-tasking' = '73aa7e7bcb4d502f46e099ec6a60996c2c7a6926'
    'phase6-live-reset-task-temp' = '2f812bd2122b14766ed8b4b1bcea6fadf6e5f345'
    'phase6-live-validation-harness-planning' = '81c34d4d9ae4b7a7a02234135486c2cd7ea8bfa8'
    'phase6-live-windows-watcher-compat-repair' = '6072fb55294a0807b43e002e2fc128613c44265e'
    'phase6-live-windows-watcher-compat-repair-r1' = '6072fb55294a0807b43e002e2fc128613c44265e'
    'phase6-log03-exact-sha-verification' = '36c9fbef4161e61fa1f32c1b9201d58b7356687a'
    'phase6-logging-log01-observability-foundation' = '48d9e612b69b43be9941f97630c580c2b8aed929'
    'phase6-logging-log02-google-http-transport-tracing' = '8dc98b23a72472362873bd2d33d90ad70d8ef330'
    'phase6-logging-log03-drive-semantic-operation-tracing' = '36c9fbef4161e61fa1f32c1b9201d58b7356687a'
    'phase6-logging-log04-sync-execution-durable-effect-tracing' = '6907001dba66a4b5649c562c81a452a3719c5356'
    'phase6-logging-log05-authority-state-recovery-tracing' = 'a9c677ca478126fc4d064947218a46f5e1184a12'
    'phase6-logging-log06-diagnostic-bundle-operator-surface' = '4e713755f2cbd7571257bc5a813411d32df93eb4'
    'phase6-logging-log07-d1-recovery-diagnostics-composition-repair' = '9955c60e806829ef23815d4bc188c95e858c9e38'
    'phase6-logging-log07-end-to-end-observability-verification' = '694a4278829f9c55c75d8c8a17a9e0903f0ddd7f'
    'phase6-logging-log07-end-to-end-observability-verification-r1' = '2b7de8418443e8ed5d0d4a154946d5ecd1b48a91'
    'phase6-logging-w1-integration' = 'fb3c48aa5fa36deab8f899b51bf9fbb237910360'
    'phase6-prelive-platform-runtime-wp2-01' = '5272532eabd5f48fd2a8225fa887e29610c63fde'
    'phase6-prerelease-0.1.18' = '28daa856a6459862ba45eef756e285effc9ce872'
    'phase6-real-platform-release-0.1.8' = 'aa96b63c86a01d288a10e0369720ce7f29dcc31d'
    'phase6-real-platform-release-0.1.9' = 'a35f7997985ba0d810513f01541fdd7ef3c29667'
    'phase6-real-platform-release-0.1.10' = '736c3a7b3ae52aee0a44e000a5620e3954117215'
    'phase6-real-platform-release-0.1.11' = '7b1822db2e0ede3eff8aba19ba864ade6a734976'
    'phase6-real-platform-release-0.1.12' = 'c14ac5c92ecf059bee1293ac2e03c32a8f68198b'
    'phase6-real-platform-release-0.1.13' = 'e49de7a4f579cd2c0404deb26e0ddbd04936d422'
    'phase6-real-platform-release-0.1.14' = '2ded7318ea567753f9d8ef241ec466e72c1435a6'
    'phase6-reconcile-docs-temp' = 'c073b68b0300a2f3c5000490d3470ca9d65fc683'
    'phase6-release-0.1.10-exec' = 'e0d407b7f7326d9b1c588f671ee9666ca15fa770'
    'phase6-sync-adversarial-model' = 'f446789fc6cef268fa9b21448ef42947f767ff91'
    'phase6-sync-architecture-foundation' = 'a27e3e198de0f08a51482ae647ffe5aca967f436'
    'phase6-sync-foundation-v1.2-remote-folder-recovery-observation' = '96b4541b15012ac4ce0d81243b73ef779efd343e'
    'phase6-sync-foundation-v1.3-failure-provenance' = '888637a216816053698c7f50b9fef17ce161342f'
    'phase6-sync-integration-h' = '1e30616ca928dc8664e47525301c50cfc6bc7048'
    'phase6-sync-integration-h-dc13-transplant-staging' = '0e49a29b9edb83c1512c46635d07afc1f8f413a7'
    'phase6-sync-integration-h-tasking-staging' = '3ecbc6993dedf58284b443cfcc1925f71d3c1b70'
    'phase6-sync-lifecycle' = 'ebdc995a7880d33597820b1d241dff437b7d7c92'
    'phase6-sync-local' = '592a6d5fdeb0ace89fbb5fdf1ca3c7cc3cbc0df9'
    'phase6-sync-local-v1.3-provenance-extension' = 'b9a1bad1e6216f0866c44d7d6cb949d2d88faa42'
    'phase6-sync-merge' = 'ce29c398c84df38ceb944a8fc0b4ded3afaf67b6'
    'phase6-sync-orchestration' = '5497234d8bdb8587f0fad083ade6daed572c144e'
    'phase6-sync-orchestration-v1.1-continuation' = 'bec4b64bb84fc147db39c004f959f8e09db5945e'
    'phase6-sync-orchestration-v1.2-continuation' = 'a4a733bf1e36d768688bb0b3af14108ef3044a60'
    'phase6-sync-orchestration-v1.2-d-c13' = '0cf088d706b0d78fa193c6886b80be91aeb0d00e'
    'phase6-sync-orchestration-v1.3-provenance-extension' = '1423d3e0fac6e11cebddabfa16793deb06109c21'
    'phase6-sync-remote' = '4b7d7a3bd7178477adcb08d4cb318116416f515d'
    'phase6-sync-remote-v1.2-continuation' = '3a974ca32f10db985a50c02623bd6764f84df617'
    'phase6-sync-remote-v1.3-provenance-extension' = 'c984ef8c48b1b8da546331414985dd76df6a3996'
    'phase6-sync-state' = '59ed9d4e2e2b08347a68976bb922dd7bf79e5f16'
    'phase6-sync-state-v1.1-continuation' = 'ae9b11bd4ce82e5568f6e5ca2a0bee52657d7392'
    'phase6-ui-plan-preview-grouping' = '8901abee0b2b2693d4c881002e228bfa4450ba63'
    'phase6-validation-harness-tasking' = '7a1ad351fcd239e02c28ff67d4992f5e7c677c80'
    'phase6-vh01-run-sandbox-checkpoint-contracts' = 'ddf5c551534decaed29b531c77b3777d389d3b50'
    'phase6-vh02-driver-plan-fault-verifier-contracts' = '147402acf471f6371ef1090c569ae7cecc3b7879'
    'phase6-vh03-coordination-evidence-freeze' = '74c6af589b2e0054f389ae6878339d1272edc47c'
    'phase6-vh04-safety-sandbox' = '7f1f3ef409869f8498efa91f1fe0ec22a7f71225'
    'phase6-vh04-safety-sandbox-ci-verification' = 'a703de0fae7310870cb0dc2a64a145100c5cb894'
    'phase6-vh05-fixture-manager' = '86c2b1da5b389679bd8d9c3fdd468fe697a56c56'
    'phase6-vh06-production-path-driver' = '6d05a1e3c1831d3460ecd3a3624dbb98aea3a3b6'
    'phase6-vh06-production-path-driver-ci-verify' = '5933313d54053bf89e6d43473c78aa8b1f3160d6'
    'phase6-vh07-plan-assertion-engine' = 'bd73a0ce713d0993cf60b6fe6c5457f3dd5e9be8'
    'phase6-vh08-state-convergence-verifier' = 'a119a741db2eb5f1c0f613490a94f6fb39f21e77'
    'phase6-vh09-evidence-recorder' = '733ed17eb3307bfdfd65a2c9032aff1c18f48b74'
    'phase6-vh10-transport-coverage-faults' = 'f2e8be3228e84b89da0f18a448b0a1d73b810a2e'
    'phase6-vh11-state-ambiguity-cancel-faults' = '130fefa991e330fdaa9a3838f473183f6256d8ba'
    'phase6-vh12-cross-device-coordinator' = '8f6754239f41055d1862274490e2cc3812dba775'
    'phase6-vh13-human-checkpoint-resume' = 'a27a3e94436f239cd1a84a30dfe316114678d7db'
    'phase6-vh14-a-integration-substrate' = 'e52b653a49490ebd1d7a8c456dad896de44dc4a7'
    'phase6-vh14-a-integration-substrate-r1' = 'a1ddc7e994bab3d5547c8fe78a0a6399b538cb36'
    'phase6-vh14-b-runner-core' = '222ba6a39b13e7adf7f1be71bade9fa45373b902'
    'phase6-vh14-c-durable-resume' = '65f533874861fd4454294bd632e71067d3b96ce7'
    'phase6-vh14-d-module-orchestration' = 'ba9d68cd5ca43bce8faf2162e1e390171d7fd837'
    'phase6-vh14-e-canary-regressions' = 'f4db2d7e1c9ff1e668338054ce36de245997372b'
    'phase6-vh14-i-integration-verify' = '82d3b2cad003498b152daead276d73976034bd73'
    'phase6-vh14-module-integration-runner' = 'c346b59d74474459601b3e4f0f6b8b414d2541e4'
    'phase6-vh14-supervisor-recovery' = '4aaede052cb028009776c89f5eab161818f5db3e'
    'proof-d-v1.3-exact-ci' = '68a8a67a1363cdd6af3376d2fa75265ffcd4e711'
    'proof-d-v1.3-provenance-extension' = '562d7f05feefad4db24be034d496abb1531cdc7c'
    'proof-d-v1.3-provenance-trigger' = 'ff3a1fed7bc407c4decaab50b30b424589f26164'
    'release-0.1.11-exec' = '1499df988a2b56a130ea01aba1d8182021a473a5'
    'release-0.1.13-exec' = '66946c0aebe566032ebf6072775c5bf80138a256'
    'release-0.1.14-exec' = 'da7533bb23c2878eff08ac69507f20fccb39c218'
    'release-0.1.15-ios-oauth-diagnostic' = 'c61c94a9d654f6f68be73f10605b70dd31fc706d'
    'release-0.1.15-publisher' = '8db1e91d2e9fd377ffcfa41c304b3ccbf48582b5'
    'release-0.1.16-ios-oauth-fix' = '9c435b72c89a098c655d060abac17f0fdaf8ddc2'
    'release-0.1.16-publisher' = '19f161f33e813df60580ea39b6a916def3f5d92e'
    'release-0.1.17-c01-artifact-path-repair' = '18b689b3b413d02e3172c8eba3d2f782c8cb8a04'
    'release-0.1.17-publisher' = 'e7219559e0a71740eafbbd2f8d83bf3c7aefba63'
    'st2a-ph6-04-lv-03-lat-06-integration' = '7ae0786ae253e41df4e0446246df4c3edd24e9d4'
    'st2a-ph6-04-lv-03-lat-07-verification' = '6d6b1d192e7cc3fe4fb1dcc919158210e0a2295e'
    '__temp-noop-ignore' = '582beada55b681ad088f3ec9cceb4f8169614aa4'
    '__temp-noop-ignore-2' = '582beada55b681ad088f3ec9cceb4f8169614aa4'
    'tmp-do-not-create' = '33b5afc8ebdf0e9f60459925819557b4e08b2d0b'
    'tmp-lat01-final-validate-c8df7baf' = '73edc1af3c4bf656fdbc51a6a84ca34bcd0e2cbd'
    'tmp-log05-debug-tooling' = '284973903fc3da82768b0a497d53fe7bb4a29dbb'
    'tmp-log05-execution-tooling' = 'c19a856df7550aca3cc08bc18611e15e03930f39'
    'tmp-log05-verify-debug' = '0651ba558493741e9e4c0462abcb592ecbd813c2'
    'vh08-exact-tree-verify-a0159b08' = '9129a85e4f976a66aad727b359d403faa691c25d'
}

# The 40 branches already independently classified as deletion-ready in branch-cleanup-01.
# These have an explicit preservation target and are NEVER sent to the archive collector.
$PreservationTarget = @{
    'phase6-alpha-full-sync-remediation' = 'phase6-integration'
    'phase6-alpha-ios-adapter-boundary-refactor' = 'phase6-integration'
    'phase6-alpha-ios-sync-diagnostic-logging' = 'phase6-integration'
    'phase6-alpha-mixed-plan-isolation' = 'phase6-integration'
    'phase6-alpha-plan-errors-stability' = 'phase6-integration'
    'phase6-vh01-run-sandbox-checkpoint-contracts' = 'phase6-vh14-module-integration-runner'
    'phase6-vh02-driver-plan-fault-verifier-contracts' = 'phase6-vh14-module-integration-runner'
    'phase6-vh03-coordination-evidence-freeze' = 'phase6-vh14-module-integration-runner'
    'phase6-vh04-safety-sandbox' = 'phase6-vh14-module-integration-runner'
    'phase6-vh05-fixture-manager' = 'phase6-vh14-module-integration-runner'
    'phase6-vh06-production-path-driver' = 'phase6-vh14-module-integration-runner'
    'phase6-vh07-plan-assertion-engine' = 'phase6-vh14-module-integration-runner'
    'phase6-vh08-state-convergence-verifier' = 'phase6-vh14-module-integration-runner'
    'phase6-vh09-evidence-recorder' = 'phase6-vh14-module-integration-runner'
    'phase6-vh10-transport-coverage-faults' = 'phase6-vh14-module-integration-runner'
    'phase6-vh11-state-ambiguity-cancel-faults' = 'phase6-vh14-module-integration-runner'
    'phase6-vh12-cross-device-coordinator' = 'phase6-vh14-module-integration-runner'
    'phase6-vh13-human-checkpoint-resume' = 'phase6-vh14-module-integration-runner'
    'phase6-vh06-production-path-driver-ci-verify' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-a-integration-substrate' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-b-runner-core' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-c-durable-resume' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-d-module-orchestration' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-e-canary-regressions' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-i-integration-verify' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-supervisor-recovery' = 'phase6-vh14-module-integration-runner'
    'phase6-vh14-a-integration-substrate-r1' = 'phase6-vh14-module-integration-runner'
    '__temp-noop-ignore' = 'phase6-vh14-module-integration-runner'
    '__temp-noop-ignore-2' = 'phase6-vh14-module-integration-runner'
    'phase6-latency-opt-01-measurement-foundation' = 'phase6-integration'
    'phase6-latency-opt-02-local-observation-concurrency' = 'phase6-integration'
    'phase6-latency-opt-03-run-scoped-local-evidence' = 'phase6-integration'
    'phase6-latency-opt-04-precondition-dedup' = 'phase6-integration'
    'st2a-ph6-04-lv-03-lat-06-integration' = 'phase6-integration'
    'st2a-ph6-04-lv-03-lat-07-verification' = 'phase6-integration'
    'tmp-lat01-final-validate-c8df7baf' = 'phase6-integration'
    'phase6-logging-log01-observability-foundation' = 'phase6-integration'
    'phase6-logging-log03-drive-semantic-operation-tracing' = 'phase6-integration'
    'phase6-logging-log05-authority-state-recovery-tracing' = 'phase6-integration'
    'phase6-log03-exact-sha-verification' = 'phase6-integration'
}

$StalePrSpecs = @(
    [pscustomobject]@{ Number=105; Head='phase6-vh04-safety-sandbox-ci-verification'; HeadSha='a703de0fae7310870cb0dc2a64a145100c5cb894'; Base='master'; Why='VH04 verification-only CI vehicle; accepted VH04 is preserved in VH14/integration.' }
    [pscustomobject]@{ Number=92; Head='phase6-latency-opt-05-remote-planning-fast-path'; HeadSha='a1b7aa2d98e690e1fb8c6be3fbd145d654766b9d'; Base='master'; Why='LAT-05 validation-only PR; branch is already in phase6-integration.' }
    [pscustomobject]@{ Number=79; Head='phase6-real-platform-release-0.1.13'; HeadSha='e49de7a4f579cd2c0404deb26e0ddbd04936d422'; Base='phase6-integration'; Why='Temporary prerelease verification PR; historical release line will be preserved by tag/authority/archive before branch deletion.' }
    [pscustomobject]@{ Number=68; Head='phase6-logging-log04-sync-execution-durable-effect-tracing'; HeadSha='6907001dba66a4b5649c562c81a452a3719c5356'; Base='ci-log04-continuation-harness'; Why='LOG-04 CI-only verification PR; implementation is already in phase6-integration.' }
    [pscustomobject]@{ Number=65; Head='phase6-logging-log02-google-http-transport-tracing'; HeadSha='8dc98b23a72472362873bd2d33d90ad70d8ef330'; Base='master'; Why='LOG-02 verification-only PR; implementation is already in phase6-integration.' }
    [pscustomobject]@{ Number=54; Head='phase6-sync-integration-h'; HeadSha='1e30616ca928dc8664e47525301c50cfc6bc7048'; Base='phase6-reconcile-docs-temp'; Why='Historical documentation reconciliation PR; both lines predate current phase6-integration authority.' }
    [pscustomobject]@{ Number=53; Head='proof-d-v1.3-exact-ci'; HeadSha='68a8a67a1363cdd6af3376d2fa75265ffcd4e711'; Base='master'; Why='Disposable exact-CI proof PR marked DO NOT MERGE.' }
    [pscustomobject]@{ Number=52; Head='proof-d-v1.3-provenance-trigger'; HeadSha='ff3a1fed7bc407c4decaab50b30b424589f26164'; Base='proof-d-v1.3-provenance-extension'; Why='Disposable proof trigger PR marked DO NOT MERGE.' }
    [pscustomobject]@{ Number=51; Head='proof-d-v1.3-provenance-extension'; HeadSha='562d7f05feefad4db24be034d496abb1531cdc7c'; Base='phase6-sync-orchestration-v1.3-provenance-extension'; Why='Historical verification-only proof PR marked DO NOT MERGE.' }
    [pscustomobject]@{ Number=50; Head='phase6-sync-orchestration-v1.3-provenance-extension'; HeadSha='1423d3e0fac6e11cebddabfa16793deb06109c21'; Base='master'; Why='Historical Workstream D v1.3 verification PR; preserve unique history in archive collector.' }
    [pscustomobject]@{ Number=49; Head='phase6-sync-remote-v1.3-provenance-extension'; HeadSha='c984ef8c48b1b8da546331414985dd76df6a3996'; Base='master'; Why='Historical Workstream A v1.3 verification PR; preserve unique history in archive collector.' }
    [pscustomobject]@{ Number=48; Head='phase6-sync-local-v1.3-provenance-extension'; HeadSha='b9a1bad1e6216f0866c44d7d6cb949d2d88faa42'; Base='phase6-integration'; Why='Historical Workstream B v1.3 verification PR; preserve unique history in archive collector.' }
    [pscustomobject]@{ Number=47; Head='phase6-sync-foundation-v1.3-failure-provenance'; HeadSha='888637a216816053698c7f50b9fef17ce161342f'; Base='master'; Why='Historical foundation v1.3 verification PR; preserve unique history in archive collector.' }
    [pscustomobject]@{ Number=46; Head='phase6-sync-orchestration-v1.2-d-c13'; HeadSha='0cf088d706b0d78fa193c6886b80be91aeb0d00e'; Base='phase6-integration'; Why='Historical bounded D-C13 branch; preserve unique history in archive collector.' }
    [pscustomobject]@{ Number=43; Head='phase6-sync-remote-v1.2-continuation'; HeadSha='3a974ca32f10db985a50c02623bd6764f84df617'; Base='master'; Why='Historical Workstream A v1.2 verification PR.' }
    [pscustomobject]@{ Number=42; Head='phase6-sync-orchestration-v1.2-continuation'; HeadSha='a4a733bf1e36d768688bb0b3af14108ef3044a60'; Base='phase6-integration'; Why='Historical Workstream D v1.2 review/CI PR.' }
    [pscustomobject]@{ Number=39; Head='phase6-sync-state-v1.1-continuation'; HeadSha='ae9b11bd4ce82e5568f6e5ca2a0bee52657d7392'; Base='phase6-integration'; Why='Historical Workstream C v1.1 verification PR.' }
    [pscustomobject]@{ Number=36; Head='phase6-sync-merge'; HeadSha='ce29c398c84df38ceb944a8fc0b4ded3afaf67b6'; Base='master'; Why='Historical Workstream F supervisor-review PR.' }
    [pscustomobject]@{ Number=35; Head='phase6-sync-state'; HeadSha='59ed9d4e2e2b08347a68976bb922dd7bf79e5f16'; Base='phase6-integration'; Why='Historical Workstream C implementation PR.' }
    [pscustomobject]@{ Number=34; Head='phase6-sync-architecture-foundation'; HeadSha='a27e3e198de0f08a51482ae647ffe5aca967f436'; Base='phase6-integration'; Why='Historical synchronization-foundation PR; later Phase 6 authority supersedes this review line.' }
)

# Historical branch families eligible for deterministic topology classification.
# IMPORTANT: this is applied ONLY to names already frozen in $Audit; a new branch can never become
# cleanup-eligible merely because its name matches one of these patterns.
$HistoricalPatterns = @(
    '^h-',
    '^g-',
    '^foundation-',
    '^proof-',
    '^phase6-sync-',
    '^phase6-real-platform-release-',
    '^phase6-release-',
    '^release-',
    '^phase6-prerelease-',
    '^phase6-live-',
    '^phase6-a03-',
    '^phase6-b01-',
    '^phase6-c01-',
    '^phase6-ios-',
    '^phase6-prelive-',
    '^phase6-alpha-',
    '^phase6-logging-',
    '^phase6-log03-',
    '^phase6-latency-',
    '^st2a-ph6-04-lv-03-lat-',
    '^p6-prelive-',
    '^c1-',
    '^ci-',
    '^codex/',
    '^dev-',
    '^tmp-',
    '^vh08-exact-tree-verify-',
    '^phase6-ui-plan-preview-grouping$',
    '^phase6-validation-harness-tasking$',
    '^phase6-reconcile-docs-temp$',
    '^phase6-vh04-safety-sandbox-ci-verification$'
)

$AbsoluteProtected = @{
    'master' = $true
    'phase6-integration' = $true
    'phase6-vh14-module-integration-runner' = $true
}

function Assert-ExitCode([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Test-IsShallowRepository {
    $value = (git rev-parse --is-shallow-repository 2>$null)
    if ($LASTEXITCODE -ne 0) { return $false }
    return ($value.Trim().ToLowerInvariant() -eq 'true')
}

function Get-RemoteHeads {
    $heads = @{}
    $lines = @(git ls-remote --heads origin)
    Assert-ExitCode 'git ls-remote --heads origin failed.'
    foreach ($line in $lines) {
        if ($line -match '^([0-9a-f]{40})\s+refs/heads/(.+)$') {
            $heads[$Matches[2]] = $Matches[1]
        }
    }
    return $heads
}

function Get-RemoteTags {
    $tags = @{}
    $lines = @(git ls-remote --tags origin)
    Assert-ExitCode 'git ls-remote --tags origin failed.'
    foreach ($line in $lines) {
        if ($line -match '^([0-9a-f]{40})\s+refs/tags/(.+?)(\^\{\})?$') {
            $name = $Matches[2]
            # Prefer peeled commit for annotated tags when present.
            $tags[$name] = $Matches[1]
        }
    }
    return $tags
}

function Get-OpenPrState {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'GitHub CLI (gh) is required. No remote writes performed.'
    }
    $json = gh pr list --repo $Repo --state open --limit 200 --json number,title,headRefName,baseRefName,isDraft
    Assert-ExitCode 'gh pr list failed.'
    $prs = @($json | ConvertFrom-Json)
    $protected = @{}
    foreach ($pr in $prs) {
        if ($pr.headRefName) { $protected[$pr.headRefName] = "PR #$($pr.number) head" }
        if ($pr.baseRefName) { $protected[$pr.baseRefName] = "PR #$($pr.number) base" }
    }
    return @{ prs=$prs; protected=$protected }
}

function Get-PrByNumber([int]$Number) {
    $json = gh pr view $Number --repo $Repo --json number,state,mergedAt,title,headRefName,headRefOid,baseRefName,isDraft
    Assert-ExitCode "gh pr view $Number failed."
    return ($json | ConvertFrom-Json)
}

function Assert-Authority {
    $heads = Get-RemoteHeads
    foreach ($pair in @(
        @($DefaultBranch, $DefaultSha),
        @($IntegrationBranch, $IntegrationSha),
        @($ControlBranch, $ControlSha)
    )) {
        $name = $pair[0]
        $expected = $pair[1]
        if (-not $heads.ContainsKey($name)) { throw "Required authority branch is missing: $name" }
        if ($heads[$name] -ne $expected) {
            throw "Authority movement: $name expected $expected actual $($heads[$name]). Re-audit required."
        }
    }
}

function Assert-EvidenceGate {
    $first = (git show "origin/$ControlBranch`:$EvidencePath" | Select-Object -First 1)
    Assert-ExitCode 'Unable to read canonical VH14 evidence from the control branch.'
    if ($null -eq $first -or $first.Trim([char]0xFEFF).Trim() -ne 'STATUS: COMPLETE') {
        throw "VH14 evidence hard gate failed. First line: [$first]"
    }
}

function Test-HistoricalManagedName([string]$Name) {
    if ($AbsoluteProtected.ContainsKey($Name)) { return $false }
    if ($Name -eq $ArchiveBranch) { return $false }
    if ($PreservationTarget.ContainsKey($Name)) { return $true }
    foreach ($pattern in $HistoricalPatterns) {
        if ($Name -match $pattern) { return $true }
    }
    return $false
}

function Get-ManagedBranches {
    $managed = @{}
    foreach ($name in $Audit.Keys) {
        if (Test-HistoricalManagedName $name) { $managed[$name] = $true }
    }
    foreach ($spec in $StalePrSpecs) {
        if ($Audit.ContainsKey($spec.Head)) { $managed[$spec.Head] = $true }
        if ($Audit.ContainsKey($spec.Base) -and -not $AbsoluteProtected.ContainsKey($spec.Base)) { $managed[$spec.Base] = $true }
    }
    return $managed
}

function Assert-BaselineCompatibility([hashtable]$Live, [hashtable]$Managed) {
    foreach ($name in $Live.Keys) {
        if ($name -eq $ArchiveBranch) { continue }
        if (-not $Audit.ContainsKey($name)) {
            throw "New branch appeared after the frozen audit: $name. Cleanup refuses to reason around newly active work. Re-audit required."
        }
        if ($Live[$name] -ne $Audit[$name]) {
            throw "Known branch moved after the frozen audit: $name expected $($Audit[$name]) actual $($Live[$name]). Re-audit required."
        }
    }
    foreach ($name in $Audit.Keys) {
        if ($Live.ContainsKey($name)) { continue }
        if (-not $Managed.ContainsKey($name)) {
            throw "Non-managed audited branch disappeared: $name. Re-audit required."
        }
    }
}


function Assert-NoUnexpectedBranchCreationOrMovement {
    $live = Get-RemoteHeads
    foreach ($name in $live.Keys) {
        if ($name -eq $ArchiveBranch) { continue }
        if (-not $Audit.ContainsKey($name)) {
            throw "Unexpected new branch appeared during cleanup: $name. Stop and re-audit."
        }
        if ($live[$name] -ne $Audit[$name]) {
            throw "Audited branch moved during cleanup: $name expected $($Audit[$name]) actual $($live[$name]). Stop."
        }
    }
}

function Test-IsAncestor([string]$Ancestor, [string]$Descendant) {
    git merge-base --is-ancestor $Ancestor $Descendant 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Get-PreservingTag([string]$Commitish) {
    $tags = @(git tag --contains $Commitish 2>$null)
    if ($LASTEXITCODE -ne 0) { return $null }
    if ($tags.Count -gt 0) { return $tags[0] }
    return $null
}

function Get-AuthorityPreserver([string]$Branch) {
    foreach ($authority in @($ControlBranch, $IntegrationBranch, $DefaultBranch)) {
        if (Test-IsAncestor "origin/$Branch" "origin/$authority") { return $authority }
    }
    return $null
}

function Assert-StalePrSpecs {
    foreach ($spec in $StalePrSpecs) {
        $pr = Get-PrByNumber $spec.Number
        if ($pr.state -eq 'OPEN') {
            if ($pr.headRefName -ne $spec.Head) { throw "PR #$($spec.Number) head changed: expected $($spec.Head), actual $($pr.headRefName)" }
            if ($pr.headRefOid -ne $spec.HeadSha) { throw "PR #$($spec.Number) head SHA changed: expected $($spec.HeadSha), actual $($pr.headRefOid)" }
            if ($pr.baseRefName -ne $spec.Base) { throw "PR #$($spec.Number) base changed: expected $($spec.Base), actual $($pr.baseRefName)" }
        }
    }
}

function Get-RemainingOpenPrProtection([hashtable]$StaleNumbers) {
    $state = Get-OpenPrState
    $protected = @{}
    foreach ($pr in $state.prs) {
        if ($StaleNumbers.ContainsKey([string]$pr.number)) { continue }
        if ($pr.headRefName) { $protected[$pr.headRefName] = "PR #$($pr.number) head" }
        if ($pr.baseRefName) { $protected[$pr.baseRefName] = "PR #$($pr.number) base" }
    }
    return @{ prs=$state.prs; protected=$protected }
}

function Get-Plan([hashtable]$Live, [hashtable]$Managed, [hashtable]$RemainingPrProtection) {
    $plan = @()
    foreach ($name in ($Managed.Keys | Sort-Object)) {
        $expectedSha = $Audit[$name]
        if (-not $Live.ContainsKey($name)) {
            $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='ALREADY_ABSENT'; PreservedBy=''; Reason='Managed branch already absent before this run.' }
            continue
        }
        if ($RemainingPrProtection.protected.ContainsKey($name)) {
            $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='KEEP_OPEN_PR'; PreservedBy=''; Reason=$RemainingPrProtection.protected[$name] }
            continue
        }
        if ($PreservationTarget.ContainsKey($name)) {
            $target = $PreservationTarget[$name]
            if (-not (Test-IsAncestor "origin/$name" "origin/$target")) {
                throw "Frozen first-wave preservation proof failed: $name is no longer an ancestor of $target."
            }
            $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='DELETE_DIRECT'; PreservedBy=$target; Reason='Previously audited preservation target.' }
            continue
        }
        $authority = Get-AuthorityPreserver $name
        if ($authority) {
            $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='DELETE_DIRECT'; PreservedBy=$authority; Reason='Exact branch tip is already reachable from retained authority.' }
            continue
        }
        $tag = Get-PreservingTag "origin/$name"
        if ($tag) {
            $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='DELETE_DIRECT'; PreservedBy="tag:$tag"; Reason='Exact branch tip is reachable from immutable tag.' }
            continue
        }
        git show-ref --verify --quiet "refs/remotes/origin/$ArchiveBranch" 2>$null
        $archiveRefExists = ($LASTEXITCODE -eq 0)
        if ($archiveRefExists) {
            if (Test-IsAncestor "origin/$name" "origin/$ArchiveBranch") {
                $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='DELETE_ARCHIVED'; PreservedBy=$ArchiveBranch; Reason='Already reachable from archive collector.' }
                continue
            }
        }
        $plan += [pscustomobject]@{ Branch=$name; Sha=$expectedSha; Action='ARCHIVE_THEN_DELETE'; PreservedBy=$ArchiveBranch; Reason='Unique historical tip; preserve DAG in archive collector with history-only merge.' }
    }
    return $plan
}

function Assert-CandidateUnmoved([object]$Item) {
    $line = @(git ls-remote --heads origin "refs/heads/$($Item.Branch)")
    Assert-ExitCode "Unable to resolve candidate $($Item.Branch)."
    if ($line.Count -ne 1 -or $line[0] -notmatch '^([0-9a-f]{40})\s+') {
        throw "Candidate $($Item.Branch) does not resolve exactly once."
    }
    if ($Matches[1] -ne $Item.Sha) {
        throw "Candidate moved: $($Item.Branch) expected $($Item.Sha) actual $($Matches[1]). Stop."
    }
}

function Write-ArchiveManifest([string]$Worktree, [object[]]$ArchiveItems) {
    $path = Join-Path $Worktree $ArchiveManifestPath
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# Phase 6 Legacy History Archive')
    $lines.Add('')
    $lines.Add('This branch is an archival reachability collector. It MUST NOT be merged into production authority branches.')
    $lines.Add('Historical branch tips are attached with `git merge -s ours` so their commit DAG remains reachable while the archive branch retains its own file tree.')
    $lines.Add('')
    $lines.Add('Current production authorities at archive creation/reconciliation:')
    $lines.Add('')
    $lines.Add(('- `{0}` — `{1}`' -f $DefaultBranch, $DefaultSha))
    $lines.Add(('- `{0}` — `{1}`' -f $IntegrationBranch, $IntegrationSha))
    $lines.Add(('- `{0}` — `{1}`' -f $ControlBranch, $ControlSha))
    $lines.Add('')
    $lines.Add('| Historical branch | Frozen tip SHA | Preservation |')
    $lines.Add('| --- | --- | --- |')
    foreach ($item in ($ArchiveItems | Sort-Object Branch)) {
        $lines.Add("| ``$($item.Branch)`` | ``$($item.Sha)`` | history-only merge into ``$ArchiveBranch`` |")
    }
    $lines.Add('')
    $lines.Add('Deleting the original branch refs after successful reachability verification does not remove these commits from the repository DAG.')
    [System.IO.File]::WriteAllLines($path, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

function Invoke-ArchiveConsolidation([object[]]$ArchiveItems) {
    if ($ArchiveItems.Count -eq 0) { return }

    $userName = (git config user.name)
    $nameExit = $LASTEXITCODE
    $userEmail = (git config user.email)
    $emailExit = $LASTEXITCODE
    if ($nameExit -ne 0 -or $emailExit -ne 0 -or [string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
        throw 'Git user.name/user.email must be configured before archive consolidation. No branch deletion has occurred.'
    }

    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("obsidian-phase6-archive-" + [Guid]::NewGuid().ToString('N'))
    $archiveWasPresent = $false
    try {
        $remote = Get-RemoteHeads
        if ($remote.ContainsKey($ArchiveBranch)) { $archiveWasPresent = $true }

        if ($archiveWasPresent) {
            git worktree add --detach $temp "origin/$ArchiveBranch" | Out-Null
            Assert-ExitCode 'Unable to create temporary archive worktree from existing archive branch.'
            git -C $temp checkout -B $ArchiveBranch "origin/$ArchiveBranch" | Out-Null
            Assert-ExitCode 'Unable to attach existing archive branch in temporary worktree.'
            if (-not (Test-IsAncestor "origin/$IntegrationBranch" "origin/$ArchiveBranch")) {
                throw "Existing $ArchiveBranch does not contain the frozen phase6-integration authority. Refusing to reuse it."
            }
            $archiveMarker = (git show "origin/$ArchiveBranch`:$ArchiveManifestPath" 2>$null | Select-Object -First 1)
            if ($LASTEXITCODE -ne 0 -or $null -eq $archiveMarker -or $archiveMarker.Trim() -ne '# Phase 6 Legacy History Archive') {
                throw "Existing $ArchiveBranch lacks the expected archive manifest marker. Refusing to reuse an untrusted archive branch."
            }
        } else {
            git worktree add --detach $temp $IntegrationSha | Out-Null
            Assert-ExitCode 'Unable to create temporary archive worktree from frozen integration SHA.'
            git -C $temp checkout -b $ArchiveBranch | Out-Null
            Assert-ExitCode 'Unable to create local archive collector branch.'
        }

        foreach ($item in ($ArchiveItems | Sort-Object Branch)) {
            # Skip already-reachable tips to make retries/resumption safe.
            git -C $temp merge-base --is-ancestor $item.Sha HEAD 2>$null
            if ($LASTEXITCODE -eq 0) { continue }

            $message = "archive(phase6): preserve $($item.Branch) at $($item.Sha)"
            git -C $temp merge --no-ff -s ours --allow-unrelated-histories -m $message $item.Sha | Out-Null
            Assert-ExitCode "History-only archive merge failed for $($item.Branch)."
        }

        Write-ArchiveManifest -Worktree $temp -ArchiveItems $ArchiveItems
        git -C $temp add -- $ArchiveManifestPath
        Assert-ExitCode 'Unable to stage archive manifest.'
        git -C $temp diff --cached --quiet
        if ($LASTEXITCODE -ne 0) {
            git -C $temp commit -m 'docs(archive): record Phase 6 legacy branch consolidation' | Out-Null
            Assert-ExitCode 'Unable to commit archive manifest.'
        }

        git -C $temp push origin "HEAD:refs/heads/$ArchiveBranch"
        Assert-ExitCode "Unable to push $ArchiveBranch."
    }
    finally {
        if (Test-Path $temp) {
            git worktree remove --force $temp 2>$null | Out-Null
        }
    }

    git fetch origin --prune | Out-Null
    Assert-ExitCode 'Fetch failed after archive push.'
    foreach ($item in $ArchiveItems) {
        if (-not (Test-IsAncestor $item.Sha "origin/$ArchiveBranch")) {
            throw "Archive reachability verification failed for $($item.Branch) ($($item.Sha)). No deletion permitted for that tip."
        }
    }
}

function Close-StalePrs {
    foreach ($spec in $StalePrSpecs) {
        $pr = Get-PrByNumber $spec.Number
        if ($pr.state -ne 'OPEN') { continue }
        # Re-check exact state immediately before the write.
        if ($pr.headRefName -ne $spec.Head -or $pr.headRefOid -ne $spec.HeadSha -or $pr.baseRefName -ne $spec.Base) {
            throw "PR #$($spec.Number) changed since audit. Refusing to close it."
        }
        Write-Host "Closing stale PR #$($spec.Number): $($pr.title)"
        gh pr close $spec.Number --repo $Repo | Out-Null
        Assert-ExitCode "Failed to close PR #$($spec.Number)."
    }
}

function Assert-OpenPrRefsExist {
    $state = Get-OpenPrState
    $heads = Get-RemoteHeads
    foreach ($pr in $state.prs) {
        if ($pr.headRefName -and -not $heads.ContainsKey($pr.headRefName)) {
            throw "Open PR #$($pr.number) head branch is missing: $($pr.headRefName)"
        }
        if ($pr.baseRefName -and -not $heads.ContainsKey($pr.baseRefName)) {
            throw "Open PR #$($pr.number) base branch is missing: $($pr.baseRefName)"
        }
    }
}

function Remove-BranchesGuarded([object[]]$DeleteItems) {
    if ($DeleteItems.Count -eq 0) { return }
    $batches = @()
    $batch = @()
    foreach ($item in ($DeleteItems | Sort-Object Branch)) {
        $batch += $item
        if ($batch.Count -ge 10) { $batches += ,$batch; $batch = @() }
    }
    if ($batch.Count -gt 0) { $batches += ,$batch }

    $batchNumber = 0
    foreach ($items in $batches) {
        $batchNumber++
        Write-Host "Deletion batch $batchNumber preflight..."
        git fetch origin --prune | Out-Null
        Assert-ExitCode "Fetch failed before deletion batch $batchNumber."
        Assert-NoUnexpectedBranchCreationOrMovement
        Assert-Authority
        Assert-EvidenceGate
        $prState = Get-OpenPrState

        foreach ($item in $items) {
            Assert-CandidateUnmoved $item
            if ($prState.protected.ContainsKey($item.Branch)) {
                throw "Deletion candidate became protected by $($prState.protected[$item.Branch]): $($item.Branch)"
            }

            if ($item.Action -eq 'DELETE_DIRECT') {
                if ($item.PreservedBy -like 'tag:*') {
                    $tagName = $item.PreservedBy.Substring(4)
                    if (-not (Test-IsAncestor $item.Sha "refs/tags/$tagName")) {
                        throw "Tag preservation proof failed immediately before deletion: $($item.Branch) -> $tagName"
                    }
                } else {
                    if (-not (Test-IsAncestor $item.Sha "origin/$($item.PreservedBy)")) {
                        throw "Authority preservation proof failed immediately before deletion: $($item.Branch) -> $($item.PreservedBy)"
                    }
                }
            } else {
                if (-not (Test-IsAncestor $item.Sha "origin/$ArchiveBranch")) {
                    throw "Archive preservation proof failed immediately before deletion: $($item.Branch)"
                }
            }
        }

        foreach ($item in $items) {
            Write-Host "Deleting remote branch $($item.Branch)"
            git push origin --delete $item.Branch
            Assert-ExitCode "Remote deletion failed for $($item.Branch)."
        }

        git fetch origin --prune | Out-Null
        Assert-ExitCode "Fetch/prune failed after deletion batch $batchNumber."
        $after = Get-RemoteHeads
        foreach ($item in $items) {
            if ($after.ContainsKey($item.Branch)) { throw "Deleted ref still exists: $($item.Branch)" }
        }
        Assert-Authority
        Assert-OpenPrRefsExist
        Write-Host "Deletion batch $batchNumber verified."
    }
}

# ------------------------- MAIN -------------------------

$originUrl = git remote get-url origin
Assert-ExitCode 'Unable to resolve origin remote.'
if ($originUrl -notmatch 'woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw "Wrong repository origin: $originUrl"
}
if (Test-IsShallowRepository) {
    throw 'Repository is shallow; full ancestry cannot be proven. Use a full clone before cleanup.'
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required for guarded PR-state verification.'
}

Write-Host "Mode: $Mode"
if (-not $Execute) {
    Write-Host 'DRY RUN: no remote refs, PRs, tags, commits, branches, or worktrees will be written.'
    Write-Host 'A local git fetch may refresh remote-tracking refs so ancestry checks use current remote state.'
}

Write-Host 'Refreshing remote objects for complete ancestry analysis...'
git fetch origin --prune --tags | Out-Null
Assert-ExitCode 'git fetch origin --prune --tags failed.'

$Managed = Get-ManagedBranches
$Live = Get-RemoteHeads
Assert-BaselineCompatibility -Live $Live -Managed $Managed
Assert-Authority
Assert-EvidenceGate
Assert-StalePrSpecs
$TagsBefore = @(git ls-remote --tags origin)
Assert-ExitCode 'Unable to snapshot tags.'

$StaleNumbers = @{}
foreach ($spec in $StalePrSpecs) { $StaleNumbers[[string]$spec.Number] = $true }
$RemainingPrProtection = Get-RemainingOpenPrProtection $StaleNumbers
$Plan = @(Get-Plan -Live $Live -Managed $Managed -RemainingPrProtection $RemainingPrProtection)

$ArchiveItems = @($Plan | Where-Object { $_.Action -eq 'ARCHIVE_THEN_DELETE' })
$DirectItems = @($Plan | Where-Object { $_.Action -eq 'DELETE_DIRECT' })
$AlreadyArchivedItems = @($Plan | Where-Object { $_.Action -eq 'DELETE_ARCHIVED' })
$KeepPrItems = @($Plan | Where-Object { $_.Action -eq 'KEEP_OPEN_PR' })
$AbsentItems = @($Plan | Where-Object { $_.Action -eq 'ALREADY_ABSENT' })
$DeleteItems = @($DirectItems + $ArchiveItems + $AlreadyArchivedItems)

Write-Host ''
Write-Host '===== CONSOLIDATION PLAN ====='
Write-Host "Frozen audited branches: $($Audit.Count)"
Write-Host "Currently present remote branches: $($Live.Count)"
Write-Host "Managed historical branches considered: $($Plan.Count)"
Write-Host "Direct delete after preservation proof: $($DirectItems.Count)"
Write-Host "History-only archive then delete: $($ArchiveItems.Count)"
Write-Host "Already archive-preserved and deletable: $($AlreadyArchivedItems.Count)"
Write-Host "Retained because of non-stale open PR: $($KeepPrItems.Count)"
Write-Host "Already absent: $($AbsentItems.Count)"
Write-Host "Stale PRs validated for closure: $($StalePrSpecs.Count)"
Write-Host "Archive collector: $ArchiveBranch"
Write-Host ''

Write-Host 'Stale PRs that would be CLOSED in execute mode:'
foreach ($spec in $StalePrSpecs) {
    $pr = Get-PrByNumber $spec.Number
    if ($pr.state -eq 'OPEN') {
        Write-Host ("  PR #{0}  head={1}  base={2}  {3}" -f $spec.Number, $spec.Head, $spec.Base, $spec.Why)
    } else {
        Write-Host ("  PR #{0}  already {1}" -f $spec.Number, $pr.state)
    }
}

Write-Host ''
Write-Host 'Branches that would be preserved in the archive collector before deletion:'
foreach ($item in ($ArchiveItems | Sort-Object Branch)) {
    Write-Host ("  {0}  {1}" -f $item.Branch, $item.Sha)
}

Write-Host ''
Write-Host 'Branches that would be deleted directly because their exact tip is already preserved:'
foreach ($item in ($DirectItems | Sort-Object Branch)) {
    Write-Host ("  {0}  {1}  preserved-by={2}" -f $item.Branch, $item.Sha, $item.PreservedBy)
}

if ($KeepPrItems.Count -gt 0) {
    Write-Host ''
    Write-Host 'Managed branches intentionally RETAINED because a non-stale open PR still uses them:'
    foreach ($item in ($KeepPrItems | Sort-Object Branch)) {
        Write-Host ("  {0}  {1}" -f $item.Branch, $item.Reason)
    }
}

if (-not $Execute) {
    $TagsAfterAudit = @(git ls-remote --tags origin)
    Assert-ExitCode 'Unable to re-check tags after dry run.'
    if (($TagsBefore -join "`n") -ne ($TagsAfterAudit -join "`n")) {
        throw 'Tag set changed during dry run; re-audit required.'
    }
    Assert-Authority
    Assert-EvidenceGate
    Write-Host ''
    Write-Host 'AUDIT COMPLETE — NO REMOTE WRITES PERFORMED'
    Write-Host "Projected stale PR closures: $($StalePrSpecs.Count) (already-closed PRs are skipped at execute time)"
    Write-Host "Projected archive-preserved branch tips: $($ArchiveItems.Count)"
    Write-Host "Projected branch deletions this run: $($DeleteItems.Count)"
    Write-Host "Projected remaining branches (plus archive collector if newly created): $($Live.Count - $DeleteItems.Count + $(if ($Live.ContainsKey($ArchiveBranch)) { 0 } else { 1 }))"
    Write-Host ''
    Write-Host 'To perform the exact guarded operations after reviewing this output, rerun with: -Execute'
    return
}

Write-Host ''
Write-Host 'EXECUTE mode explicitly enabled. No branch deletion occurs until archive preservation is completed and verified.'

# 1) Preserve all unique historical tips first.
Invoke-ArchiveConsolidation -ArchiveItems $ArchiveItems
Assert-Authority
Assert-EvidenceGate

# 2) Close only the exact pre-audited stale PRs, after history preservation.
Close-StalePrs
Assert-StalePrSpecs

# 3) Recompute live PR protection. A new/unexpected PR prevents deletion.
$OpenAfterClose = Get-OpenPrState
foreach ($item in $DeleteItems) {
    if ($OpenAfterClose.protected.ContainsKey($item.Branch)) {
        throw "Branch became protected by an open PR after stale-PR closure: $($item.Branch) ($($OpenAfterClose.protected[$item.Branch]))."
    }
}

# 4) Revalidate all archive items against the pushed collector before any deletion.
if ($ArchiveItems.Count -gt 0) {
    git fetch origin --prune | Out-Null
    Assert-ExitCode 'Fetch failed before final archive verification.'
    foreach ($item in $ArchiveItems) {
        if (-not (Test-IsAncestor $item.Sha "origin/$ArchiveBranch")) {
            throw "Final archive verification failed for $($item.Branch). No deletions performed for unverified archive history."
        }
    }
}

# 5) Delete only exact-SHA branches with immediate preservation proof.
Remove-BranchesGuarded -DeleteItems $DeleteItems

# 6) Final invariants.
$TagsAfter = @(git ls-remote --tags origin)
Assert-ExitCode 'Unable to re-inventory tags.'
if (($TagsBefore -join "`n") -ne ($TagsAfter -join "`n")) {
    throw 'Tag set changed during cleanup. Investigate immediately.'
}
Assert-NoUnexpectedBranchCreationOrMovement
Assert-Authority
Assert-EvidenceGate
Assert-OpenPrRefsExist
$Final = Get-RemoteHeads
if (-not $Final.ContainsKey($ArchiveBranch) -and $ArchiveItems.Count -gt 0) {
    throw "Archive collector is missing after cleanup: $ArchiveBranch"
}

Write-Host ''
Write-Host 'CONSOLIDATION + CLEANUP COMPLETE'
Write-Host "Starting remote branches observed: $($Live.Count)"
Write-Host "Deleted branches: $($DeleteItems.Count)"
Write-Host "Archive collector: $ArchiveBranch"
Write-Host "Final remote branches: $($Final.Count)"
Write-Host "Authorities unchanged: $DefaultBranch, $IntegrationBranch, $ControlBranch"
Write-Host 'Tags unchanged.'
Write-Host 'Remaining non-authority branches were not deleted unless exact preservation and inactivity gates passed.'
