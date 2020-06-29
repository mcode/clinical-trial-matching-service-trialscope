/*Use the fhir validator jar to check the researchstudy /bundle being sent to the UI is formatted properly and satisfy fhir standards

Download the fhir validator here: https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar and place in this directory

Paste an example research study in the resource.json file before running the test

*/

//NOTE: The jar file must be named org.hl7.fhir.validator.jar



describe("Fhir Validator jar", () => {

    /*This test case is temporarily disabled. Change xit --> it to run this test case.
      NOTE: The test must be disabled (changed to xit) on commit 
    */


    xit("validates sample fhir object" , () => {

        var exec = require('child_process').exec;


        var child = exec('java -jar ./org.hl7.fhir.validator.jar ./resource.json', function (error, stdout, stderr) { //standard output of jar file is through stdout
            console.log('Output -> ' + stdout);
            if (error !== null) {
            console.log("Error -> " + error);
            }
        });

    });

});