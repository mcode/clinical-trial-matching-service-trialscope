import { TrialScopeTrial } from './../../src/trialscope';
import { ResearchStudy } from './../../src/research-study';
import data from './sample_trial.json'; //trial misssing summary, inclusion/exclusion criteria, phase and study type


 /**
  * This test case is temporarily disabled. Change xit --> it to run this test case.
  *   NOTE: The test must be disabled (changed to xit) on commit 
  * 
  **/
describe("backup tests", () => {

    const trial :TrialScopeTrial = data as TrialScopeTrial;
    //convert trialscope object to research study 
    const study = new ResearchStudy(trial,1);
    
    it("fills in inclusion criteria ", () => {
     expect(study.enrollment[0].display).toBeDefined();

    });

    it("fills in phase", () => {
       expect(study.phase.text).toBe('Phase 2');
    });

    it("fills in study type", () => {
      expect(study.category[0].text).toBe('Interventional');
    });

    it("fills in description", () => {
       expect(study.description).toBeDefined();
    });

});
