import { defineScenario } from "../../src/scenario/scenario-contract";
export const beforeRemoteDispatchScenario = defineScenario({
  id:"s07a-before-remote-dispatch", description:"A crash after durable dispatch authority but before REMOTE mutation leaves no physical/canonical effect and restart safely completes once.",
  traceability:{targets:[{kind:"requirement",id:"STATE-010"},{kind:"invariant",id:"INV-004"},{kind:"completion-evidence",id:"13.3-crash-before-content-mutation"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"before-dispatch.bin",content:{encoding:"bytes",value:[1,2,3]}},
    {id:"arm",kind:"external-state",transition:"inject-crash-boundary",device:"device-a",boundary:"before-remote-dispatch"},
    {id:"crash",kind:"production",device:"device-a",operation:"synchronize",expect:{status:"failed",classification:"step-exception"}},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"before-dispatch.bin",captureAs:"remote-before"},
    {id:"state-before",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-before"},
    {id:"assert-no-effect",kind:"assert",assertion:"exists",observationRef:"remote-before",expected:false},
    {id:"assert-no-base",kind:"assert",assertion:"field-equals",observationRef:"state-before",field:"baseCount",expected:0},
    {id:"restart",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"recover",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-after",kind:"observe",subject:"remote-entry",path:"before-dispatch.bin",captureAs:"remote-after"},
    {id:"state-after",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-after"},
    {id:"assert-effect",kind:"assert",assertion:"exists",observationRef:"remote-after",expected:true},
    {id:"assert-base",kind:"assert",assertion:"field-equals",observationRef:"state-after",field:"baseCount",expected:1},
    {id:"restart-again",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"repeat",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-final",kind:"observe",subject:"remote-entry",path:"before-dispatch.bin",captureAs:"remote-final"},
  ],
});