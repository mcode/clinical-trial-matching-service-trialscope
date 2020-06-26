/*Create a validator which runs the existing fhir validator jar and also runs additional checks to make sure no fields are missing for the UI

*/

var exec = require('child_process').exec;
var child = exec('java -jar ./tmp/org.hl7.fhir.validator.jar ./resource.json' ,
    function (error, stdout, stderr) { //standard output of jar file is through stdout
        console.log('Output -> ' + stdout);
        if (error !== null) {
            console.log("Error -> " + error);
        }
    });