import { ResearchStudy, Arm, convertStringArrayToCodeableConcept } from 'clinical-trial-matching-service';
import { TrialScopeTrial, ArmGroup, Site } from './trialscope';
import * as trialbackup from './trialbackup';

// Mappings between trialscope value sets and FHIR value sets
const phaseCodeMap = new Map<string, string>([
  ['Early Phase 1', 'early-phase-1'],
  ['N/A', 'n-a'],
  ['Phase 1', 'phase-1'],
  ['Phase 1/Phase 2', 'phase-1-phase-2'],
  ['Phase 2', 'phase-2'],
  ['Phase 2/Phase 3', 'phase-2-phase-3'],
  ['Phase 3', 'phase-3'],
  ['Phase 4', 'phase-4']
]);

const statusMap = new Map<string, string>([
  ['Active, not recruiting', 'closed-to-accrual'],
  ['Approved for marketing', 'approved'],
  ['Available', 'active'],
  ['Enrolling by invitation', 'active'],
  ['Not yet recruiting', 'approved'],
  ['Recruiting', 'active']
]);

function convertStatus(tsStatus: string): string {
  const fhirStatus = statusMap.get(tsStatus);
  return fhirStatus;
}

function convertPhaseCode(tsPhase: string): string {
  const fhirPhaseCode = phaseCodeMap.get(tsPhase);
  return fhirPhaseCode;
}

// ResearchStudy implementation
export function convertTrialScopeToResearchStudy(trial: TrialScopeTrial, id: number): ResearchStudy {
  const result = new ResearchStudy(id);
  if (trial.nctId) {
    result.identifier = [{ use: 'official', system: 'http://clinicaltrials.gov', value: trial.nctId }];
  }
  if (trial.title) {
    result.title = trial.title;
  }
  if (trial.overallStatus) {
    result.status = convertStatus(trial.overallStatus);
  }
  if (trial.phase) {
    result.phase = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/research-study-phase',
          code: convertPhaseCode(trial.phase),
          display: trial.phase
        }
      ],
      text: trial.phase
    };
  }
  if (trial.studyType) {
    result.category = [{ text: trial.studyType }];
  }
  if (trial.conditions != '[]') {
    result.condition = convertStringArrayToCodeableConcept(trial.conditions);
  }
  if (trial.overallContactName || trial.overallContactPhone || trial.overallContactEmail) {
    result.addContact(trial.overallContactName, trial.overallContactPhone, trial.overallContactEmail);
  }
  if (trial.keywords && trial.keywords != '[]') {
    result.keyword = convertStringArrayToCodeableConcept(trial.keywords);
  }
  if (trial.countries && trial.countries != '[]') {
    result.location = convertStringArrayToCodeableConcept(trial.countries);
  }
  if (trial.detailedDescription) {
    result.description = trial.detailedDescription;
  }
  if (typeof trial.armGroups[Symbol.iterator] === 'function') {
    // ts returns {} when empty, which is not iterable
    result.arm = createArm(trial.armGroups);
  }
  if (trial.officialTitle) {
    result.objective = [{ name: trial.officialTitle }];
  }
  if (trial.overallOfficialName) {
    result.principalInvestigator = { reference: '#practitioner' + result.id, type: 'Practitioner' };
  }
  if (trial.sites && trial.sites.length > 0) {
    for (const site of trial.sites) {
      const location = result.addSite(site.facility, site.contactEmail, site.contactPhone);
      if (site.latitude && site.longitude) {
        location.position = { latitude: site.latitude, longitude: site.longitude };
      }
      result.addSite(location);
    }
  }
  if (trial.criteria) {
    const reference = result.addContainedResource({
      resourceType: 'Group',
      id: 'group' + result.id,
      type: 'person',
      actual: false
    });
    reference.display = trial.criteria;
    result.enrollment = [reference];
  }
  if (trial.sponsor) {
    result.sponsor = result.addContainedResource({
      resourceType: 'Organization',
      id: 'org' + result.id,
      name: trial.sponsor
    });
  }
  if (result.principalInvestigator) {
    result.addContainedResource({
      resourceType: 'Practitioner',
      id: 'practitioner' + result.id,
      name: [{ use: 'official', text: trial.overallOfficialName }]
    });
  }

  // Checks if research study contains enrollment criteria
  const nctId = result.identifier[0].value;
  /*
  This does not work at present, it attempts to load data from a local file
  const backup = trialbackup.getBackupTrial(nctId);

  if (!trial.criteria) {
    result.enrollment = [
      { reference: `#group${result.id}`, type: 'Group', display: trialbackup.getBackupCriteria(backup) }
    ];
  }
  if (!trial.detailedDescription) {
    result.description = trialbackup.getBackupSummary(backup);
  }
  if (!trial.phase) {
    result.phase = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/research-study-phase',
          code: convertPhaseCode(trialbackup.getBackupPhase(backup)),
          display: trialbackup.getBackupPhase(backup)
        }
      ],
      text: trialbackup.getBackupPhase(backup)
    };
  }
  if (!trial.studyType) {
    result.category = [{ text: trialbackup.getBackupStudyType(backup) }];
  }
  */
  return result;
}

function createArm(armGroups: ArmGroup[]): Arm[] {
  const arms: Arm[] = [];
  for (const armgroup of armGroups) {
    const singleArm: Arm = {};
    if (armgroup.arm_group_label) {
      singleArm.name = armgroup.arm_group_label;
    }
    if (armgroup.arm_group_type) {
      singleArm.type = { text: armgroup.arm_group_type };
    }
    if (armgroup.description) {
      singleArm.description = armgroup.description;
    }
    arms.push(singleArm);
  }
  return arms;
}
