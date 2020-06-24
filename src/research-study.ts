import { TrialScopeTrial } from './trialscope';

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
  telecom?: {system?: string; value?: string; use?: string;}[];
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
  description?: string; // Should be actually be markdown
  arm?: Arm[];
  objective?: Objective[];

  constructor(trial: TrialScopeTrial, id: number) { // the ridiculous if statements are to account for empties being returned from trialscope - if there's a better eay, please let me know - also empty takes many forms ("", "[]", null, etc.) and I don't actually know what they are for each trialscope attribute
    this.id = String(id);
    if (trial.nctId != "") {
      this.identifier = [{use: "official", system: "http://clinicaltrilas.gov", value: trial.nctId}];
    }
    if (trial.title != "") {
      this.title = trial.title;
    }
    if (trial.overallStatus != "") {
      this.status = this.convertStatus(trial.overallStatus);
    }
    if (trial.phase != "") {
      this.phase = {coding: [{system: "http://terminology.hl7.org/CodeSystem/research-study-phase", code: this.convertPhaseCode(trial.phase), display: trial.phase}], text: trial.phase};
    }
    if (trial.studyType != "") {
      this.category = [{text: trial.studyType}];
    }
    if (trial.conditions != "[]") {
      this.condition = this.convertStringArrayToCodeableConcept(trial.conditions);
    }
    if (trial.overallContactName != "" || trial.overallContactPhone != "" || trial.overallContactEmail != null) {
      this.contact = this.setContact(trial.overallContactName, trial.overallContactPhone, trial.overallContactEmail);
    }
    if (trial.keywords != "[]") {
      this.keyword = this.convertStringArrayToCodeableConcept(trial.keywords);
    }
    if (trial.countries != "[]") {
      this.location = this.convertStringArrayToCodeableConcept(trial.countries);
    }
    if (trial.detailedDescription != "") {
      this.description = trial.detailedDescription;
    }
    if (typeof trial.armGroups[Symbol.iterator] === 'function') { // ts returns {} when empty, which is not iterable
      this.arm = [];
      for (const armgroup of trial.armGroups) {
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
        this.arm.push(singleArm);
      }
    }
    if (trial.officialTitle != "") {
      this.objective = [{name: trial.officialTitle}];
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
    let contact = {};
    if (name != "" && phone != "" && email != null) {
      contact = {name: name, telecom: [{system: "phone", value: phone, use: "work"}, {system: "email", value: email, use: "work"}]};
    } else if (name != "" && phone != "") {
      contact = {name: name, telecom: [{system: "phone", value: phone, use: "work"}]};
    } else if (name != "" && email != null) {
      contact = {name: name, telecom: [{system: "email", value: email, use: "work"}]};
    } else if (phone != "" && email != null) {
      contact = {telecom: [{system: "phone", value: phone, use: "work"}, {system: "email", value: email, use: "work"}]};
    } else if (name != "") {
      contact = {name: name};
    } else if (phone != "") {
      contact = {telecom: [{system: "phone", value: phone, use: "work"}]};
    } else if (email != null) {
      contact = {telecom: [{system: "email", value: email, use: "work"}]};
    }
    return [contact];
  }

}


