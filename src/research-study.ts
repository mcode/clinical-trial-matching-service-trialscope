import { TrialScopeTrial, ArmGroup, Site } from './trialscope';

// Mappings between trialscope value sets and FHIR value sets
const phaseCodeMap = new Map<string, string>();
phaseCodeMap.set("Early Phase 1", "early-phase-1");
phaseCodeMap.set("N/A", "n-a");
phaseCodeMap.set("Phase 1", "phase-1");
phaseCodeMap.set("Phase 1/Phase 2", "phase-1-phase-2");
phaseCodeMap.set("Phase 2", "phase-2");
phaseCodeMap.set("Phase 2/Phase 3", "phase-2-phase-3");
phaseCodeMap.set("Phase 3", "phase-3");
phaseCodeMap.set("Phase 4", "phase-4");

const statusMap = new Map<string, string>();
statusMap.set("Active, not recruiting", "closed-to-accrual");
statusMap.set("Approved for marketing", "approved");
statusMap.set("Available", "active");
statusMap.set("Enrolling by invitation", "active");
statusMap.set("Not yet recruiting", "approved");
statusMap.set("Recruiting", "active");

// FHIR data types supporting ResearchStudy
export interface Identifier{
  use?: string;
  system?: string;
  value?: string;
}

export interface CodeableConcept {
  coding?: {system?: string; code?: string; display?: string;}[]
  text?: string;
}

export interface ContactDetail {
  name?: string;
  telecom?: Telecom[];
}

export interface Telecom {
  system?: string;
  value?: string;
  use?: string;
}

export interface Arm {
  name?: string;
  type?: CodeableConcept;
  description?: string;
}

export interface Objective {
  name?: string;
  type?: CodeableConcept;
}

export interface Reference {
  reference?: string;
  type?: string;
  display?: string;
}

// FHIR resources contained within ResearchStudy
export interface Group {
  resourceType?: string
  id?: string;
  type?: string;
  actual?: boolean;
}

export interface Location {
  resourceType?: string
  id?: string;
  name?: string;
  telecom?: Telecom[];
  position?: {longitude?: number; latitude?: number};
}

export interface Organization {
  resourceType?: string
  id?: string;
  name?: string;
}

export interface Practitioner {
  resourceType?: string
  id?: string;
  name?: HumanName[];
}

// FHIR data types supporting resources contained in ResearchStudy
export interface HumanName {
  use?: string;
  text: string;
}

// ResearchStudy implementation
export class ResearchStudy {
  resourceType = 'ResearchStudy';
  id?: string;
  identifier?: Identifier[];
  title?: string;
  status?: string;
  phase?: CodeableConcept;
  category?: CodeableConcept[];
  condition?: CodeableConcept[];
  contact?: ContactDetail[];
  keyword?: CodeableConcept[];
  location?: CodeableConcept[];
  description?: string; // Should actually be markdown
  arm?: Arm[];
  objective?: Objective[];
  enrollment?: Reference[];
  sponsor?: Reference;
  principalInvestigator?: Reference;
  site?: Reference[];
  contained?: (Group | Location | Organization | Practitioner)[];

  constructor(trial: TrialScopeTrial, id: number) {
    this.id = String(id);
    if (trial.nctId) {
      this.identifier = [{use: "official", system: "http://clinicaltrials.gov", value: trial.nctId}];
    }
    if (trial.title) {
      this.title = trial.title;
    }
    if (trial.overallStatus) {
      this.status = this.convertStatus(trial.overallStatus);
    }
    if (trial.phase) {
      this.phase = {coding: [{system: "http://terminology.hl7.org/CodeSystem/research-study-phase", code: this.convertPhaseCode(trial.phase), display: trial.phase}], text: trial.phase};
    }
    if (trial.studyType) {
      this.category = [{text: trial.studyType}];
    }
    if (trial.conditions != "[]") {
      this.condition = this.convertStringArrayToCodeableConcept(trial.conditions);
    }
    if (trial.overallContactName || trial.overallContactPhone || trial.overallContactEmail) {
      this.contact = this.setContact(trial.overallContactName, trial.overallContactPhone, trial.overallContactEmail);
    }
    if (trial.keywords != "[]") {
      this.keyword = this.convertStringArrayToCodeableConcept(trial.keywords);
    }
    if (trial.countries != "[]") {
      this.location = this.convertStringArrayToCodeableConcept(trial.countries);
    }
    if (trial.detailedDescription) {
      this.description = trial.detailedDescription;
    }
    if (typeof trial.armGroups[Symbol.iterator] === 'function') { // ts returns {} when empty, which is not iterable
      this.arm = this.setArm(trial.armGroups);
    }
    if (trial.officialTitle) {
      this.objective = [{name: trial.officialTitle}];
    }
    if (trial.criteria) {
      this.enrollment = [{reference: "#group" + this.id, type: "Group", display: trial.criteria}];
    }
    if (trial.sponsor) {
      this.sponsor = {reference: "#org" + this.id, type: "Organization"};
    }
    if (trial.overallOfficialName) {
      this.principalInvestigator = {reference: "#practitioner" + this.id, type: "Practitioner"};
    }
    if (trial.sites != []) {
      this.site = this.setSiteReferences(trial.sites);
    }
    if (this.enrollment || this.site || this.sponsor || this.principalInvestigator) {
      this.contained = [];
    }
    if (this.enrollment) {
      this.contained.push({resourceType: "Group", id: "group" + this.id, type: "person", actual: false});
    }
    if (this.sponsor) {
      this.contained.push({resourceType: "Organization", id: "org" + this.id, name: trial.sponsor});
    }
    if (this.principalInvestigator) {
      this.contained.push({resourceType: "Practitioner", id: "practitioner" + this.id, name: [{use: "official", text: trial.overallOfficialName}]});
    }
    if (this.site) {
      this.addSitesToContained(trial.sites);
    }
  }

  convertStatus(tsStatus: string): string {
    const fhirStatus = statusMap.get(tsStatus);
    return fhirStatus;
  }

  convertPhaseCode(tsPhase: string): string {
    const fhirPhaseCode = phaseCodeMap.get(tsPhase);
    return fhirPhaseCode;
  }

  convertStringArrayToCodeableConcept(tsConditions: string): CodeableConcept[] {
    const jsonConditions: string[] = JSON.parse(tsConditions) as string[];
    const fhirConditions: CodeableConcept[] = [];
    for (const condition of jsonConditions) {
      fhirConditions.push({text: condition});
    }
    return fhirConditions;
  }

  setContact(name: string, phone: string, email: string): ContactDetail[] {
    const contact: ContactDetail = {};
    if (name) {
      contact.name = name;
    }
    if (phone || email) {
      const telecoms: Telecom[] = [];
      if (phone) {
        telecoms.push({system: "phone", value: phone, use: "work"});
      }
      if (email) {
        telecoms.push({system: "email", value: email, use: "work"});
      }
      contact.telecom = telecoms;
    }
    return [contact];
  }

  setArm(armGroups: ArmGroup[]): Arm[] {
    const arms: Arm[] = [];
    for (const armgroup of armGroups) {
      const singleArm : Arm = {};
      if (armgroup.arm_group_label) {
        singleArm.name = armgroup.arm_group_label;
      }
      if (armgroup.arm_group_type) {
        singleArm.type = {text: armgroup.arm_group_type};
      }
      if (armgroup.description) {
        singleArm.description = armgroup.description;
      }
      arms.push(singleArm);
    }
     return arms;
  }

  setSiteReferences(sites: Site[]): Reference[] {
    const siteReferences: Reference[] = [];
    let siteIndex = 0;
    for (const site of sites) {
      siteReferences.push({reference: "#location" + this.id + "-" + String(siteIndex), type: "Location"});
      siteIndex++;
    }
    return siteReferences;
  }

  addSitesToContained(sites: Site[]): void {
    let locationIndex = 0;
    for (const location of sites) {
      const local: Location = {};
      local.resourceType = "Location";
      local.id = "location" + this.id + "-" + String(locationIndex);
      if (location.facility) {
        local.name = location.facility;
      }
      if (location.contactEmail || location.contactPhone) {
        const localTelecom: Telecom[] = [];
        if (location.contactEmail) {
          localTelecom.push({system: "email", value: location.contactEmail, use: "work"});
        }
        if (location.contactPhone) {
          localTelecom.push({system: "phone", value: location.contactPhone, use: "work"});
        }
        local.telecom = localTelecom;
      }
      if (location.latitude && location.longitude) {
        local.position = {latitude: location.latitude, longitude: location.longitude};
      }
      this.contained.push(local);
      locationIndex++;
    }
  }

}


