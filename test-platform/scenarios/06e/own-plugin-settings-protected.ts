import { defineScenario } from "../../src/scenario/scenario-contract";
export const ownPluginSettingsProtectedScenario = defineScenario({
  id:"s06e-own-plugin-settings-protected", description:"This sync plugin's protected settings remain local and are not synchronized as ordinary vault content.",
  traceability:{targets:[{kind:"requirement",id:"CONFIG-001"},{kind:"requirement",id:"CONFIG-006"},{kind:"requirement",id:"STATE-008"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:".obsidian/plugins/brain-google-drive-sync/data.json",content:{encoding:"utf8",value:"{\"deviceLocal\":true}"}},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:".obsidian/plugins/brain-google-drive-sync/data.json",captureAs:"local"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:".obsidian/plugins/brain-google-drive-sync/data.json",captureAs:"remote"},
    {id:"assert-local",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    {id:"assert-remote",kind:"assert",assertion:"exists",observationRef:"remote",expected:false},
  ],
});