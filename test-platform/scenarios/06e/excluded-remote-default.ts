import { defineScenario } from "../../src/scenario/scenario-contract";
export const excludedRemoteDefaultScenario = defineScenario({
  id:"s06e-excluded-remote-default", description:"A default-excluded REMOTE .git file remains untouched and is not materialized locally.",
  traceability:{targets:[{kind:"requirement",id:"FILE-005"},{kind:"requirement",id:"FILE-006"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-remote-file",path:".git/remote.bin",content:{encoding:"bytes",value:[1,2,3]}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".git/remote.bin",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".git/remote.bin",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:false},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:true},
  ],
});