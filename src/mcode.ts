import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';
import { Bundle } from './bundle';

import { ProfileType, CodingProfile } from '../data/profileSystemLogic';
import { CodeProfile, ProfileSystemCodes } from '../data/profileSystemLogic';

import profile_system_codesX from '../data/profile-system-codes.json';
import { toJson } from 'xml2json';

const profile_system_codes = profile_system_codesX as ProfileSystemCodes;

export type FHIRPath = string;

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface Quantity {
  value?: number | string;
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

export interface CancerRelatedRadiationProcedure {
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
  primaryCancerCondition: PrimaryCancerCondition[]; // wava has 1 resource - need histology extension
  TNMClinicalStageGroup: Coding[]; // wava has 1 resource
  TNMPathologicalStageGroup: Coding[]; // wava has 0 resources
  secondaryCancerCondition: SecondaryCancerCondition[]; // wava has 0 resources
  birthDate: string;
  tumorMarker: TumorMarker[];
  cancerRelatedRadiationProcedure: CancerRelatedRadiationProcedure[]; // can this be a set - wava has 34 of these put they're all the same
  cancerRelatedSurgicalProcedure: Coding[]; // would also be better as a set
  cancerRelatedMedicationStatement: Coding[]; // this too

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
        tempPrimaryCancerCondition.coding = this.lookup(resource, 'code.coding') as Coding[];
        tempPrimaryCancerCondition.clinicalStatus = this.lookup(resource, 'clinicalStatus.coding') as Coding[];
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
      }

      if (
        resource.resourceType === 'Observation' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-tnm-pathological-stage-group')
      ) {
        this.TNMPathologicalStageGroup = this.addCoding(
          this.TNMPathologicalStageGroup,
          this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]
        );
      }

      if (
        resource.resourceType === 'Condition' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-secondary-cancer-condition')
      ) {
        const tempSecondaryCancerCondition: SecondaryCancerCondition = {};
        tempSecondaryCancerCondition.coding = this.lookup(resource, 'code.coding') as Coding[];
        tempSecondaryCancerCondition.clinicalStatus = this.lookup(resource, 'clinicalStatus.coding') as Coding[];
        tempSecondaryCancerCondition.bodySite = this.lookup(resource, 'bodySite.coding') as Coding[];
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
        } else {
          this.birthDate = 'NA';
        }
      }

      if (
        resource.resourceType === 'Observation' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-tumor-marker')
      ) {
        const tempTumorMarker: TumorMarker = {};
        tempTumorMarker.code = this.lookup(resource, 'code.coding') as Coding[];
        tempTumorMarker.valueQuantity = this.lookup(resource, 'valueQuantity') as Quantity[];
        tempTumorMarker.valueRatio = this.lookup(resource, 'valueRatio') as Ratio[];
        tempTumorMarker.valueCodeableConcept = this.lookup(resource, 'valueCodeableConcept.coding') as Coding[];
        tempTumorMarker.interpretation = this.lookup(resource, 'interpretation.coding') as Coding[];
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
        const tempCancerRelatedRadiationProcedure: CancerRelatedRadiationProcedure = {};
        tempCancerRelatedRadiationProcedure.coding = this.lookup(resource, 'code.coding') as Coding[];
        tempCancerRelatedRadiationProcedure.bodySite = this.lookup(resource, 'bodySite.coding') as Coding[];
        if (this.cancerRelatedRadiationProcedure) {
          if (
            !this.listContainsRadiationProcedure(
              this.cancerRelatedRadiationProcedure,
              tempCancerRelatedRadiationProcedure
            )
          ) {
            this.cancerRelatedRadiationProcedure.push(tempCancerRelatedRadiationProcedure);
          }
        } else {
          this.cancerRelatedRadiationProcedure = [tempCancerRelatedRadiationProcedure];
        }
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
    // add empty fields if they are not yet undefined
    if (!this.primaryCancerCondition) {
      this.primaryCancerCondition = [] as PrimaryCancerCondition[];
    }
    if (!this.TNMClinicalStageGroup) {
      this.TNMClinicalStageGroup = [] as Coding[];
    }
    if (!this.TNMPathologicalStageGroup) {
      this.TNMPathologicalStageGroup = [] as Coding[];
    }
    if (!this.secondaryCancerCondition) {
      this.secondaryCancerCondition = [] as SecondaryCancerCondition[];
    }
    if (!this.birthDate) {
      this.birthDate = 'NA';
    }
    if (!this.tumorMarker) {
      this.tumorMarker = [] as TumorMarker[];
    }
    if (!this.cancerRelatedRadiationProcedure) {
      this.cancerRelatedRadiationProcedure = [] as CancerRelatedRadiationProcedure[];
    }
    if (!this.cancerRelatedSurgicalProcedure) {
      this.cancerRelatedSurgicalProcedure = [] as Coding[];
    }
    if (!this.cancerRelatedMedicationStatement) {
      this.cancerRelatedMedicationStatement = [] as Coding[];
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
  listContainsRadiationProcedure(
    procedure_list: CancerRelatedRadiationProcedure[],
    procedure: CancerRelatedRadiationProcedure
  ): boolean {
    for (const stored_procedure of procedure_list) {
      if (
        procedure.coding.every((coding1) =>
          stored_procedure.coding.some((coding2) => coding1.system == coding2.system && coding1.code == coding2.code)
        ) &&
        (!procedure.bodySite ||
          !stored_procedure.bodySite ||
          procedure.bodySite.every((coding1) =>
            stored_procedure.coding.some((coding2) => coding1.system == coding2.system && coding1.code == coding2.code)
          ))
      ) {
        return true;
      }
    }
    return false;
  }
  // Primary Cancer Value
  getPrimaryCancerValue(): string {
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
    // None of the conditions are satisfied.
    return null;
  }
  // Secondary Cancer Value
  getSecondaryCancerValue(): string {
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
    if (!this.TNMClinicalStageGroup || !this.TNMPathologicalStageGroup) {
      return null;
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
            primCanCond.coding.some((code) => this.profilesContainCode(code, 'Cancer-Invasive_Breast'))
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
    // None of the conditions are satisfied.
    return null;
  }
  // Histology Morphology Value
  getHistologyMorphologyValue(): string {
    // 1. Invasive Carcinoma
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.profilesContainCode(histMorphBehav, 'Morphology-Invasive-Carcinoma')
          )) ||
        primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Invasive Carcinoma'))
      ) {
        return 'Invasive carcinoma';
      }
    }
    // 2. Invasive Breast Cancer
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.profilesContainCode(histMorphBehav, 'Morphology-Invasive')
          )) ||
        primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Invasive_Breast'))
      ) {
        return 'Invasive carcinoma';
      }
    }
    // None of the conditions are satisfied.
    return null;
  }
  getStageValue(): string {
    // this.TNMClinicalStageGroup.some(code => console.log(code));
    // 1. Invasive Breast Cancer and Locally Advanced
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) => console.log(histMorphBehav));
      console.log('---');
      primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) => console.log(histMorphBehav));
      if (
        ((primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
          this.profilesContainCode(histMorphBehav, 'Morphology-Invasive')
        ) &&
          primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Breast'))) ||
          primaryCancerCondition.coding.some((code) => this.profilesContainCode(code, 'Cancer-Invasive_Breast'))) &&
        (this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3', 'Stage-4')) ||
          this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3', 'Stage-4')))
      ) {
        return 'Invasive Breast Cancer and Locally Advanced';
      }
    }
    // 2. Non-Invasive
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-0')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-0'))
    ) {
      return 'Non-Invasive';
    }
    // 3. Locally Advanced
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3'))
    ) {
      return 'Locally Advanced';
    }
    // 4. Stage 0
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-0')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-0'))
    ) {
      return 'Stage 0';
    }
    // 5. Stage 1
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-1')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-1'))
    ) {
      return 'Stage 1';
    }
    // 6. Stage 2
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-2')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-2'))
    ) {
      return 'Stage 2';
    }
    // 7. Stage 3
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-3'))
    ) {
      return 'Stage 3';
    }
    // 8. Stage 4
    if (
      this.TNMClinicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4')) ||
      this.TNMPathologicalStageGroup.some((code) => this.profilesContainCode(code, 'Stage-4'))
    ) {
      return 'Stage 4';
    }
    // None of the conditions are satisfied.
    return null;
  }
  // Age (18 or younger/older)
  getAgeValue(): string {
    if (this.birthDate == 'NA') {
      return null;
    }
    // Birthdate is in format: '1966-08-03'
    const today: Date = new Date();
    const checkDate: Date = new Date(this.birthDate);
    // Time Difference (Milliseconds)
    const millisecondsAge = today.getTime() - checkDate.getTime();
    const milliseconds18Years = 1000 * 60 * 60 * 24 * 365 * 18;
    return millisecondsAge > milliseconds18Years ? '18 Or Over' : 'Under 18';
  }
  getTumorMarkerValue(): string {
    // add return if tumorMarker is empty
    // these definitely aren't in a most specific to least specific order, so we'll need to rearrange them
    // HER2+
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Positive(tumorMarker)) {
        return 'HER2+';
      }
    }
    // HER2+ and ER+
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Positive(tumorMarker) && this.isERPositive(tumorMarker, 10)) {
        return 'HER2+ and ER+';
      }
    }
    // HER2+ and PR+
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Positive(tumorMarker) && this.isPRPositive(tumorMarker, 10)) {
        return 'HER2+ and PR+';
      }
    }
    // ER+ and HER2-
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Negative(tumorMarker) && this.isERPositive(tumorMarker, 1)) {
        return 'ER+ and HER2-';
      }
    }
    // PR+ and HER2-
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Negative(tumorMarker) && this.isPRPositive(tumorMarker, 1)) {
        return 'HER2+ and PR+';
      }
    }
    // ER+ and HER2- and FGFR amplifications
    for (const tumorMarker of this.tumorMarker) {
      if (
        this.isERPositive(tumorMarker, 1) &&
        this.isHER2Negative(tumorMarker) &&
        this.isFGFRAmplification(tumorMarker, 1)
      ) {
        return 'ER+ and HER2- and FGFR amplifications';
      }
    }
    // PR+ and HER2- and FGFR amplifications
    for (const tumorMarker of this.tumorMarker) {
      if (
        this.isPRPositive(tumorMarker, 1) &&
        this.isHER2Negative(tumorMarker) &&
        this.isFGFRAmplification(tumorMarker, 1)
      ) {
        return 'PR+ and HER2- and FGFR amplifications';
      }
    }
    // ER+ PR+ HER2-
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Negative(tumorMarker) && this.isPRPositive(tumorMarker, 1) && this.isERPositive(tumorMarker, 1)) {
        return 'ER+ PR+ HER2-';
      }
    }
    // Triple Negative
    for (const tumorMarker of this.tumorMarker) {
      if (this.isHER2Negative(tumorMarker) && this.isPRNegative(tumorMarker, 1) && this.isERNegative(tumorMarker, 1)) {
        return 'Triple Negative';
      }
    }
    // Triple Negative-10
    for (const tumorMarker of this.tumorMarker) {
      if (
        this.isHER2Negative(tumorMarker) &&
        this.isPRNegative(tumorMarker, 10) &&
        this.isERNegative(tumorMarker, 10)
      ) {
        return 'Triple Negative-10';
      }
    }
    // Triple Negative and RB Positive
    for (const tumorMarker of this.tumorMarker) {
      if (
        this.isHER2Negative(tumorMarker) &&
        this.isPRNegative(tumorMarker, 1) &&
        this.isERNegative(tumorMarker, 1) &&
        this.isRBPositive(tumorMarker, 50)
      ) {
        return 'Triple Negative and RB Positive';
      }
    }
    // None of the conditions are satisfied.
    return null;
  }
  isHER2Positive(tumorMarker: TumorMarker): boolean {
    console.log(tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-HER2')));
    return (
      tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-HER2')) &&
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
      ) ||
        tumorMarker.interpretation.some((interp) => (interp.code ==  'POS' || interp.code ==  'DET' || interp.code == 'H') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
        tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, ['3', '3+'], '=')))
    );
  }
  quantityMatch(quantValue: string | number, quantComparator: string, quantUnit: string, metricValues: string[] | number[], metricComparator: string, metricUnit?: string) {
    if ((!quantComparator && metricComparator != '=') || (quantComparator && quantComparator != metricComparator)) {
      console.log("incompatible comparators");
      return false;
    }
    if ((!quantUnit && metricUnit) || (quantUnit && !metricUnit) || (quantUnit != metricUnit)) {
      console.log("incompatible units")
      return false;
    }

    if (metricComparator == '=') {
      quantValue = typeof quantValue == 'string' ? quantValue: quantValue.toString(); // we're doing string comparisons for these
      return metricValues.some(value => quantValue == value);
    } else if (metricComparator == '>=') {
      return quantValue >= metricValues[0];
    } else if (metricComparator == '<') {
      return quantValue < metricValues[0];
    } else if (metricComparator == '>') {
      return quantValue > metricValues[0];
    } else {
      console.log("err unknown operator");
      return false;
    }

  }
  isHER2Negative(tumorMarker: TumorMarker): boolean {
    tumorMarker.interpretation.some((interp) => console.log(interp));
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009'
      ) ||
        tumorMarker.interpretation.some((interp) => (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||  // Information on Interpretation values can be found at: http://hl7.org/fhir/R4/valueset-observation-interpretation.html
        tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, ['0', '1', '2', '1+', '2+'], '=') )) &&
      tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-HER2'))
    );
  }
  isPRPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
      ) ||
      tumorMarker.interpretation.some((interp) => (interp.code ==  'POS' || interp.code ==  'DET' || interp.code == 'H') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
      (tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '>=', '%')) &&
        tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-PR')))
    );
  }
  isPRNegative(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009'
      ) ||
      tumorMarker.interpretation.some((interp) => (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
      (tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '<', '%') ||
                                                    this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [0], '=')) &&
        tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-PR')))
    );
  }
  isERPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
      ) ||
      tumorMarker.interpretation.some((interp) => (interp.code ==  'POS' || interp.code ==  'DET' || interp.code == 'H') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
      (tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '>=', '%')) &&
        tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-ER')))
    );
  }
  isERNegative(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009'
      ) ||
      tumorMarker.interpretation.some((interp) => (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
      (tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '<', '%') ||
                                                    this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [0], '=')) &&
        tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-ER')))
    );
  }
  isFGFRAmplification(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
      ) ||
        tumorMarker.interpretation.some((interp) => (interp.code ==  'POS' || interp.code ==  'DET' || interp.code == 'H') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
        tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '>=', '%'))) &&
      tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-FGFR'))
    );
  }
  isRBPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueQuantity.some((valQuant) => this.quantityMatch(valQuant.value, valQuant.comparator, valQuant.code, [metric], '>', '%')) ||
        tumorMarker.valueCodeableConcept.some(
          (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
        ) ||
        tumorMarker.interpretation.some((interp) => (interp.code ==  'POS' || interp.code ==  'DET' || interp.code == 'H') && interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html')) &&
      tumorMarker.code.some((code) => this.profilesContainCode(code, 'Biomarker-RB'))
    );
  }
  getRadiationProcedureValue(): string {
    if (this.cancerRelatedRadiationProcedure.length == 0) {
      return null;
    }
    for (const cancerRelatedRadiationProcedure of this.cancerRelatedRadiationProcedure) {
      if (
        cancerRelatedRadiationProcedure.coding &&
        cancerRelatedRadiationProcedure.coding.some((coding) => this.codeIsInSheet(coding, 'Treatment-SRS-Brain'))
      ) {
        return 'SRS';
      }
    }
    for (const cancerRelatedRadiationProcedure of this.cancerRelatedRadiationProcedure) {
      if (
        cancerRelatedRadiationProcedure.coding &&
        cancerRelatedRadiationProcedure.bodySite &&
        cancerRelatedRadiationProcedure.coding.some(
          (coding) => this.normalizeCodeSystem(coding.system) == 'SNOMED' && coding.code == '108290001'
        ) &&
        cancerRelatedRadiationProcedure.bodySite.some(
          (coding) =>
            this.normalizeCodeSystem(coding.system) == 'SNOMED' &&
            (coding.code == '12738006' || coding.code == '119235005')
        )
      ) {
        return 'WBRT';
      }
    }
    return 'Radiation Therapy';
  }
  getSurgicalProcedureValue(): string {
    if (this.cancerRelatedSurgicalProcedure.length == 0) {
      return null;
    }
    if (this.cancerRelatedSurgicalProcedure.some((coding) => this.codeIsInSheet(coding, 'Treatment-Resection-Brain'))) {
      return 'Resection';
    } else if (
      this.cancerRelatedSurgicalProcedure.some((coding) => this.codeIsInSheet(coding, 'Treatment-Splenectomy'))
    ) {
      return 'Splenectomy';
    } else {
      return null;
    }
  }
  getMedicationStatementValue(): string {
    if (this.cancerRelatedMedicationStatement.length == 0) {
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
    let codeSet: { code: string }[] = (profile_system_codes[sheetName] as CodeProfile)[system] as { code: string }[];
    if (!codeSet) {
      codeSet = [];
    }
    //console.log(coding);
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
      let codeSet: { code: string }[] = (profile_system_codes[profile] as CodeProfile)[currentCodeSystem] as {
        code: string;
      }[];
      if (!codeSet) {
        codeSet = [];
      }
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