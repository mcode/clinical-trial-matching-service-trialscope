import { ResearchStudy } from '../src/research-study';
import { TrialScopeTrial } from '../src/trialscope';

import fs from 'fs';
import path from 'path';
// The 'fhir' module is missing types for some reason, despite being written in TypeScript
import { Fhir } from 'fhir/fhir';

describe('FHIR Validator jar', () => {
  const fhir = new Fhir();
  let sampleData: Record<string, unknown>;
  beforeAll(() => {
    return new Promise((resolve, reject) => {
      const resourcePath = path.join(__dirname, '../../spec/data/resource.json');
      fs.readFile(resourcePath, { encoding: 'utf8' }, (error, data) => {
        if (error) {
          console.error('Could not read spec file');
          reject(error);
          return;
        }
        try {
          sampleData = JSON.parse(data) as Record<string, unknown>;
          // The object we resolve to doesn't really matter
          resolve(sampleData);
        } catch (ex) {
          reject(error);
        }
      });
    });
  });

  it('validates the sample FHIR object', function () {
    const result = fhir.validate(sampleData);
    expect(result.valid).toBeTrue();
  });

  it('validates matching service results -> research study object', function () {
    const data = fs.readFileSync('./spec/data/trialscope_trial.json', { encoding: 'utf8' });
    const json: TrialScopeTrial = JSON.parse(data) as TrialScopeTrial;
    const study = new ResearchStudy(json, 1);
    const result = fhir.validate(study);
    expect(result.valid).toBeTrue();
  });
});
