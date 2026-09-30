import { defineScenario } from "../../src/scenario/scenario-contract";
export const destinationCollisionScenario = defineScenario({
  id:"s06d-destination-collision", description:"A proven REMOTE move whose LOCAL destination is occupied fails safely without overwriting either LOCAL object.",
  traceability:{targets:[{kind:"requirement",id:"MOVE-005"},{kind:"requirement",id:"FILE-009"},{kind:"invariant",id:"INV-017"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"source.bin",content:{encoding:"bytes",value:[5,6,7]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"occupy",kind:"fixture",operation:"put-local-file",device:"device-a",path:"occupied.bin",content:{encoding:"bytes",value:[9,9]}},
    {id:"move-remote",kind:"fixture",operation:"move-remote",fromPath:"source.bin",toPath:"occupied.bin"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"plan-view",kind:"observe",subject:"production-plan",inputRef:"plan",captureAs:"plan-view"},
    {id:"assert-move",kind:"assert",assertion:"contains",observationRef:"plan-view",field:"operationKinds",expected:"identity-preserving-move"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan"},
    {id:"source-local",kind:"observe",subject:"local-entry",device:"device-a",path:"source.bin",captureAs:"source-local"},
    {id:"occupied-local",kind:"observe",subject:"local-entry",device:"device-a",path:"occupied.bin",captureAs:"occupied-local"},
    {id:"assert-source-preserved",kind:"assert",assertion:"exists",observationRef:"source-local",expected:true},
    {id:"assert-occupied-preserved",kind:"assert",assertion:"exists",observationRef:"occupied-local",expected:true},
  ],
});