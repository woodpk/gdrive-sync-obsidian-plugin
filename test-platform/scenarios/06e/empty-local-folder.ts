import { defineScenario } from "../../src/scenario/scenario-contract";
export const emptyLocalFolderScenario = defineScenario({
  id:"s06e-empty-local-folder", description:"An empty LOCAL folder is preserved as folder structure in the managed remote without marker files.",
  traceability:{targets:[{kind:"requirement",id:"FILE-003"}]}, executionModes:["deterministic"],
  steps:[
    {id:"seed",kind:"fixture",operation:"put-local-folder",device:"device-a",path:"empty-local"},
    {id:"sync",kind:"production",device:"device-a",operation:"synchronize"},
    {id:"remote",kind:"observe",subject:"remote-entry",path:"empty-local",captureAs:"remote"},
    {id:"marker",kind:"observe",subject:"remote-entry",path:"empty-local/.marker",captureAs:"marker"},
    {id:"assert-folder",kind:"assert",assertion:"field-equals",observationRef:"remote",field:"entityKind",expected:"folder"},
    {id:"assert-marker",kind:"assert",assertion:"exists",observationRef:"marker",expected:false},
  ],
});