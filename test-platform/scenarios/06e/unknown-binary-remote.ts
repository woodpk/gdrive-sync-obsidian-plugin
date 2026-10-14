import { defineScenario } from "../../src/scenario/scenario-contract";
export const unknownBinaryRemoteScenario = defineScenario({
  id:"s06e-unknown-binary-remote", description:"An unknown ordinary REMOTE file type synchronizes locally as opaque binary content.",
  traceability:{targets:[{kind:"requirement",id:"FILE-001"},{kind:"requirement",id:"FILE-002"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-remote-file",path:"remote.weirdbin",content:{encoding:"bytes",value:[9,8,7,6,5]}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:"remote.weirdbin",captureAs:"local"},
    {id:"assert-exists",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-kind",kind:"assert",assertion:"field-equals",observationRef:"local",field:"entityKind",expected:"file"},
    {id:"assert-size",kind:"assert",assertion:"field-equals",observationRef:"local",field:"sizeBytes",expected:5},
  ],
});