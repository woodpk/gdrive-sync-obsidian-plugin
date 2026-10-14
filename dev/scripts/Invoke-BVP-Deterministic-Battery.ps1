# F1 fail-closed retired operator: no standalone compilation, validation, or result publication.
# Deterministic BVP suites remain under test-platform/ and run as PHX-CI-focused tests
# through the pinned PHX-CI operator, not through this historical battery launcher.
throw 'BVP_F1_PHX_CI_REQUIRED: Standalone deterministic BVP battery execution is disabled. Use PHX-CI with the repository-controlled npm run test:bvp-root focused command; PHX-CI owns the verification and evidence publication.'
