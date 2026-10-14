import { defineScenario } from "../../src/scenario/scenario-contract";
export const deviceLocalConfigScenario = defineScenario({
  id:"s06e-device-local-config", description:"Workspace/session configuration remains device-local and outside ordinary vault synchronization.",
  traceability:{targets:[{kind:"requirement",id:"CONFIG-001"},{kind:"requirement",id:"CONFIG-003"},{kind:"requirement",id:"CONFIG-004"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".obsidian/workspace.json",content:{encoding:"utf8",value:"{\"layout\":\"device-a\"}"}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".obsidian/workspace.json",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".obsidian/workspace.json",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:false},
  ],
});