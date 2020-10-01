import { ResearchStudy, fhir, convertStringArrayToCodeableConcept } from 'clinical-trial-matching-service';
import { TrialScopeTrial } from './trialscope';

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

const statusMap = new Map<string, fhir.ResearchStudyStatus>([
  ['Active, not recruiting', 'closed-to-accrual'],
  ['Approved for marketing', 'approved'],
  ['Available', 'active'],
  ['Enrolling by invitation', 'active'],
  ['Not yet recruiting', 'approved'],
  ['Recruiting', 'active']
]);

function convertStatus(tsStatus: string): fhir.ResearchStudyStatus {
  return statusMap.get(tsStatus);
}

function convertPhaseCode(tsPhase: string): string {
  return phaseCodeMap.get(tsPhase);
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
  if (trial.conditions) {
    const conditions = convertStringArrayToCodeableConcept(trial.conditions);
    if (conditions.length > 0) result.condition = conditions;
  }
  if (trial.overallContactName || trial.overallContactPhone || trial.overallContactEmail) {
    result.addContact(trial.overallContactName, trial.overallContactPhone, trial.overallContactEmail);
  }
  if (trial.keywords) {
    const keywords = convertStringArrayToCodeableConcept(trial.keywords);
    if (keywords.length > 0) result.keyword = keywords;
  }
  if (trial.countries) {
    const countries = convertStringArrayToCodeableConcept(trial.countries);
    if (countries.length > 0) result.location = countries;
  }
  if (trial.detailedDescription) {
    result.description = trial.detailedDescription;
  }
  if (trial.officialTitle) {
    result.objective = [{ name: trial.officialTitle }];
  }
  if (trial.overallOfficialName) {
    result.principalInvestigator = result.addContainedResource({
      resourceType: 'Practitioner',
      id: 'practitioner-' + result.id,
      name: [{ use: 'official', text: trial.overallOfficialName }]
    });
  }
  if (trial.sites && trial.sites.length > 0) {
    for (const site of trial.sites) {
      const location = result.addSite(site.facility, site.contactPhone, site.contactEmail);
      if (site.latitude && site.longitude) {
        location.position = { latitude: site.latitude, longitude: site.longitude };
      }
    }
  }
  if (trial.criteria) {
    const reference = result.addContainedResource({
      resourceType: 'Group',
      id: 'group-' + result.id,
      type: 'person',
      actual: false
    });
    reference.display = trial.criteria;
    result.enrollment = [reference];
  }
  if (trial.sponsor) {
    result.sponsor = result.addContainedResource({
      resourceType: 'Organization',
      id: 'org-' + result.id,
      name: trial.sponsor
    });
  }

  return result;
}
