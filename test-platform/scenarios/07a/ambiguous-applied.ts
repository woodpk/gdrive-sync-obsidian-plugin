import { defineScenario } from "../../src/scenario/scenario-contract";
export const ambiguousAppliedScenario = defineScenario({
  id:"s07a-ambiguous-applied", description:"A lost REMOTE create response that physically applied remains ambiguous to the caller and restart recovers by observing reality without duplicate creation.",
  traceability:{targets:[{kind:"requirement",id:"STATE-010"},{kind:"requirement",id:"XFER-004"},{kind:"completion-evidence",id:"13.3-ambiguous-network-response-after-remote-mutation"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"ambiguous-applied.bin",content:{encoding:"bytes",value:[3,1,4,1]}},
    {id:"fault",kind:"external-state",transition:"inject-remote-mutation-fault",operation:"create",effect:"applied-before-failure",classification:"simulated-response-loss"},
    {id:"first",kind:"production",device:"device-a",operation:"synchronize",expect:{status:"failed",classification:"production-request-rejected"}},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"ambiguous-applied.bin",captureAs:"remote-before"},
    {id:"assert-applied",kind:"assert",assertion:"exists",observationRef:"remote-before",expected:true},
    {id:"restart",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"recover",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-after",kind:"observe",subject:"remote-entry",path:"ambiguous-applied.bin",captureAs:"remote-after"},
    {id:"state-after",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-after"},
    {id:"assert-base",kind:"assert",assertion:"field-equals",observationRef:"state-after",field:"baseCount",expected:1},
    {id:"restart-again",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"repeat",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-final",kind:"observe",subject:"remote-entry",path:"ambiguous-applied.bin",captureAs:"remote-final"},
  ],
});