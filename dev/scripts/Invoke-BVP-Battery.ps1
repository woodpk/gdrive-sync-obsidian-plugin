# F1 fail-closed retired operator: no standalone compilation, validation, or result publication.
# Live scenario definitions, physical checkpoints and receipt/recovery behavior remain
# intact under test-platform/, but may only run when PHX-CI owns/co-ordinates execution.
# No approved PHX-CI physical-battery adapter exists at this integration boundary.
throw 'BVP_F1_PHX_CI_REQUIRED: Standalone live BVP batteries are disabled. Do not execute or publish independent validation; an authorized PHX-CI physical-battery execution path is required before resuming S09.'
