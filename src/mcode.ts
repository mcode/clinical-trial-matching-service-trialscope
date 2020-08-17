import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';
import { Bundle } from './bundle';

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
        this.TNMClinicalStageGroup = this.addCoding(this.TNMClinicalStageGroup, this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]);
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
        this.TNMPathologicalStageGroup = this.addCoding(this.TNMPathologicalStageGroup, this.lookup(resource, 'valueCodeableConcept.coding') as Coding[]);
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
        this.cancerRelatedRadiationProcedure = this.addCoding(this.cancerRelatedRadiationProcedure, this.lookup(resource, 'code.coding') as Coding[]);
      }

      if (
        resource.resourceType === 'Procedure' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-related-surgical-procedure')
      ) {
        this.cancerRelatedSurgicalProcedure = this.addCoding(this.cancerRelatedSurgicalProcedure, this.lookup(resource, 'code.coding') as Coding[]);
      }

      if (
        resource.resourceType === 'MedicationStatement' &&
        this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-related-medication-statement')
      ) {
        this.cancerRelatedMedicationStatement = this.addCoding(this.cancerRelatedMedicationStatement, this.lookup(resource, 'medicationCodeableConcept.coding') as Coding[]);
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
  contains(coding_list: Coding[], coding: Coding): boolean { // system code
    return coding_list.some(list_coding => list_coding.system === coding.system && list_coding.code === coding.code);
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
  */
}
