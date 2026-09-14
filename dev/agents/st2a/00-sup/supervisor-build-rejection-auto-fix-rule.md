# SUPERVISOR BUILD-REJECTION AUTO-FIX RULE

## RULE

After an independent supervisor code/build review, if the disposition is `REJECT`, the supervisor must automatically generate the corresponding bounded reject/fix task prompt and push it to:

`dev/agents/`

in the repository being reviewed.

This action is part of the rejection workflow and does not require a separate user request each time.

## REQUIRED SEQUENCE

1. Complete the independent review and determine the exact rejection basis.
2. State the build disposition as `REJECT`.
3. Generate a repository-grounded reject/fix prompt that:
   - identifies the rejected exact SHA;
   - identifies the exact continuation branch/input rule;
   - preserves already-correct implementation and frozen boundaries;
   - describes the confirmed defect or evidence gap precisely;
   - bounds authorized files/scope where appropriate;
   - defines objective acceptance and verification requirements;
   - preserves open/unmerged PR and release/live-test stop conditions where applicable;
   - requires the agent to stop rather than broaden scope if a materially new defect is exposed.
4. Push that prompt into `dev/agents/` on the current supervisor/integration tasking branch.
5. Report the prompt path and tasking commit SHA to the user together with the rejection disposition.

## WRITE AUTHORITY INTERPRETATION

For this project, creation of the reject/fix task prompt under `dev/agents/` is explicitly pre-authorized whenever the supervisor rejects a reviewed build.

That standing authorization applies only to the tasking prompt required to remediate the rejection. It does **not** authorize:

- source-code repair by the supervisor;
- merging the rejected branch or PR;
- promotion into integration/main;
- release/tag/install activity;
- live Drive mutation or live-test resumption;
- unrelated repository edits.

Those actions remain subject to their existing approval/authorization gates.

## APPROVAL CASE

If the supervisor disposition is `APPROVE`, this rule does not create a reject/fix prompt.

Normal approval/promotion rules continue to apply.
