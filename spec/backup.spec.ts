import { TrialScopeTrial } from '../src/trialscope';
import { convertTrialScopeToResearchStudy } from '../src/research-study-mapping';
import data from './data/sample_trial.json'; //trial missing summary, inclusion/exclusion criteria, phase and study type
import * as trialbackup from 'clinical-trial-matching-service/dist/trialbackup';
import * as fs from 'fs';
import { fhir } from 'clinical-trial-matching-service';
import path from 'path';

describe('backup tests', () => {
  const trial: TrialScopeTrial = data as TrialScopeTrial;
  //convert trialscope object to research study
  let study = convertTrialScopeToResearchStudy(trial, 1) as fhir.ResearchStudy;
  const nctIds = [trial.nctId];
  beforeEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });
  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });
  const filepath = 'src';
  beforeAll(async function () {
    const downloader = new trialbackup.ClinicalTrialGov(filepath)
    await downloader.downloadRemoteBackups(nctIds);
    const backup = new trialbackup.BackupSystem(filepath);
    study = backup.updateTrial(study);
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
      if (err) {
        console.log(err);
      }
    });

    fs.rmdir(path.resolve('src/backups/'), { recursive: true }, (err) => {
      if (err) {
        console.log(err);
      }
    });
    done();
  });
});
