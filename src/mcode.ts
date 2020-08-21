import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';
import { Bundle } from './bundle';

import { ProfileType, CodingProfile } from '../data/profileSystemLogic';
import { CodeProfile, ProfileSystemCodes } from '../data/profileSystemLogic';

import profile_system_codesX from '../data/profile-system-codes.json';
//import profile_system_logic from '../data/profile-system-logic.json';

const profile_system_codes = profile_system_codesX as ProfileSystemCodes;

export type FHIRPath = string;

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface Quantity {
  value?: number;
  comparator?: string;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Ratio {
  numerator?: Quantity;
  denominator?: Quantity;
}

export interface PrimaryCancerCondition {
  clinicalStatus?: Coding[];
  coding?: Coding[];
  histologyMorphologyBehavior?: Coding[];
}

export interface SecondaryCancerCondition {
  clinicalStatus?: Coding[];
  coding?: Coding[];
  bodySite?: Coding[];
}

export interface TumorMarker {
  code?: Coding[];
  valueQuantity?: Quantity[];
  valueRatio?: Ratio[];
  valueCodeableConcept?: Coding[];
  interpretation?: Coding[];
}

// extracted MCODE info?? WIP
export class extractedMCODE {
  primaryCancerCondition?: PrimaryCancerCondition[]; // wava has 1 resource - need histology extension
  TNMClinicalStageGroup?: Coding[]; // wava has 1 resource
  TNMPathologicalStageGroup?: Coding[]; // wava has 0 resources
  secondaryCancerCondition?: SecondaryCancerCondition[]; // wava has 0 resources
  birthDate?: string;
  tumorMarker?: TumorMarker[];
  cancerRelatedRadiationProcedure?: Coding[]; // can this be a set - wava has 34 of these put they're all the same
  cancerRelatedSurgicalProcedure?: Coding[]; // would also be better as a set
  cancerRelatedMedicationStatement?: Coding[]; // this too

  constructor(patientBundle: Bundle) {
    for (const entry of patientBundle.entry) {
      if (!('resource' in entry)) {
        // Skip bad entries
        continue;
      }
      const resource = entry.resource;

      if (
        resource.resourceType === 'Condition' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-primary-cancer-condition')
      ) {
        const tempPrimaryCancerCondition: PrimaryCancerCondition = {};
        if (this.lookup(resource, 'code.coding').length !== 0) {
          tempPrimaryCancerCondition.coding = this.lookup(resource, 'code.coding') as Coding[];
        }
        if (this.lookup(resource, 'clinicalStatus.coding').length !== 0) {
          tempPrimaryCancerCondition.clinicalStatus = this.lookup(resource, 'clinicalStatus.coding') as Coding[];
        }
        if (this.lookup(resource, 'extension').length !== 0) {
          let count = 0;
          for (const extension of this.lookup(resource, 'extension')) {
            // yeah really not sure you can even do this - not sure how to test this either
            if (this.lookup(resource, `extension[${count}].url`).includes('mcode-histology-morphology-behavior')) {
              tempPrimaryCancerCondition.histologyMorphologyBehavior = this.lookup(
                resource,
                `extension[${count}].valueCodeableConcept.coding`
              ) as Coding[];
            }
            count++;
          }
        }
        if (!tempPrimaryCancerCondition.histologyMorphologyBehavior) {
          tempPrimaryCancerCondition.histologyMorphologyBehavior = [] as Coding[];
        }

        // add primaryCancerCondition
        //this.primaryCancerCondition = addPrimaryCancerCondition(this.primaryCancerCondition, tempPrimaryCancerCondition);
        if (this.primaryCancerCondition) {
          this.primaryCancerCondition.push(tempPrimaryCancerCondition); // needs specific de-dup helper function
        } else {
          this.primaryCancerCondition = [tempPrimaryCancerCondition];
        }
      }

      if (
        resource.resourceType === 'Observation' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-tnm-clinical-stage-group')
      ) {
        this.TNMClinicalStageGroup = this.addCoding(
          this.TNMClinicalStageGroup,
          this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]
        );
        /*
        if (this.TNMClinicalStageGroup) {
          this.TNMClinicalStageGroup = this.TNMClinicalStageGroup.concat(
            this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]
          );
        } else {
          this.TNMClinicalStageGroup = this.lookup(resource, 'valueCodeableConcept.coding') as Coding[];
        }
        */
      }

      if (
        resource.resourceType === 'Observation' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-tnm-pathological-stage-group')
      ) {
        this.TNMPathologicalStageGroup = this.addCoding(
          this.TNMPathologicalStageGroup,
          this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]
        );
        /*
        if (this.TNMPathologicalStageGroup) {
          this.TNMPathologicalStageGroup = this.TNMPathologicalStageGroup.concat(
            this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]
          );
        } else {
          this.TNMPathologicalStageGroup = this.lookup(resource, 'valueCodeableConcept.coding') as Coding[];
        }
        */
      }

      if (
        resource.resourceType === 'Condition' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-secondary-cancer-condition')
      ) {
        const tempSecondaryCancerCondition: { clinicalStatus?: Coding[]; coding?: Coding[]; bodySite?: Coding[] } = {};
        if (this.lookup(resource, 'code.coding').length !== 0) {
          tempSecondaryCancerCondition.coding = this.lookup(resource, 'code.coding') as Coding[];
        }
        if (this.lookup(resource, 'clinicalStatus.coding').length !== 0) {
          tempSecondaryCancerCondition.clinicalStatus = this.lookup(resource, 'clinicalStatus.coding') as Coding[];
        }
        if (this.lookup(resource, 'bodySite.coding').length !== 0) {
          tempSecondaryCancerCondition.bodySite = this.lookup(resource, 'bodySite.coding') as Coding[];
        }
        if (this.secondaryCancerCondition) {
          this.secondaryCancerCondition.push(tempSecondaryCancerCondition); // needs specific de-dup helper function
        } else {
          this.secondaryCancerCondition = [tempSecondaryCancerCondition];
        }
      }

      if (
        resource.resourceType === 'Patient' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-patient')
      ) {
        if (this.lookup(resource, 'birthDate').length !== 0) {
          this.birthDate = this.lookup(resource, 'birthDate')[0] as string;
        }
      }

      if (
        resource.resourceType === 'Observation' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-tumor-marker')
      ) {
        const tempTumorMarker: TumorMarker = {};
        if (this.lookup(resource, 'code.coding').length !== 0) {
          tempTumorMarker.code = this.lookup(resource, 'code.coding') as Coding[];
        }
        if (this.lookup(resource, 'valueQuantity').length !== 0) {
          tempTumorMarker.valueQuantity = this.lookup(resource, 'valueQuantity') as Quantity[];
        }
        if (this.lookup(resource, 'valueRatio').length !== 0) {
          tempTumorMarker.valueRatio = this.lookup(resource, 'valueRatio') as Ratio[];
        }
        if (this.lookup(resource, 'valueCodeableConcept.coding').length !== 0) {
          tempTumorMarker.valueCodeableConcept = this.lookup(resource, 'valueCodeableConcept.coding') as Coding[];
        }
        if (this.lookup(resource, 'interpretation.coding').length !== 0) {
          tempTumorMarker.interpretation = this.lookup(resource, 'interpretation.coding') as Coding[];
        }
        if (this.tumorMarker) {
          this.tumorMarker.push(tempTumorMarker);
        } else {
          this.tumorMarker = [tempTumorMarker];
        }
      }

      if (
        resource.resourceType === 'Procedure' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-related-radiation-procedure')
      ) {
        this.cancerRelatedRadiationProcedure = this.addCoding(
          this.cancerRelatedRadiationProcedure,
          this.lookup(resource, 'code.coding') as Coding[]
        );
      }

      if (
        resource.resourceType === 'Procedure' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-related-surgical-procedure')
      ) {
        this.cancerRelatedSurgicalProcedure = this.addCoding(
          this.cancerRelatedSurgicalProcedure,
          this.lookup(resource, 'code.coding') as Coding[]
        );
      }

      if (
        resource.resourceType === 'MedicationStatement' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-related-medication-statement')
      ) {
        this.cancerRelatedMedicationStatement = this.addCoding(
          this.cancerRelatedMedicationStatement,
          this.lookup(resource, 'medicationCodeableConcept.coding') as Coding[]
        );
      }
    }
  }

  lookup(
    resource: fhirclient.FHIR.Resource,
    path: FHIRPath,
    environment?: { [key: string]: string }
  ): fhirpath.PathLookupResult[] {
    return fhirpath.evaluate(resource, path, environment);
  }
  resourceProfile(profiles: fhirpath.PathLookupResult[], key: string): boolean {
    //console.log(profiles);
    for (const profile of profiles) {
      if ((profile as string).includes(key)) {
        return true;
      }
    }
    return false;
  }
  contains(coding_list: Coding[], coding: Coding): boolean {
    // system code
    return coding_list.some((list_coding) => list_coding.system === coding.system && list_coding.code === coding.code);
  }
  addCoding(code_list: Coding[], codes: Coding[]): Coding[] {
    if (code_list) {
      for (const code of codes) {
        if (!this.contains(code_list, code)) {
          code_list.push(code);
        }
      }
      return code_list;
    } else {
      return codes;
    }
  }
  // Primary Cancer Value
  getPrimaryCancerValue(): string {
    if (!this.primaryCancerCondition) {
      return null;
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // Cycle through each of the primary Cancer condition's codes independently due to code-dependent conditions
      for (const currentCoding of primaryCancerCondition.coding) {
        // 3. Invasive Breast Cancer and Recurrent
        if (
          (primaryCancerCondition.histologyMorphologyBehavior.some((coding) =>
            this.profilesContainCode(coding, 'Morphology-Invasive')
          ) ||
            this.profilesContainCode(currentCoding, 'Cancer-Invasive_Breast')) &&
          this.profilesContainCode(currentCoding, 'Cancer-Breast') &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'recurrence')
        ) {
          return 'Invasive Breast Cancer and recurrent';
        }
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 1. Breast Cancer
      if (primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast'))) {
        return 'Breast Cancer';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 2. Concomitant invasive malignancies
      if (
        primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast')) &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active') &&
        (this.TNMClinicalStageGroup.some((code) =>
          this.profilesContainCode(code, 'Stage-1', 'Stage-2', 'Stage-3', 'Stage-4')
        ) ||
          this.TNMPathologicalStageGroup.some((coding) =>
            this.profilesContainCode(coding, 'Stage-1', 'Stage-2', 'Stage-3', 'Stage-4')
          ))
      ) {
        return 'Concomitant invasive malignancies';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 4. Locally Recurrent
      if (
        primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast')) &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')
      ) {
        return 'Locally Recurrent';
      }
    }
    // None of the conditions satisfied.
    return null;
  }
  // Secondary Cancer Value
  getSecondaryCancerValue(): string {
    if (!this.secondaryCancerCondition) {
      return null;
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 1. Brain Metastasis
      if (
        secondaryCancerCondition.coding.some((coding) => this.profilesContainCode(coding, 'Metastasis-Brain')) &&
        secondaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')
      ) {
        return 'Brain metastasis';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 2. Invasive Breast Cancer and Metastatics
      if (
        (this.primaryCancerCondition.some((primCanCond) =>
          primCanCond.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.profilesContainCode(histMorphBehav, 'Morphology-Invasive')
          )
        ) ||
          this.primaryCancerCondition.some((primCanCond) =>
            primCanCond.coding.some((code) => this.profilesContainCode(code, 'Cancer-Invasive Breast'))
          )) &&
        this.primaryCancerCondition.some((primCanCond) =>
          primCanCond.coding.some((code) => this.profilesContainCode(code, 'Cancer Breast'))
        ) &&
        (secondaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'ANYCODE')) ||
          this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4')) ||
          this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4')))
      ) {
        return 'Invasive Breast Cancer and Metastatic';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 3. Leptomeningeal metastatic disease
      if (secondaryCancerCondition.bodySite.some((bdySte) => bdySte == 'SNOMED#8935007')) {
        // obviously this is wrong
        return 'Leptomeningeal metastatic disease';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 4. Metastatic
      if (
        secondaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'ANYCODE')) ||
        this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4')) ||
        this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4'))
      ) {
        return 'Metastatic';
      }
    }
    // None of the conditions satisfied.
    return null;
  }
  // Histology Morphology Value
  getHistologyMorphologyValue(): string {
    if (!this.primaryCancerCondition) {
      return null;
    }
    // 1. Invasive Carcinoma
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition){
      if(
        ((primaryCancerCondition.coding.some(code => this.profilesContainCode(code, 'Cancer-Breast')))
        && (primaryCancerCondition.histologyMorphologyBehavior.some(histMorphBehav => this.profilesContainCode(histMorphBehav, 'Morphology-Invasive-Carcinoma'))))
        ||
        (primaryCancerCondition.coding.some(code => this.profilesContainCode(code, 'Cancer-Invasive Carcinoma')))) {
          return 'Invasive carcinoma';
      }
    }
    // 2. Invasive Breast Cancer
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition){
      if(
        ((primaryCancerCondition.coding.some(code => this.profilesContainCode(code, 'Cancer-Breast')))
        && (primaryCancerCondition.histologyMorphologyBehavior.some(histMorphBehav => this.profilesContainCode(histMorphBehav, 'Morphology-Invasive'))))
        ||
        (primaryCancerCondition.coding.some(code => this.profilesContainCode(code, 'Cancer-Invasive Breast')))) {
          return 'Invasive carcinoma';
      }
    }
    // None of the conditions satisfied.
    return null;
  }
  getStageValue(): string {
    return '';
  }
  getAgeValue(): string {
    return '';
  }
  getTumorMarkerValue(): string {
    return '';
  }
  getRadiationProcedureValue(): string {
    return '';
  }
  getSurgicalProcedureValue(): string {
    return '';
  }
  getMedicationStatementValue(): string {
    if (!this.cancerRelatedMedicationStatement) {
      return null;
    }
    if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Trastuzumab')) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Pertuzumab')) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-T-DM1'))
    ) {
      return 'DrugCombo-1';
    } else if (
      (this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-CDK4 6 Inhibtor')
      ) ||
        this.cancerRelatedMedicationStatement.some((coding) =>
          this.codeIsInSheet(coding, 'Treatment-mTOR Inhibitor')
        )) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Endocrine Therapy'))
    ) {
      return 'CDK4/6-mTOR and Endocrine ';
    } else if (this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-T-DM1'))) {
      return 'T-DM1';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-CDK4 6 Inhibtor'))
    ) {
      return 'CDK4/6 inhibitor';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Pembrolizumab'))
    ) {
      return 'Pembrolizumab';
    } else if (
      this.cancerRelatedMedicationStatement.some(
        (coding) => this.normalizeCodeSystem(coding.system) == 'NIH' && coding.code == '#C1198'
      )
    ) {
      return 'Poly ICLC';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-mTOR Inhibitor'))
    ) {
      return 'mTOR inhibitor';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Endocrine Therapy'))
    ) {
      return 'Concurrent Endocrine Therapy';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-Androgen'))
    ) {
      return 'Anti-androgen ';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-HER2'))
    ) {
      return 'anti-HER2';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-Tyrosine Kinase Inhib')
      )
    ) {
      return 'Tyrosine Kinase Inhibitor';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-P13K Inhibitor'))
    ) {
      return 'P13K inhibitor';
    } else if (
      this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-anti-PD1,PDL1, PDL2')
      )
    ) {
      return 'anti-PD';
    } else {
      return null;
    }
  }

  codeIsInSheet(coding: Coding, sheetName: string): boolean {
    const code = coding.code;
    const system = this.normalizeCodeSystem(coding.system);
    const codeSet: { code: string }[] = (profile_system_codes[sheetName] as CodeProfile)[system] as { code: string }[];
    console.log(coding);
    // Check that the current code matches the given code.
    for (const currentCode of codeSet) {
      if (coding.code == currentCode.code) {
        return true;
      }
    }
    return false;
  }

  // Normalize the code system. NEED TO ADD MORE CODE SYSTEMS STILL.
  normalizeCodeSystem(codeSystem: string): string {
    if (codeSystem.includes('snomed')) {
      return 'SNOMED';
    } else if (codeSystem.includes('rxnorm')) {
      return 'RxNorm';
    } else if (codeSystem.includes('icd-10')) {
      return 'ICD10';
    } else if (codeSystem.includes('ajcc')) {
      return 'AJCC';
    } else if (codeSystem.includes('loinc')) {
      return 'LOINC';
    } else if (codeSystem.includes('nih')) {
      return 'NIH';
    } else {
      return '';
    }
  }

  // Return whether any of the codes in a given coding exist in the given profiles.
  profilesContainCode(coding: Coding, ...profiles: string[]): boolean {
    // Cycle through the profiles
    for (const profile of profiles) {
      // Pull out the relevant codes from the relevant code system.
      const currentCodeSystem: string = this.normalizeCodeSystem(coding.system);
      //console.log(profile);
      //console.log(profile_system_codes[profile]);
      const codeSet: { code: string }[] = (profile_system_codes[profile] as CodeProfile)[currentCodeSystem] as {
        code: string;
      }[];
      console.log(coding);
      // Check that the current code matches the given code.
      for (const currentCode of codeSet) {
        if (coding.code == currentCode.code) {
          return true;
        }
      }
    }
    // If we reach here, there were no codes in the given profile.
    return false;
  }
  // Returns whether the given code is any code not in the given profile.
  profileDoesNotContainCode(coding: Coding, profile: string): boolean {
    if (coding.code == undefined || coding.code == null) {
      return false;
    } else {
      return !this.profilesContainCode(coding, profile);
    }
  }
}