import { defineScenario } from "../../src/scenario/scenario-contract";
export const remoteRenameScenario = defineScenario({
  id:"s06d-remote-rename", description:"An external REMOTE rename preserves stable Drive identity and production applies the proven move locally.",
  traceability:{targets:[{kind:"requirement",id:"REM-006"},{kind:"requirement",id:"MOVE-001"},{kind:"requirement",id:"MOVE-002"},{kind:"requirement",id:"MOVE-003"},{kind:"invariant",id:"INV-010"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"remote-old.bin",content:{encoding:"bytes",value:[8,8,2]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"remote-old.bin",captureAs:"remote-before"},
    {id:"rename-remote",kind:"fixture",operation:"move-remote",fromPath:"remote-old.bin",toPath:"remote-new.bin"},
    {id:"remote-moved",kind:"observe",subject:"remote-entry",path:"remote-new.bin",captureAs:"remote-moved"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"plan-view",kind:"observe",subject:"production-plan",inputRef:"plan",captureAs:"plan-view"},
    {id:"assert-move",kind:"assert",assertion:"contains",observationRef:"plan-view",field:"operationKinds",expected:"identity-preserving-move"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan"},
    {id:"local-after",kind:"observe",subject:"local-entry",device:"device-a",path:"remote-new.bin",captureAs:"local-after"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local-after",expected:true},
  ],
});