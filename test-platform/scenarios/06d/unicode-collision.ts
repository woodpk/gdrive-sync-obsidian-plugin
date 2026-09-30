import { defineScenario } from "../../src/scenario/scenario-contract";
export const unicodeCollisionScenario = defineScenario({
  id:"s06d-unicode-collision", description:"A REMOTE rename into a Unicode-equivalent LOCAL name is blocked without normalization overwrite.",
  traceability:{targets:[{kind:"requirement",id:"FILE-008"},{kind:"requirement",id:"FILE-009"},{kind:"requirement",id:"FILE-010"},{kind:"invariant",id:"INV-017"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"old-unicode.bin",content:{encoding:"bytes",value:[3]}},
    {id:"base",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"peer",kind:"fixture",operation:"put-local-file",device:"device-a",path:"café.bin",content:{encoding:"bytes",value:[4]}},
    {id:"move-remote",kind:"fixture",operation:"move-remote",fromPath:"old-unicode.bin",toPath:"café.bin"},
    {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
    {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan",expect:{status:"failed",classification:"production-request-rejected"}},
    {id:"old-local",kind:"observe",subject:"local-entry",device:"device-a",path:"old-unicode.bin",captureAs:"old-local"},
    {id:"peer-local",kind:"observe",subject:"local-entry",device:"device-a",path:"café.bin",captureAs:"peer-local"},
    {id:"assert-old",kind:"assert",assertion:"exists",observationRef:"old-local",expected:true},
    {id:"assert-peer",kind:"assert",assertion:"exists",observationRef:"peer-local",expected:true},
  ],
});