import { TrialScopeTrial } from '../src/trialscope';
import { convertTrialScopeToResearchStudy } from '../src/research-study-mapping';
// trial missing summary, inclusion/exclusion criteria, phase and study type
import testData from './data/sample_trial.json';

describe('backup tests', () => {
  const trial: TrialScopeTrial = testData as TrialScopeTrial;
  //convert trialscope object to research study
  const study = convertTrialScopeToResearchStudy(trial, 1);

  // These are being moved to the service library, sort of
  // it('fills in inclusion criteria ', () => {
  //   expect(study.enrollment[0].display).toBeDefined();
  // });

  // it('fills in phase', () => {
  //   expect(study.phase.text).toBe('Phase 2');
  // });

  // it('fills in study type', () => {
  //   expect(study.category[0].text).toBe('Interventional');
  // });

  // it('fills in description', () => {
  //   expect(study.description).toBeDefined();
  // });
});
