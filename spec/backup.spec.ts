import { TrialScopeTrial } from '../src/trialscope';
import { ResearchStudy } from '../src/research-study';

describe('backup tests', () => {
  const data = require('./data/sample_trial.json'); //trial missing summary, inclusion/exclusion criteria, phase and study type
  const trial: TrialScopeTrial = data as TrialScopeTrial;
  //convert trialscope object to research study
  const study = new ResearchStudy(trial, 1);

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
});