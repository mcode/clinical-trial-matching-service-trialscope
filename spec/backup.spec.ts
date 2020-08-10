import { TrialScopeTrial } from '../src/trialscope';
import { convertTrialScopeToResearchStudy, updateTrial } from '../src/research-study-mapping';
import data from './data/sample_trial.json'; //trial missing summary, inclusion/exclusion criteria, phase and study type
import * as trialbackup from '../src/trialbackup';
import * as fs from 'fs';
describe('backup tests', () => {
  const trial: TrialScopeTrial = data as TrialScopeTrial;
  //convert trialscope object to research study
  let study = convertTrialScopeToResearchStudy(trial, 1);
  const nctIds = [trial.nctId];
  beforeEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });
  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });
  beforeAll(async function () {
    await trialbackup.downloadRemoteBackups(nctIds);
    study = updateTrial(study);
  });
  //trialbackup.downloadRemoteBackups(nctIds).then( () => {
  //  study = updateTrial(study);
  //console.log(study);
  it('fills in inclusion criteria ', () => {
    expect(study.enrollment[0].display).toBeDefined();
  });

  it('fills in phase', () => {
    expect(study.phase.text).toBe('Phase 2');
  });

  it('fills in study type', () => {
    expect(study.category[0].text).toBe('Interventional');
  });

  it('fills in description', () => {
    expect(study.description).toBeDefined();
  });

  afterAll(function (done) {
    fs.unlink('src/backup.zip', (err) => {
      if (err) console.log(err);
    });
    fs.rmdir('src/backups/', { recursive: true }, (err) => {
      if (err) console.log(err);
    });
    done();
  });
});
