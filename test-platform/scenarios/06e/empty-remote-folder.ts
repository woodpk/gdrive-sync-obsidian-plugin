import { defineScenario } from "../../src/scenario/scenario-contract";
export const emptyRemoteFolderScenario = defineScenario({
  id:"s06e-empty-remote-folder", description:"An empty REMOTE folder is preserved as LOCAL folder structure without marker files.",
  traceability:{targets:[{kind:"requirement",id:"FILE-003"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-remote-folder",path:"empty-remote"},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"local",kind:"observe",subject:"local-entry",device:"device-a",path:"empty-remote",captureAs:"local"},
    {id:"marker",kind:"observe",subject:"local-entry",device:"device-a",path:"empty-remote/.marker",captureAs:"marker"},
    {id:"assert-folder",kind:"assert",assertion:"field-equals",observationRef:"local",field:"entityKind",expected:"folder"},
    {id:"assert-marker",kind:"assert",assertion:"exists",observationRef:"marker",expected:false},
  ],
});