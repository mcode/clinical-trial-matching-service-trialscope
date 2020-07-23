import { ResearchStudy } from './../../src/research-study';
import { TrialScopeTrial } from './../../src/trialscope';
/*Use the fhir validator jar to check the researchstudy /bundle being sent to the UI is formatted properly and satisfy fhir standards

Download the fhir validator here: https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar and place in this directory

Paste an example research study in the resource.json file before running the test

*/
import { exec } from "child_process";
import * as fs from 'fs';

//NOTE: The jar file must be named org.hl7.fhir.validator.jar

describe("Fhir Validator jar", () => {

   beforeEach(function() {
       
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });
    afterEach(function(){
        jasmine.DEFAULT_TIMEOUT_INTERVAL=5000;
    });
    it("validates sample fhir object" , function (done) {

        const child=   exec('java -jar ./spec/tmp/org.hl7.fhir.validator.jar ./spec/tmp/resource.json', function (error, stdout,stderr) { //standard output of jar file is through stdout
            console.log(`Output -> ${stdout}`);
            if (error !== null) {
                console.log(`Error ->  ${stderr}`);
            }
            expect(error).toBeNull();
            done();
            });   
    });
    it("validates trialscope -> research study object", function(done){

        const data = fs.readFileSync('./spec/tmp/trialscope_trial.json', {encoding: 'utf8'});
        const json : TrialScopeTrial= JSON.parse(data) as TrialScopeTrial;
        const study = new ResearchStudy(json,1);
        fs.writeFileSync('./spec/tmp/converted.json', JSON.stringify(study)); 
        const child=   exec('java -jar ./spec/tmp/org.hl7.fhir.validator.jar ./spec/tmp/converted.json', function (error, stdout,stderr) { //standard output of jar file is through stdout
            console.log(`Output -> ${stdout}`);
            if (error !== null) {
                console.log(`Error ->  ${stderr}`);
            }
            expect(error).toBeNull();
            done();
            fs.unlinkSync('./spec/tmp/converted.json');
            }); 
     
    });

});