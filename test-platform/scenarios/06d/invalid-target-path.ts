import { defineScenario } from "../../src/scenario/scenario-contract";
export const invalidTargetPathScenario = defineScenario({
  id:"s06d-invalid-target-path", description:"A REMOTE rename to a cross-platform invalid target is refused locally while preserving the source and remote object.",
  traceability:{targets:[{kind:"requirement",id:"FILE-009"},{kind:"requirement",id:"FILE-010"},{kind:"invariant",id:"INV-017"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"valid.bin",content:{encoding:"bytes",value:[8]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"move-remote",kind:"fixture",operation:"move-remote",fromPath:"valid.bin",toPath:"CON.txt"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"plan-view",kind:"observe",subject:"production-plan",inputRef:"plan",captureAs:"plan-view"},
    {id:"assert-move",kind:"assert",assertion:"contains",observationRef:"plan-view",field:"operationKinds",expected:"identity-preserving-move"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan"},
    {id:"local-source",kind:"observe",subject:"local-entry",device:"device-a",path:"valid.bin",captureAs:"local-source"},
    {id:"remote-target",kind:"observe",subject:"remote-entry",path:"CON.txt",captureAs:"remote-target"},
    {id:"assert-source",kind:"assert",assertion:"exists",observationRef:"local-source",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote-target",expected:true},
  ],
});