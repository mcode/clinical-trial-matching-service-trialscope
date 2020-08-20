import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';
import { Bundle } from './bundle';

import { ProfileType, CodingProfile } from '../data/profileSystemLogic';
import { CodeProfile } from '../data/profileSystemLogic';

import profile_system_codes from '../data/profile-system-codes.json';
import profile_system_logic from '../data/profile-system-logic.json';

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

    console.log(this);
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
  /*
  addPrimaryCancerCondition(condition_list: PrimaryCancerCondition[], condition: PrimaryCancerCondition): PrimaryCancerCondition[] {
    if (condition_list) {


    } else {
      return [condition];
    }
  }
  // Return the filter type based on the input profile string.
  public getFilterType(filter: string, extractedMCODE: extractedMCODE): string {
    // Parse through the logic JSON and check if certain conditions are met to return the corresponding string.
    const typeStrings: string[] = (profile_system_logic[filter] as ProfileType).types;
    for (const profileType of typeStrings) {
      if (this.parseOperation(profileType['operation'], extractedMCODE)) {
        // If the conditions associated with this type are all true, return this type.
        return profileType['type'] as string;
      }
    }
    // If there's no type that satisfies this person's attributes, return null.
    return null;
  }
  // Parse an operation and return whether it returns TRUE or FALSE.
  parseOperation(operation: string, extractedMCODE: extractedMCODE): boolean {
    console.log(operation['operatorType']);

    // If there are no more operations within this operation, then we've reached a leaf condition.
    if (operation['operations'] == null) {
      if (operation['operatorType'] == 'AND') {
        for (const condition of operation['conditions']) {
          // Cycle through the conditions and check if they meet the AND requirements.
          if (!this.checkConditionValidity(condition, extractedMCODE)) {
            return false;
          }
        }
        // If they're all true, then we reach here.
        return true;
      } else if (operation['operatorType'] == 'OR') {
        for (const condition of operation['conditions']) {
          // Cycle through the conditions and check if they meet the OR requirements.
          if (this.checkConditionValidity(condition, extractedMCODE)) {
            return true;
          }
        }
        // If they're all false, then we reach here.
        return false;
      } else if (operation['operatorType'] == 'NONE') {
        // There will be one condition, check if it is satisfied.
        const tempConditionArray: string[] = new Array(operation['conditions']) as string[];
        const tempConditionString = tempConditionArray[0][0];
        return this.checkConditionValidity(tempConditionString, extractedMCODE);
      }
    } else {
      if (operation['operatorType'] == 'AND') {
        // We need to parse through the operations and find their values.
        for (const subOperation of operation['operations']) {
          if (!this.parseOperation(subOperation, extractedMCODE)) {
            return false;
          }
        }
        // If they're all true, then we reach here.
        return true;
      } else if (operation['operatorType'] == 'OR') {
        // We need to parse through the operations and find their values.
        for (const subOperation of operation['operations']) {
          if (this.parseOperation(subOperation, extractedMCODE)) {
            return true;
          }
        }
        // If they're all false, then we reach here.
        return false;
      }
    }
    console.log('LOGIC ERROR');
    return false;
  }
  // Check whether the current condition is TRUE or FALSE
  checkConditionValidity(condition: string, extractedMCODE: extractedMCODE): boolean {
    console.log(condition);

    const tempConditionString: string = condition['condition'] as string;
    console.log(tempConditionString);

    const splitConditions = tempConditionString.split(' ');
    const operator = splitConditions[1];

    // Each of these operator types are based on a code being in a profile.
    if (operator == 'is-in' || operator == 'is-any-code' || operator == 'any-code-not-in') {
      const neededCode: string = splitConditions[0];
      const codesToCheck: CodingProfile[] = new Array(10) as CodingProfile[];
      const systemsToCheck: string[] = new Array(10) as string[];

      // Pull the correct code and code system from the extractedMCODE
      const codeType: string = neededCode.split('-code')[0];
      let i = 0;
      for (const currentCode of extractedMCODE[codeType]) {
        codesToCheck[i] = currentCode as CodingProfile;
        systemsToCheck[i] = codesToCheck[i]['coding'][0].system;
        i++;
      }
      // Make sure it was a valid code.
      if (
        neededCode != 'primaryCancerCondition-code' &&
        neededCode != 'secondaryCancerCondition-code' &&
        neededCode != 'cancerRelatedRadiationProcedure-code' &&
        neededCode != 'tumorMarker-code'
      ) {
        console.log('CONDITION ERROR: INVALID CODE TYPE');
        return false;
      }

      // Cycle through the list of codes and check
      let currentIndex = 0;
      for (const currentCode of codesToCheck) {
        let currentCodeSystem: string = systemsToCheck[currentIndex];

        // Normalize the code system. NEED TO ADD MORE CODE SYSTEMS STILL.
        if (currentCodeSystem.includes('snomed')) {
          currentCodeSystem = 'SNOMED';
        } else if (currentCodeSystem.includes('rxnorm')) {
          currentCodeSystem = 'RXNORM';
        } else if (currentCodeSystem.includes('icd-10')) {
          currentCodeSystem = 'ICD10';
        } else if (currentCodeSystem.includes('ajcc')) {
          currentCodeSystem = 'AJCC';
        } else if (currentCodeSystem.includes('loinc')) {
          currentCodeSystem = 'LOINC';
        } else {
          console.log('INVALID CODE SYSTEM ERROR');
          console.log(currentCodeSystem);
        }

        //This condition is based on whether a code is in a certain code system.
        const profileList: string[] = splitConditions[2].split('*');
        let anyCodeNotInOperation = true;
        if (operator == 'is-any-code') {
          // Chcek that there is any code at all.
          if (currentCode != undefined) {
            return true;
          }
        } else if (operator == 'any-code-not-in') { // what about the is-in operator?
          // Pull the list of profiles that it should NOT be in.
          anyCodeNotInOperation = false;
        }

        // Cycle through the list of profiles to check the conditions for all.
        for (const profile of profileList) {
          // Check if the current profile contains the current code.
          const codeSet: string[] = (profile_system_codes[profile] as CodeProfile)[currentCodeSystem] as string[];
          for (const checkCode of codeSet) {
            console.log(checkCode);
            if (checkCode['code'] == currentCode['coding'][0]['code']) {
              console.log('MATCH FOUND');
              // If the code is supposed to be in the list, returns true. If it's not, returns false.
              return anyCodeNotInOperation;
            }
          }
          // If the code was never found in the list, and it wasn't supposed to, return true.
          if (!anyCodeNotInOperation) {
            console.log('MATCH NOT FOUND FOR AN ANY-CODE-NOT-IN OPERATION');
            return true;
          }
        }
        currentIndex++;
      }
    } else if (operator == '=') {
      // Simple equality logic

      // The lefthand side of the '=' operator.
      const neededRequirement: string = splitConditions[0];
      // The righthand side of the '=' operator.
      const equalityValue: string = splitConditions[2];
      let currentRequirement: string;

      if (neededRequirement == 'valueCodeableConcept') {
        const valueCodeableConcept: Coding[] = extractedMCODE.tumorMarker[0].valueCodeableConcept;
      } else if (neededRequirement == 'valueQuantity/valueRatio') {
        const quantity: Quantity[] = extractedMCODE.tumorMarker[0].valueQuantity;
        const ratio: Ratio[] = extractedMCODE.tumorMarker[0].valueRatio;
      } else if (neededRequirement == 'interpretaion') {
        const quantity: Quantity[] = extractedMCODE.tumorMarker[0].interpretation;
        // compare display? or code?
      } else if (neededRequirement == 'clinicalstatus') {
        // primary/secondary cancer conditions use/have this
        currentRequirement = extractedMCODE.secondaryCancerCondition[0].clinicalStatus[0].code;
      } else if (neededRequirement == 'SecondaryCancerCondition-bodySite') {
        currentRequirement = extractedMCODE.secondaryCancerCondition[0].clinicalStatus[0].code;
      } else if (neededRequirement == 'CancerRelatedMedicationStatement-medication[x]') {
        currentRequirement = extractedMCODE.cancerRelatedMedicationStatement[0].code;
        // The code/string may need to be parsed for this correctly work. Haven't been able to test it.
        if (currentRequirement == equalityValue) {
          return true;
        }
      } else if (neededRequirement == 'cancerRelatedRadiationProcedure-code-medication[x]') {
        currentRequirement = extractedMCODE.cancerRelatedRadiationProcedure[0].code;
        // The code/string may need to be parsed for this correctly work. Haven't been able to test it.
        if (currentRequirement == equalityValue) {
          return true;
        }
      }
    } else {
      console.log('CONDITION ERROR: INVALID CONDITION TYPE');
      return false;
    }
    // If we reach here, no conditions were satisfied, thus it is false.
    return false;
  }
  */

  getPrimaryCancerValues(extractedMCODE:extractedMCODE): string {
    // Cycle through each of the primary cancer objects and check that they satisfy different requirements.
    for (const primaryCancerCondtion of extractedMCODE.primaryCancerCondition){

      // Cycle through each of the primary Cancer condition's codes independently due to code-dependent conditions
      for (const currentCoding of primaryCancerCondtion.coding){

        // 1. Breast Cancer
        if (this.profilesContainCode(currentCoding, 'Cancer-Breast')) {
          return 'Breast Cancer';
        }
        // 2. Concomitant invasive malignancies
        if (
          ((this.profileDoesNotContainCode(currentCoding, 'Cancer-Breast')) && (primaryCancerCondtion.clinicalStatus[0].display == 'current'))
          &&
          ((this.profilesContainCode(extractedMCODE.TNMClinicalStageGroup[0], 'Stage-1','Stage-2','Stage-3','Stage-4')) || (this.profilesContainCode(extractedMCODE.TNMPathologicalStageGroup[0], 'Stage-1','Stage-2','Stage-3','Stage-4')))
          ) {
          return 'Concomitant invasive malignancies';
        }
        // 3. Invasive Breast Cancer and Recurrent
        if (
          ((this.profilesContainCode(primaryCancerCondtion.histologyMorphologyBehavior[0], 'Morphology-Invasive') || this.profilesContainCode(currentCoding, 'Cancer-Invasive Breast'))
          &&
          (this.profilesContainCode(currentCoding, 'Cancer-Breast')))
          &&
          (primaryCancerCondtion.clinicalStatus[0].display == 'current')
          ) {
            return 'Invasive Breast Cancer and recurrent';
        }
        // 4. Locally Recurrent
        if (
          (this.profilesContainCode(currentCoding, 'Cancer-Breast') && (primaryCancerCondtion.clinicalStatus[0].display == 'recurrent'))
          ) {
            return 'Locally Recurrent';
        }
      }
    }
  }
  getSecondaryCancerValues(extractedMCODE:extractedMCODE): string {
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of extractedMCODE.secondaryCancerCondition){

      // Cycle through each of the secondary Cancer condition's codes independently due to code-dependent conditions
      for (const currentCoding of secondaryCancerCondition.coding){

        // 1. Brain Metastasis
        if (this.profilesContainCode(currentCoding, 'Metastasis-Brain') && secondaryCancerCondition.clinicalStatus[0].display == 'active') {
          return 'Brain metastasis';
        }
        // 2. Invasive Breast Cancer and Metastatics
        if (
          ((this.profilesContainCode(extractedMCODE.primaryCancerCondition[0].histologyMorphologyBehavior[0], 'Morphology-Invasive') || this.profilesContainCode(extractedMCODE.primaryCancerCondition[0].coding[0], 'Cancer-Invasive Breast'))
          &&

      }
    }
  }
  getHistologyMorphologyValue(): string {

  }
  getStageValue(): string {

  }
  getAgeValue(): string {

  }
  getTumorMarkerValue(): string {

  }
  getRadiationProcedureValue(): string {

  }
  getSurgicalProcedureValue(): string {

  }
  getMedicationStatementValue(): string {
    if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Trastuzamab')) &&
              this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Pertuzumab')) &&
              this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-T-DM1')) ) {

      return 'DrugCombo-1';

    } else if ( (this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-CDK46 Inhibitor')) ||
               this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'mTOR Inhibitor'))) &&
               this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Endocrine Therapy')) ) {

      return 'CDK4/6-mTOR and Endocrine ';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-T-DM1')) ) {

      return 'T-DM1';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-CDK4 6 Inhibtor')) ) {

      return 'CDK4/6 inhibitor';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Pembrolizumab')) ) {

      return 'Pembrolizumab';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => this.normalizeCodeSystem(coding.system) == 'NIH' &&
                                                                      coding.code == '#C1198') ) {

      return 'Poly ICLC';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-mTOR Inhibtor')) ) {

      return 'mTOR inhibitor';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Endocrine Therapy')) ) {

      return 'Concurrent Endocrine Therapy';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-anti-Androgen')) ) {

      return 'Anti-androgen ';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-anti-HER2')) ) {

      return 'anti-HER2';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-Tyrosine Kinase Inhib')) ) {

      return 'Tyrosine Kinase Inhibitor';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-P13K Inhibitor')) ) {

      return 'P13K inhibitor';

    } else if ( this.cancerRelatedMedicationStatement.some(coding => codeIsInSheet(coding, 'Treatment-anti-PD1, PDL1, PDL2')) ) {

      return 'anti-PD';

    }
  }

  codeIsInSheet(coding: Coding, sheetName: string): boolean {
    const code = coding.code;
    const system = this.normalizeCodeSystem(coding.system);
    const codeSet: string[] = (profile_system_codes[sheetName] as CodeProfile)[system] as string[];
    console.log(coding);
    // Check that the current code matches the given code.
    for (const currentCode: string of codeSet) {
      if(coding.code == currentCode){
        return true;
      }
    }
    return false;
  }

  // Normalize the code system. NEED TO ADD MORE CODE SYSTEMS STILL.
  normalizeCodeSystem(codeSystem : string) : string {
    if (codeSystem.includes('snomed')) {
      return 'SNOMED';
    } else if (codeSystem.includes('rxnorm')) {
      return 'RXNORM';
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
      for(const profile: string of profiles){
      // Pull out the relevant codes from the relevant code system.
      const currentCodeSystem: string = this.normalizeCodeSystem(coding.system);
      const codeSet: string[] = (profile_system_codes[profile] as CodeProfile)[currentCodeSystem] as string[];
      console.log(coding);
      // Check that the current code matches the given code.
      for (const currentCode: string of codeSet) {
        if(coding.code == currentCode){
          return true;
        }
      }
    }
    // If we reach here, there were no codes in the given profile.
    return false;
  }
  // Returns whether the given code is any code not in the given profile.
  profileDoesNotContainCode(coding: Coding, profile: string): boolean {
    if(coding.code == undefined || coding.code == null){
      return false;
    } else {
      return !this.profileContainsCode(coding, profile);
    }
  }
}
