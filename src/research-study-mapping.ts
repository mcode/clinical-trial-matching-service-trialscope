import { ResearchStudy, Arm, Location, Reference, Telecom } from 'clinical-trial-matching-service';
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
    result.condition = result.convertStringArrayToCodeableConcept(trial.conditions);
  }
  if (trial.overallContactName || trial.overallContactPhone || trial.overallContactEmail) {
    result.contact = result.setContact(trial.overallContactName, trial.overallContactPhone, trial.overallContactEmail);
  }
  if (trial.keywords && trial.keywords != '[]') {
    result.keyword = result.convertStringArrayToCodeableConcept(trial.keywords);
  }
  if (trial.countries && trial.countries != '[]') {
    result.location = result.convertStringArrayToCodeableConcept(trial.countries);
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
  if (trial.criteria) {
    result.enrollment = [{ reference: '#group' + result.id, type: 'Group', display: trial.criteria }];
  }
  if (trial.sponsor) {
    result.sponsor = { reference: '#org' + result.id, type: 'Organization' };
  }
  if (trial.overallOfficialName) {
    result.principalInvestigator = { reference: '#practitioner' + result.id, type: 'Practitioner' };
  }
  if (trial.sites && trial.sites.length > 0) {
    result.site = createSiteReferences(result, trial.sites);
    addSitesToContained(result, trial.sites);
  }
  //Checks if research study contains enrollment criteria

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

  if (result.enrollment || result.site || result.sponsor || result.principalInvestigator) {
    result.contained = [];
  }
  if (result.enrollment) {
    result.contained.push({ resourceType: 'Group', id: 'group' + result.id, type: 'person', actual: false });
  }
  if (result.sponsor) {
    result.contained.push({ resourceType: 'Organization', id: 'org' + result.id, name: trial.sponsor });
  }
  if (result.principalInvestigator) {
    result.contained.push({
      resourceType: 'Practitioner',
      id: 'practitioner' + result.id,
      name: [{ use: 'official', text: trial.overallOfficialName }]
    });
  }
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

function createSiteReferences(result: ResearchStudy, sites: Site[]): Reference[] {
  const siteReferences: Reference[] = [];
  let siteIndex = 0;
  for (const site of sites) {
    siteReferences.push({ reference: '#location' + result.id + '-' + String(siteIndex), type: 'Location' });
    siteIndex++;
  }
  return siteReferences;
}

function addSitesToContained(study: ResearchStudy, sites: Site[]): void {
  let locationIndex = 0;
  for (const location of sites) {
    const local: Location = {
      resourceType: 'Location',
      id: 'location' + study.id + '-' + String(locationIndex)
    };
    if (location.facility) {
      local.name = location.facility;
    }
    if (location.contactEmail || location.contactPhone) {
      const localTelecom: Telecom[] = [];
      if (location.contactEmail) {
        localTelecom.push({ system: 'email', value: location.contactEmail, use: 'work' });
      }
      if (location.contactPhone) {
        localTelecom.push({ system: 'phone', value: location.contactPhone, use: 'work' });
      }
      local.telecom = localTelecom;
    }
    if (location.latitude && location.longitude) {
      local.position = { latitude: location.latitude, longitude: location.longitude };
    }
    study.addContainedResource(local);
    locationIndex++;
  }
}
