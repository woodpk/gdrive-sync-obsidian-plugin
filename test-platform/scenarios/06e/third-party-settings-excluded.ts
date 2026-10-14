import { defineScenario } from "../../src/scenario/scenario-contract";
export const thirdPartySettingsExcludedScenario = defineScenario({
  id:"s06e-third-party-settings-excluded", description:"Unknown third-party plugin configuration remains local by default instead of being synchronized wholesale.",
  traceability:{targets:[{kind:"requirement",id:"CONFIG-003"},{kind:"requirement",id:"CONFIG-007"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".obsidian/plugins/community-example/data.json",content:{encoding:"utf8",value:"{\"unknown\":true}"}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".obsidian/plugins/community-example/data.json",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".obsidian/plugins/community-example/data.json",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:false},
  ],
});