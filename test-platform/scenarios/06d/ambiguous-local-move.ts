import { defineScenario } from "../../src/scenario/scenario-contract";
export const ambiguousLocalMoveScenario = defineScenario({
  id:"s06d-ambiguous-local-move", description:"Two LOCAL candidates matching one trusted historical object are not guessed into a rename.",
  traceability:{targets:[{kind:"requirement",id:"MOVE-003"},{kind:"requirement",id:"MOVE-005"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"original.bin",content:{encoding:"bytes",value:[1,2,3,4]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"move-one",kind:"fixture",operation:"move-local",device:"device-a",fromPath:"original.bin",toPath:"candidate-a.bin"},
    {id:"copy-two",kind:"fixture",operation:"put-local-file",device:"device-a",path:"candidate-b.bin",content:{encoding:"bytes",value:[1,2,3,4]}},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"plan-view",kind:"observe",subject:"production-plan",inputRef:"plan",captureAs:"plan-view"},
    {id:"assert-blocked",kind:"assert",assertion:"contains",observationRef:"plan-view",field:"operationKinds",expected:"blocked-unsafe"},
    {id:"remote-original",kind:"observe",subject:"remote-entry",path:"original.bin",captureAs:"remote-original"},
    {id:"assert-remote-preserved",kind:"assert",assertion:"exists",observationRef:"remote-original",expected:true},
  ],
});