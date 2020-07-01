/*Use the fhir validator jar to check the researchstudy /bundle being sent to the UI is formatted properly and satisfy fhir standards

Download the fhir validator here: https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar and place in this directory

Paste an example research study in the resource.json file before running the test

*/

import { exec } from "child_process";

//NOTE: The jar file must be named org.hl7.fhir.validator.jar

describe("Fhir Validator jar", () => {

    /*This test case is temporarily disabled. Change xit --> it to run this test case.
      NOTE: The test must be disabled (changed to xit) on commit 
    */
   beforeEach(function() {
       
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });
    afterEach(function(){
        jasmine.DEFAULT_TIMEOUT_INTERVAL=5000;
    });
    xit("validates sample fhir object" , function (done) {

        const child=   exec('java -jar ./spec/tmp/org.hl7.fhir.validator.jar ./spec/tmp/resource.json', function (error, stdout,stderr) { //standard output of jar file is through stdout
            console.log(`Output -> ${stdout}`);
            if (error !== null) {
                console.log(`Error ->  ${stderr}`);
            }
            expect(error).toBeNull();
            done();
            }); 
       
    });

});