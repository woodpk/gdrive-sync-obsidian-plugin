import { defineScenario } from "../../src/scenario/scenario-contract";
export const beforeCanonicalStateWriteScenario = defineScenario({
  id:"s07a-before-canonical-state-write", description:"A crash immediately before canonical success persistence keeps the verified physical effect and restart commits state without replay.",
  traceability:{targets:[{kind:"requirement",id:"STATE-009"},{kind:"requirement",id:"STATE-010"},{kind:"invariant",id:"INV-004"},{kind:"completion-evidence",id:"13.3-crash-during-state-commit"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"before-state.bin",content:{encoding:"bytes",value:[7,8,9]}},
    {id:"arm",kind:"external-state",transition:"inject-crash-boundary",device:"device-a",boundary:"before-canonical-state-write"},
    {id:"crash",kind:"production",device:"device-a",operation:"synchronize",expect:{status:"failed",classification:"step-exception"}},
    {id:"remote-before",kind:"observe",subject:"remote-entry",path:"before-state.bin",captureAs:"remote-before"},
    {id:"state-before",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-before"},
    {id:"assert-effect",kind:"assert",assertion:"exists",observationRef:"remote-before",expected:true},
    {id:"assert-no-base",kind:"assert",assertion:"field-equals",observationRef:"state-before",field:"baseCount",expected:0},
    {id:"restart",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"recover",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-after",kind:"observe",subject:"remote-entry",path:"before-state.bin",captureAs:"remote-after"},
    {id:"state-after",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state-after"},
    {id:"assert-base",kind:"assert",assertion:"field-equals",observationRef:"state-after",field:"baseCount",expected:1},
    {id:"restart-again",kind:"checkpoint",operation:"restart-device",device:"device-a"},
    {id:"repeat",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote-final",kind:"observe",subject:"remote-entry",path:"before-state.bin",captureAs:"remote-final"},
  ],
});