import { defineScenario } from "../../src/scenario/scenario-contract";
export const hiddenDotfileIncludedScenario = defineScenario({
  id:"s06e-hidden-dotfile-included", description:"An ordinary hidden/dotfile not covered by exclusions remains in scope and synchronizes to the managed remote.",
  traceability:{targets:[{kind:"requirement",id:"FILE-004"},{kind:"requirement",id:"FILE-001"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".hidden-user.bin",content:{encoding:"bytes",value:[4,0,4]}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".hidden-user.bin",captureAs:"remote"},
    {id:"assert-exists",kind:"assert",assertion:"exists",observationRef:"remote",expected:true},
    {id:"assert-kind",kind:"assert",assertion:"field-equals",observationRef:"remote",field:"entityKind",expected:"file"},
    {id:"assert-size",kind:"assert",assertion:"field-equals",observationRef:"remote",field:"sizeBytes",expected:3},
  ],
});