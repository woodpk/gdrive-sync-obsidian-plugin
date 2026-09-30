import { defineScenario } from "../../src/scenario/scenario-contract";
export const excludedLocalDefaultScenario = defineScenario({
  id:"s06e-excluded-local-default", description:"A default-excluded LOCAL .git file remains local and is not adopted into the managed remote.",
  traceability:{targets:[{kind:"requirement",id:"FILE-005"},{kind:"requirement",id:"FILE-006"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".git/config",content:{encoding:"utf8",value:"local-only"}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".git/config",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".git/config",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:false},
  ],
});