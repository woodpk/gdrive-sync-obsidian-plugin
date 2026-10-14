import { defineScenario } from "../../src/scenario/scenario-contract";
export const afterRemoteEffectScenario = defineScenario({
  id:"s07a-after-remote-effect", description:"A crash after a verified REMOTE effect but before canonical commit is recovered from retained physical reality without duplicate creation.",
  traceability:{targets:[{kind:"requirement",id:"STATE-009"},{kind:"requirement",id:"STATE-010"},{kind:"requirement",id:"XFER-004"},{kind:"invariant",id:"INV-004"},{kind:"completion-evidence",id:"13.3-crash-after-content-mutation-before-state-commit"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"after-effect.bin",content:{encoding:"bytes",value:[4,5,6]}},
    {id:"arm",kind:"external-state",transition:"inject-crash-boundary",device:"device-a",boundary:"after-remote-effect"},
    {id:"crash",kind:"production",device:"device-a",operation:"synchronize",expect:{status:"failed",classification:"step-exception"}},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"after-effect.bin",captureAs:"remote-before"},
    {id:"state-before",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-before"},
    {id:"assert-effect",kind:"assert",assertion:"exists",observationRef:"remote-before",expected:true},
    {id:"assert-no-base",kind:"assert",assertion:"field-equals",observationRef:"state-before",field:"baseCount",expected:0},
    {id:"restart",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"recover",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-after",kind:"observe",subject:"remote-entry",path:"after-effect.bin",captureAs:"remote-after"},
    {id:"state-after",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-after"},
    {id:"assert-base",kind:"assert",assertion:"field-equals",observationRef:"state-after",field:"baseCount",expected:1},
    {id:"restart-again",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"repeat",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-final",kind:"observe",subject:"remote-entry",path:"after-effect.bin",captureAs:"remote-final"},
  ],
});