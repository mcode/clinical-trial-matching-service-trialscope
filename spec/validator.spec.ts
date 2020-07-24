import { ResearchStudy } from '../src/research-study';
import { TrialScopeTrial } from '../src/trialscope';
/*
 * Use the FHIR validator jar to check the ResearchStudy bundle being sent to
 * the UI is formatted properly and satisfy FHIR standards.
 *
 * Download the fhir validator here:
 * https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar
 * and place in this directory.
 *
 * Paste an example research study in the resource.json file before running the
 * test.
 *
 * Paste a trial object returned from the matching service API into
 * `trial_object.json`. This will check if the conversion to a ResearchStudy is
 * being made properly.
 */
import { exec } from 'child_process';
import * as fs from 'fs';

//NOTE: The jar file must be named org.hl7.fhir.validator.jar

describe('FHIR Validator jar', () => {
  beforeEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000;
  });
  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });

  it('validates the sample FHIR object', function (done) {
    exec('java -jar ./spec/data/org.hl7.fhir.validator.jar ./spec/data/resource.json', function (
      error,
      stdout,
      stderr
    ) {
      // standard output of jar file is through stdout
      console.log(`Output -> ${stdout}`);
      if (error !== null) {
        console.log(`Error ->  ${stderr}`);
      }
      expect(error).toBeNull();
      done();
    });
  });

  it('validates matching service results -> research study object', function (done) {
    const data = fs.readFileSync('./spec/data/trialscope_trial.json', { encoding: 'utf8' });
    const json: TrialScopeTrial = JSON.parse(data) as TrialScopeTrial;
    const study = new ResearchStudy(json, 1);
    fs.writeFileSync('./spec/data/converted.json', JSON.stringify(study));
    exec('java -jar ./spec/data/org.hl7.fhir.validator.jar ./spec/data/converted.json', function (
      error,
      stdout,
      stderr
    ) {
      //standard output of jar file is through stdout
      console.log(`Output -> ${stdout}`);
      if (error !== null) {
        console.log(`Error ->  ${stderr}`);
      }
      expect(error).toBeNull();
      done();
      fs.unlinkSync('./spec/data/converted.json');
    });
  });
});
