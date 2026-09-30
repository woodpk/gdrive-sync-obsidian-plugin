import { defineScenario } from "../../src/scenario/scenario-contract";
export const caseCollisionScenario = defineScenario({
  id:"s06d-case-collision", description:"A REMOTE rename into a case-equivalent LOCAL name is blocked by cross-platform path policy without overwriting either path.",
  traceability:{targets:[{kind:"requirement",id:"FILE-008"},{kind:"requirement",id:"FILE-009"},{kind:"requirement",id:"FILE-010"},{kind:"invariant",id:"INV-017"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"old-case.bin",content:{encoding:"bytes",value:[1]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"peer",kind:"fixture",operation:"put-local-file",device:"device-a",path:"case.bin",content:{encoding:"bytes",value:[2]}},
    {id:"move-remote",kind:"fixture",operation:"move-remote",fromPath:"old-case.bin",toPath:"CASE.bin"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan",expect:{status:"failed",classification:"production-request-rejected"}},
    {id:"old-local",kind:"observe",subject:"local-entry",device:"device-a",path:"old-case.bin",captureAs:"old-local"},
    {id:"peer-local",kind:"observe",subject:"local-entry",device:"device-a",path:"case.bin",captureAs:"peer-local"},
    {id:"assert-old",kind:"assert",assertion:"exists",observationRef:"old-local",expected:true},
    {id:"assert-peer",kind:"assert",assertion:"exists",observationRef:"peer-local",expected:true},
  ],
});