import { defineScenario } from "../../src/scenario/scenario-contract";
export const protectedConfigScenario = defineScenario({
  id:"s06e-protected-config", description:"Authentication/operational configuration remains local and never enters ordinary vault synchronization.",
  traceability:{targets:[{kind:"requirement",id:"CONFIG-001"},{kind:"requirement",id:"CONFIG-003"},{kind:"requirement",id:"CONFIG-005"},{kind:"requirement",id:"STATE-008"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".obsidian/oauth-token.json",content:{encoding:"utf8",value:"{\"token\":\"fixture-secret\"}"}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".obsidian/oauth-token.json",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".obsidian/oauth-token.json",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:false},
  ],
});