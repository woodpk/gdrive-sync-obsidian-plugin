import { defineScenario } from "../../src/scenario/scenario-contract";
export const localRenameScenario = defineScenario({
  id:"s06d-local-rename", description:"An established LOCAL rename is recognized from trusted identity/content evidence and propagated as one identity-preserving REMOTE move.",
  traceability:{targets:[{kind:"requirement",id:"MOVE-001"},{kind:"requirement",id:"MOVE-002"},{kind:"requirement",id:"MOVE-003"},{kind:"requirement",id:"REM-006"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"local-old.bin",content:{encoding:"bytes",value:[7,7,1]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"local-old.bin",captureAs:"remote-before"},
    {id:"rename-local",kind:"fixture",operation:"move-local",device:"device-a",fromPath:"local-old.bin",toPath:"local-new.bin"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"plan-view",kind:"observe",subject:"production-plan",inputRef:"plan",captureAs:"plan-view"},
    {id:"assert-move",kind:"assert",assertion:"contains",observationRef:"plan-view",field:"operationKinds",expected:"identity-preserving-move"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan"},
    {id:"remote-after",kind:"observe",subject:"remote-entry",path:"local-new.bin",captureAs:"remote-after"},
    {id:"assert-new-remote",kind:"assert",assertion:"exists",observationRef:"remote-after",expected:true},
    {id:"old-remote",kind:"observe",subject:"remote-entry",path:"local-old.bin",captureAs:"old-remote"},
    {id:"assert-old-gone",kind:"assert",assertion:"exists",observationRef:"old-remote",expected:false},
  ],
});