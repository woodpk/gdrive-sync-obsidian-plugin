import { defineScenario } from "../../src/scenario/scenario-contract";
export const unknownBinaryLocalScenario = defineScenario({
  id:"s06e-unknown-binary-local", description:"An unknown ordinary LOCAL file type synchronizes as opaque binary content.",
  traceability:{targets:[{kind:"requirement",id:"FILE-001"},{kind:"requirement",id:"FILE-002"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"mystery.unknownfmt",content:{encoding:"bytes",value:[0,17,34,255]}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:"mystery.unknownfmt",captureAs:"remote"},
    {id:"assert-exists",kind:"assert",assertion:"exists",observationRef:"remote",expected:true},
    {id:"assert-kind",kind:"assert",assertion:"field-equals",observationRef:"remote",field:"entityKind",expected:"file"},
    {id:"assert-size",kind:"assert",assertion:"field-equals",observationRef:"remote",field:"sizeBytes",expected:4},
  ],
});