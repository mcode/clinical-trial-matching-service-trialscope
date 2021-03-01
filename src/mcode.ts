import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';

import { CodeProfile, ProfileSystemCodes } from './profileSystemLogic';

import profile_system_codes_json from '../data/profile-system-codes-json.json';
import { fhir } from 'clinical-trial-matching-service';

const profile_system_codes = profile_system_codes_json as ProfileSystemCodes;

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

export interface CancerGeneticVariant {
  code?: Coding[];
  component?: CancerGeneticVariantComponent;
  valueCodeableConcept?: Coding[];
  interpretation?: Coding[];
}

export interface CancerGeneticVariantComponent {
  geneStudied?: CancerGeneticVariantComponentType[];
  genomicsSourceClass?: CancerGeneticVariantComponentType[];
}

export interface CancerGeneticVariantComponentType {
  code?: { coding: Coding[] };
  valueCodeableConcept?: { coding: Coding[] };
  interpretation?: { coding: Coding[] };
}

// extracted MCODE info
export class ExtractedMCODE {
  primaryCancerCondition: PrimaryCancerCondition[];
  TNMClinicalStageGroup: Coding[];
  TNMPathologicalStageGroup: Coding[];
  secondaryCancerCondition: SecondaryCancerCondition[];
  birthDate: string;
  tumorMarker: TumorMarker[];
  cancerGeneticVariant: CancerGeneticVariant[];
  cancerRelatedRadiationProcedure: CancerRelatedRadiationProcedure[];
  cancerRelatedSurgicalProcedure: Coding[];
  cancerRelatedMedicationStatement: Coding[];
  ecogPerformaceStatus: number;
  karnofskyPerformanceStatus: number;

  constructor(patientBundle: fhir.Bundle) {
    if (patientBundle != null) {
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
              if (
                (this.lookup(resource, `extension[${count}].url`)[0] as string).includes(
                  'mcode-histology-morphology-behavior'
                )
              ) {
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
            this.primaryCancerCondition.push(tempPrimaryCancerCondition);
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
        // Parse and Extract mCODE Cancer Genetic Variant
        if (
          resource.resourceType === 'Observation' &&
          this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-cancer-genetic-variant')
        ) {
          const tempCGV: CancerGeneticVariant = {};
          tempCGV.code = this.lookup(resource, 'code.coding') as Coding[]; // not used in logic
          tempCGV.component = {
            geneStudied: [] as CancerGeneticVariantComponentType[],
            genomicsSourceClass: [] as CancerGeneticVariantComponentType[]
          };
          for (const currentComponent of this.lookup(resource, 'component') as CancerGeneticVariantComponentType[]) {
            if (currentComponent.code.coding[0].code == '48018-6') {
              // With this code, we've reached a GeneStudied. Populate the GeneStudied attribute.
              tempCGV.component.geneStudied.push(currentComponent);
            }
            if (currentComponent.code.coding[0].code == '48002-0') {
              // With this code, we've reached a GenomicSourceClass. Populate the GenomicSourceClass attribute.
              tempCGV.component.genomicsSourceClass.push(currentComponent);
            }
          }
          tempCGV.valueCodeableConcept = this.lookup(resource, 'valueCodeableConcept.coding') as Coding[];
          tempCGV.interpretation = this.lookup(resource, 'interpretation.coding') as Coding[];
          if (this.cancerGeneticVariant) {
            this.cancerGeneticVariant.push(tempCGV);
          } else {
            this.cancerGeneticVariant = [tempCGV];
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

        if (
          resource.resourceType === 'Observation' &&
          this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-ecog-performance-status')
        ) {
          console.log("ECOG");
          this.ecogPerformaceStatus = this.lookup(resource, 'valueInteger')[0] as number; // this is probably bad type handling
        }

        if (
          resource.resourceType === 'Observation' &&
          this.resourceProfile(this.lookup(resource, 'meta.profile'), 'mcode-karnofsky-performance-status')
        ) {
          console.log("Karnofsky");
          this.karnofskyPerformanceStatus = this.lookup(resource, 'valueInteger')[0] as number; // so is this
        }

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
    if (!this.cancerGeneticVariant) {
      this.cancerGeneticVariant = [] as CancerGeneticVariant[];
    }
    if (!this.ecogPerformaceStatus) {
      this.ecogPerformaceStatus = -1;
    }
    if (!this.karnofskyPerformanceStatus) {
      this.karnofskyPerformanceStatus = -1;
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
    if (this.primaryCancerCondition.length == 0) {
      return 'NOT_SURE';
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // Cycle through each of the primary Cancer condition's codes independently due to code-dependent conditions
      for (const currentCoding of primaryCancerCondition.coding) {
        // 3. Invasive Breast Cancer and Recurrent
        if (
          (primaryCancerCondition.histologyMorphologyBehavior.some((coding) =>
            this.codeIsInSheet(coding, 'Morphology-Invasive')
          ) ||
            this.codeIsInSheet(currentCoding, 'Cancer-Invasive-Breast')) &&
          this.codeIsInSheet(currentCoding, 'Cancer-Breast') &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'recurrence')
        ) {
          return 'INVASIVE_BREAST_CANCER_AND_RECURRENT';
        }
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 4. Locally Recurrent
      if (
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'recurrence')
      ) {
        return 'LOCALLY_RECURRENT';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 1. Breast Cancer
      if (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast'))) {
        return 'BREAST_CANCER';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 2. Concomitant invasive malignancies
      if (
        primaryCancerCondition.coding.some((code) => this.codeIsNotInSheet(code, 'Cancer-Breast')) &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active') &&
        (this.TNMClinicalStageGroup.some((code) =>
          this.codeIsInSheet(code, 'Stage-1', 'Stage-2', 'Stage-3', 'Stage-4')
        ) ||
          this.TNMPathologicalStageGroup.some((code) =>
            this.codeIsInSheet(code, 'Stage-1', 'Stage-2', 'Stage-3', 'Stage-4')
          ))
      ) {
        return 'CONCOMITANT_INVASIVE_MALIGNANCIES';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      // 5. Other malignancy - except skin or cervical
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsNotInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')) ||
        (primaryCancerCondition.coding.some((code) => this.codeIsNotInSheet(code, 'Cancer-Cervical')) &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active') &&
          (this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-0')) ||
            this.TNMPathologicalStageGroup.some((coding) => this.codeIsInSheet(coding, 'Stage-0'))))
      ) {
        return 'OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  // Secondary Cancer Value
  getSecondaryCancerValue(): string {
    if (this.secondaryCancerCondition.length == 0) {
      return 'NOT_SURE';
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 2. Invasive Breast Cancer and Metastatics
      if (
        ((this.primaryCancerCondition.some((primCanCond) =>
          primCanCond.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invasive')
          )
        ) &&
          this.primaryCancerCondition.some((primCanCond) =>
            primCanCond.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast'))
          )) ||
          this.primaryCancerCondition.some((primCanCond) =>
            primCanCond.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invasive-Breast'))
          )) &&
        (secondaryCancerCondition.coding.length != 0 ||
          this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4')) ||
          this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4')))
      ) {
        return 'INVASIVE_BREAST_CANCER_AND_METASTATIC';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // 1. Brain Metastasis
      if (
        secondaryCancerCondition.coding.some((coding) => this.codeIsInSheet(coding, 'Metastasis-Brain')) &&
        secondaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')
      ) {
        return 'BRAIN_METASTASIS';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // Leptomeningeal metastatic disease
      if (
        secondaryCancerCondition.bodySite.some(
          (bdySte) => this.normalizeCodeSystem(bdySte.system) == 'SNOMED' && bdySte.code == '8935007'
        )
      ) {
        return 'LEPTOMENINGEAL_METASTATIC_DISEASE';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of this.secondaryCancerCondition) {
      // Metastatic
      if (
        secondaryCancerCondition.coding.length != 0 ||
        this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4')) ||
        this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4'))
      ) {
        return 'METASTATIC';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  // Histology Morphology Value
  getHistologyMorphologyValue(): string {
    if (
      this.primaryCancerCondition.length == 0 &&
      this.TNMClinicalStageGroup.length == 0 &&
      this.TNMPathologicalStageGroup.length == 0
    ) {
      return 'NOT_SURE';
    }
    // Invasive Mammory Carcinoma
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invas_Carc_Mix')
          )) ||
        (primaryCancerCondition.coding.some(
          (coding) => this.normalizeCodeSystem(coding.system) == 'SNOMED' && coding.code == '444604002'
        ) &&
          this.TNMClinicalStageGroup.some((code) => this.codeIsNotInSheet(code, 'Stage-0'))) ||
        this.TNMPathologicalStageGroup.some((code) => this.codeIsNotInSheet(code, 'Stage-0'))
      ) {
        return 'INVASIVE_MAMMORY_CARCINOMA';
      }
    }
    // Invasive Ductal Carcinoma
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invas_Duct_Carc')
          )) ||
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invas_Duct_Carc'))
      ) {
        return 'INVASIVE_DUCTAL_CARCINOMA';
      }
    }
    // Invasive Lobular Carcinoma
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some(
            (histMorphBehav) =>
              this.normalizeCodeSystem(histMorphBehav.system) == 'SNOMED' && histMorphBehav.code == '443757001'
          )) ||
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invas_Lob_Carc'))
      ) {
        return 'INVASIVE_LOBULAR_CARCINOMA';
      }
    }
    // Ductual Carcinoma in Situ
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
        primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
          this.codeIsInSheet(histMorphBehav, 'Morphology-Duct_Car_In_Situ')
        )
      ) {
        return 'DUCTAL_CARCINOMA_IN_SITU';
      }
    }
    // Non-Inflammatory, Invasive
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        ((primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invasive')
          )) ||
          primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invasive-Breast'))) &&
        ((primaryCancerCondition.coding.some((code) => this.codeIsNotInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((code) =>
            this.codeIsNotInSheet(code, 'Morphology-Inflammatory')
          )) ||
          primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Inflammatory')))
      ) {
        return 'NON-INFLAMMATORY_INVASIVE';
      }
    }
    // Invasive Carcinoma
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invasive-Carcinoma')
          )) ||
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invasive-Carcinoma'))
      ) {
        return 'INVASIVE_CARCINOMA';
      }
    }
    // Invasive Breast Cancer
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
            this.codeIsInSheet(histMorphBehav, 'Morphology-Invasive')
          )) ||
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invasive-Breast'))
      ) {
        return 'INVASIVE_BREAST_CANCER';
      }
    }
    // Inflammatory
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        (primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some(
            (histMorphBehav) =>
              this.normalizeCodeSystem(histMorphBehav.system) == 'SNOMED' && histMorphBehav.code == '32968003'
          )) ||
        primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Inflammatory'))
      ) {
        return 'INFLAMMATORY';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  getStageValues(): string[] {
    var stageValues:string[];
    if (
      this.primaryCancerCondition.length == 0 &&
      this.TNMClinicalStageGroup.length == 0 &&
      this.TNMPathologicalStageGroup.length == 0
    ) {
      return ['NOT_SURE', 'NOT_SURE'];
    }
    // Invasive Breast Cancer and Locally Advanced
    for (const primaryCancerCondition of this.primaryCancerCondition) {
      if (
        ((primaryCancerCondition.histologyMorphologyBehavior.some((histMorphBehav) =>
          this.codeIsInSheet(histMorphBehav, 'Morphology-Invasive')
        ) &&
          primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Breast'))) ||
          primaryCancerCondition.coding.some((code) => this.codeIsInSheet(code, 'Cancer-Invasive-Breast'))) &&
        (this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-3', 'Stage-4')) ||
          this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-3', 'Stage-4')))
      ) {
        stageValues.push('INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED');
      }
    }
    // Stage 0
    if (
      this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-0')) ||
      this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-0'))
    ) {
      // This also meets requirements for NON_INVASIVE.
      stageValues.push('ZERO');
    }
    // Stage 1
    if (
      this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-1')) ||
      this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-1'))
    ) {
      stageValues.push('ONE');
    }
    // Stage 2
    if (
      this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-2')) ||
      this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-2'))
    ) {
      stageValues.push('TWO');
    }
    // Stage 3
    if (
      this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-3')) ||
      this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-3'))
    ) {
      // This also meets requirements for LOCALLY_ADVANCED.
      stageValues.push('THREE');
    }
    // Stage 4
    if (
      this.TNMClinicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4')) ||
      this.TNMPathologicalStageGroup.some((code) => this.codeIsInSheet(code, 'Stage-4'))
    ) {
      stageValues.push('FOUR');
    }

    // Make sure the array has at least 2 values in it
    // If it does not, fill with NOT_SURE values
    if (stageValues.length < 2) {
      for (let i = stageValues.length; i <= 2; i++) {
        stageValues.push('NOT_SURE');
      }
    }
    return stageValues;
  }
  // Age (18 or younger/older)
  getAgeValue(): string {
    if (this.birthDate == 'NA' || this.birthDate == null || this.birthDate == undefined) {
      return 'NOT_SURE';
    }
    // Birthdate is in format: '1966-08-03'
    const today: Date = new Date();
    const checkDate: Date = new Date(this.birthDate);
    // Time Difference (Milliseconds)
    const millisecondsAge = today.getTime() - checkDate.getTime();
    const milliseconds18Years = 1000 * 60 * 60 * 24 * 365 * 18;
    return millisecondsAge > milliseconds18Years ? '18_OR_OVER' : 'UNDER_18';
  }
  getTumorMarkerValue(): string {
    if (this.tumorMarker.length == 0 && this.cancerGeneticVariant.length == 0) {
      return 'NOT_SURE';
    }

    // TRIPLE_NEGATIVE_AND_RB_POSITIVE
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isPRNegative(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isERNegative(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isRBPositive(tm, 50))
    ) {
      return 'TRIPLE_NEGATIVE_AND_RB_POSITIVE';
    }
    // Triple Negative
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isPRNegative(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isERNegative(tm, 1))
    ) {
      return 'TRIPLE_NEGATIVE';
    }
    // Triple Negative-10
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '1+'])) &&
      this.tumorMarker.some((tm) => this.isPRNegative(tm, 10)) &&
      this.tumorMarker.some((tm) => this.isERNegative(tm, 10))
    ) {
      return 'TRIPLE_NEGATIVE_MINUS_10';
    }
    // ER+ PR+ HER2-
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isPRPositive(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isERPositive(tm, 1))
    ) {
      return 'ER_PLUS_PR_PLUS_HER2_MINUS';
    }
    // PR+ and HER2- and FGFR amplifications
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isPRPositive(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isFGFRAmplification(tm, 1))
    ) {
      return 'PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS';
    }
    // ER+ and HER2- and FGFR amplifications
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isERPositive(tm, 1)) &&
      this.tumorMarker.some((tm) => this.isFGFRAmplification(tm, 1))
    ) {
      return 'ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS';
    }
    // PR+ and HER2-
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isPRPositive(tm, 1))
    ) {
      return 'PR_PLUS_AND_HER2_MINUS';
    }
    // ER+ and HER2-
    if (
      this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      this.tumorMarker.some((tm) => this.isERPositive(tm, 1))
    ) {
      return 'ER_PLUS_AND_HER2_MINUS';
    }
    // HER2+ and PR+
    if (
      this.tumorMarker.some((tm) => this.isHER2Positive(tm)) &&
      this.tumorMarker.some((tm) => this.isPRPositive(tm, 10))
    ) {
      return 'HER2_PLUS_AND_PR_PLUS';
    }
    // HER2+ and ER+
    if (
      this.tumorMarker.some((tm) => this.isHER2Positive(tm)) &&
      this.tumorMarker.some((tm) => this.isERPositive(tm, 10))
    ) {
      return 'HER2_PLUS_AND_ER_PLUS';
    }
    // HER2+
    if (this.tumorMarker.some((tm) => this.isHER2Positive(tm))) {
      return 'HER2_PLUS';
    }
    // PR+
    if (this.tumorMarker.some((tm) => this.isPRPositive(tm, 10))) {
      return 'PR_PLUS';
    }
    // ER+
    if (this.tumorMarker.some((tm) => this.isERPositive(tm, 10))) {
      return 'ER_PLUS';
    }
    // HER2-
    if (this.tumorMarker.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+']))) {
      return 'HER2_MINUS';
    }
    // BRCA1-Germline
    if (
      this.cancerGeneticVariant.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1100') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'LOINC' && valCodeCon.code == 'LA6683-2'
            )
          )
      )
    ) {
      return 'BRCA1-GERMLINE';
    }
    // BRCA2-Germline
    if (
      this.cancerGeneticVariant.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1101') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'LOINC' && valCodeCon.code == 'LA6683-2'
            )
          )
      )
    ) {
      return 'BRCA2-GERMLINE';
    }
    // BRCA1-somatic
    if (
      this.cancerGeneticVariant.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1100') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'LOINC' && valCodeCon.code == 'LA6684-0'
            )
          )
      )
    ) {
      return 'BRCA1-SOMATIC';
    }
    // BRCA2-somatic
    if (
      this.cancerGeneticVariant.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1101') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'LOINC' && valCodeCon.code == 'LA6684-0'
            )
          )
      )
    ) {
      return 'BRCA2-SOMATIC';
    }
    // BRCA1
    if (this.cancerGeneticVariant.some((cancGenVar) => this.isBRCA(cancGenVar, '1100'))) {
      return 'BRCA1';
    }
    // BRCA2
    if (this.cancerGeneticVariant.some((cancGenVar) => this.isBRCA(cancGenVar, '1101'))) {
      return 'BRCA2';
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  isBRCA(cancGenVar: CancerGeneticVariant, brcaCode: string): boolean {
    return (
      cancGenVar.component.geneStudied.some((geneStudied) =>
        geneStudied.valueCodeableConcept.coding.some(
          (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'HGNC' && valCodeCon.code == brcaCode
        )
      ) &&
      (cancGenVar.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'LOINC' && valCodeCon.code == 'LA9633-4') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'POS')
      ) ||
        cancGenVar.interpretation.some(
          (interp) => interp.code == 'CAR' || interp.code == 'A' || interp.code == 'POS'
        ) ||
        cancGenVar.component.geneStudied.some((geneStud) =>
          geneStud.interpretation.coding.some(
            (interp) => interp.code == 'CAR' || interp.code == 'A' || interp.code == 'POS'
          )
        ))
    );
  }
  isHER2Positive(tumorMarker: TumorMarker): boolean {
    return (
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-HER2')) &&
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'POS')
      ) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, ['3', '3+'], '=')
        ))
    );
  }
  isHER2Negative(tumorMarker: TumorMarker, quantities: string[]): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'NEG')
      ) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) || // Information on Interpretation values can be found at: http://hl7.org/fhir/R4/valueset-observation-interpretation.html
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, quantities, '=')
        )) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-HER2'))
    );
  }
  isPRPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'POS')
      ) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, [metric], '>=', '%')
        ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>='))) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-PR'))
    );
  }
  isPRNegative(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'NEG')
      ) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some(
          (valQuant) =>
            this.quantityMatch(valQuant.value, valQuant.code, [metric], '<', '%') ||
            this.quantityMatch(valQuant.value, valQuant.code, [0], '=')
        ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '<'))) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-PR'))
    );
  }
  isERPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'POS')
      ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>=')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, [metric], '>=', '%')
        )) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-ER'))
    );
  }
  isERNegative(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '260385009') ||
          (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'NEG')
      ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '<')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some(
          (valQuant) =>
            this.quantityMatch(valQuant.value, valQuant.code, [metric], '<', '%') ||
            this.quantityMatch(valQuant.value, valQuant.code, [0], '=')
        )) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-ER'))
    );
  }
  isFGFRAmplification(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004'
      ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>=')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, [metric], '>=', '%')
        )) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-FGFR'))
    );
  }
  isRBPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueQuantity.some((valQuant) =>
        this.quantityMatch(valQuant.value, valQuant.code, [metric], '>', '%')
      ) ||
        tumorMarker.valueCodeableConcept.some(
          (valCodeCon) =>
            (this.normalizeCodeSystem(valCodeCon.system) == 'SNOMED' && valCodeCon.code == '10828004') ||
            (this.normalizeCodeSystem(valCodeCon.system) == 'HL7' && valCodeCon.code == 'POS')
        ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        )) &&
      tumorMarker.code.some((code) => this.codeIsInSheet(code, 'Biomarker-RB'))
    );
  }
  quantityMatch(
    quantValue: string | number,
    quantUnit: string,
    metricValues: string[] | number[],
    metricComparator: string,
    metricUnit?: string
  ): boolean {
    if ((!quantUnit && metricUnit) || (quantUnit && !metricUnit) || quantUnit != metricUnit) {
      //console.log('incompatible units');
      return false;
    }

    if (metricComparator == '=') {
      quantValue = typeof quantValue == 'string' ? quantValue : quantValue.toString(); // we're doing string comparisons for these
      return metricValues.some((value) => quantValue == value);
    } else if (metricComparator == '>=') {
      return quantValue >= metricValues[0];
    } else if (metricComparator == '<') {
      return quantValue < metricValues[0];
    } else if (metricComparator == '>') {
      return quantValue > metricValues[0];
    } else {
      console.log('err unknown operator');
      return false;
    }
  }
  ratioMatch(numerator: Quantity, denominator: Quantity, metricValue: number, metricComparator: string): boolean {
    if (!numerator || !denominator || !numerator.value || !denominator.value) {
      //console.log('missing info for ratio comparison');
      return false;
    }
    const num: number = typeof numerator.value == 'number' ? numerator.value : Number(numerator.value);
    const den: number = typeof denominator.value == 'number' ? denominator.value : Number(denominator.value);
    const percentage = (num / den) * 100;
    if (metricComparator == '>=') {
      return percentage >= metricValue;
    } else if (metricComparator == '<') {
      return percentage < metricValue;
    } else if (metricComparator == '>') {
      return percentage > metricValue;
    } else {
      console.log('err unknown operator');
      return false;
    }
  }
  getRadiationProcedureValue(): string {
    if (this.cancerRelatedRadiationProcedure.length == 0) {
      return 'NOT_SURE';
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
    return 'RADIATION_THERAPY';
  }
  getSurgicalProcedureValue(): string {
    if (this.cancerRelatedSurgicalProcedure.length == 0) {
      return 'NOT_SURE';
    }
    if (this.cancerRelatedSurgicalProcedure.some((coding) => this.codeIsInSheet(coding, 'Treatment-Resection-Brain'))) {
      return 'RESECTION';
    } else if (
      this.cancerRelatedSurgicalProcedure.some((coding) => this.codeIsInSheet(coding, 'Treatment-Splenectomy'))
    ) {
      return 'SPLENECTOMY';
    } else if (
      this.cancerRelatedSurgicalProcedure.some(
        (coding) => this.normalizeCodeSystem(coding.system) == 'SNOMED' && coding.code == '58390007'
      )
    ) {
      return 'BONE_MARROW_TRANSPLANT';
    } else if (
      this.cancerRelatedSurgicalProcedure.some((coding) => this.codeIsInSheet(coding, 'Treatment-Organ_Transplant'))
    ) {
      return 'ORGAN_TRANSPLANT';
    } else {
      return 'NOT_SURE';
    }
  }
  getMedicationStatementValues(): string[] {
    var medicationValues:string[];

    if (this.cancerRelatedMedicationStatement.length == 0) {
      return ['NOT_SURE', 'NOT_SURE', 'NOT_SURE'];
    }
    if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Trastuzumab')) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Pertuzumab')) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-T-DM1'))
    ) {
      medicationValues.push('DRUGCOMBO_1');
    } if (
      (this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-CDK4_6_Inhibtor')
      ) ||
        this.cancerRelatedMedicationStatement.some((coding) =>
          this.codeIsInSheet(coding, 'Treatment-mTOR_Inhibitor')
        )) &&
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Endocrine_Therapy'))
    ) {
      medicationValues.push('CDK4_6_MTOR_AND_ENDOCRINE');
    } if (this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-T-DM1'))) {
      medicationValues.push('T_DM1');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-CDK4_6_Inhibtor'))
    ) {
      medicationValues.push('CDK4_6_INHIBITOR');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Pembrolizumab'))
    ) {
      medicationValues.push('PEMBROLIZUMAB');
    } if (
      this.cancerRelatedMedicationStatement.some(
        (coding) => this.normalizeCodeSystem(coding.system) == 'NIH' && coding.code == '#C1198'
      )
    ) {
      medicationValues.push('POLY_ICLC');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-mTOR_Inhibitor'))
    ) {
      medicationValues.push('MTOR_INHIBITOR');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Endocrine_Therapy'))
    ) {
      medicationValues.push('CONCURRENT_ENDOCRINE_THERAPY');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-Androgen'))
    ) {
      medicationValues.push('ANTI_ANDROGEN');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-HER2'))
    ) {
      medicationValues.push('ANTI_HER2');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-Tyrosine_Kinase_Inhib')
      )
    ) {
      medicationValues.push('TYROSINE_KINASE_INHIBITOR');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-P13K_Inhibitor'))
    ) {
      medicationValues.push('P13K_INHIBITOR');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-PD1,PDL1,PDL2'))
    ) {
      medicationValues.push('ANTI_PD');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-PARP'))
    ) {
      medicationValues.push('ANTI-PARP');
    } if (this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-SG'))) {
      medicationValues.push('SG');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) =>
        this.codeIsInSheet(coding, 'Treatment-anti-topoisomerase-1')
      )
    ) {
      medicationValues.push('ANTI-TOPOISOMERASE-1');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-CTLA4'))
    ) {
      medicationValues.push('ANTI-CTLA4');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-anti-CD40'))
    ) {
      medicationValues.push('ANTI-CD40');
    } if (
      this.cancerRelatedMedicationStatement.some((coding) => this.codeIsInSheet(coding, 'Treatment-Trastuz_and_Pertuz'))
    ) {
      medicationValues.push('TRASTUZ_AND_PERTUZ');
    } 

    // Check to make sure that the array has at least 3 values in it
    // If not, fill the remaining space with 'NOT_SURE'
    if (medicationValues.length < 3) {
      for (let i = medicationValues.length; i <= 3; i++) {
        medicationValues.push('NOT_SURE');
      }
    }
    return medicationValues;
  }

  // Get ECOG Score
  getECOGScore(): string {
    if(this.ecogPerformaceStatus == -1) {
      return 'NOT_SURE';
    }

    const ecogScoreMap = new Map<number, string>([
      [0, 'ZERO'],
      [1, 'ONE'],
      [2, 'TWO'],
      [3, 'THREE'],
      [4, 'FOUR'],
      [5, 'FIVE']
    ]);

    return ecogScoreMap.get(this.ecogPerformaceStatus);

  }

  // Get Karnofsky Score
  getKarnofskyScore(): string {
    if(this.karnofskyPerformanceStatus == -1) {
      return 'NOT_SURE';
    }

    const karnofskyScoreMap = new Map<number, string>([
      [0, 'ZERO'],
      [10, 'TEN'],
      [20, 'TWENTY'],
      [30, 'THIRTY'],
      [40, 'FORTY'],
      [50, 'FIFTY'],
      [60, 'SIXTY'],
      [70, 'SEVENTY'],
      [80, 'EIGHTY'],
      [90, 'NINETY'],
      [100, 'ONE_HUNDRED']
    ]);

    return karnofskyScoreMap.get(this.karnofskyPerformanceStatus);

  }

  // Return whether any of the codes in a given coding exist in the given profiles (sheets).
  codeIsInSheet(coding: Coding, ...sheetNames: string[]): boolean {
    const system = this.normalizeCodeSystem(coding.system);
    for (const sheetName of sheetNames) {
      const codeProfile: CodeProfile = profile_system_codes[sheetName] as CodeProfile; // Pull the codes for the profile
      if (codeProfile == undefined) {
        console.error('Code Profile ' + sheetName + ' is undefined.');
      }
      let codeSet: { code: string }[] = codeProfile[system] as { code: string }[]; // Pull the system codes from the codes
      if (!codeSet) {
        codeSet = [];
      }
      // Check that the current code matches the given code.
      for (const currentCode of codeSet) {
        if (coding.code == currentCode.code || coding.display == currentCode.code) {
          return true;
        }
      }
    }
    return false;
  }

  // Normalize the code system. NEED TO ADD MORE CODE SYSTEMS STILL.
  normalizeCodeSystem(codeSystem: string): string {
    const lowerCaseCodeSystem: string = codeSystem.toLowerCase();
    if (lowerCaseCodeSystem.includes('snomed')) {
      return 'SNOMED';
    } else if (lowerCaseCodeSystem.includes('rxnorm')) {
      return 'RxNorm';
    } else if (lowerCaseCodeSystem.includes('icd-10')) {
      return 'ICD-10';
    } else if (lowerCaseCodeSystem.includes('ajcc') || lowerCaseCodeSystem.includes('cancerstaging.org')) {
      return 'AJCC';
    } else if (lowerCaseCodeSystem.includes('loinc')) {
      return 'LOINC';
    } else if (lowerCaseCodeSystem.includes('nih')) {
      return 'NIH';
    } else if (lowerCaseCodeSystem.includes('hgnc') || lowerCaseCodeSystem.includes('genenames.org')) {
      return 'HGNC';
    } else if (lowerCaseCodeSystem.includes('hl7')) {
      return 'HL7';
    } else {
      return '';
    }
  }

  // Returns whether the given code is any code not in the given profile.
  codeIsNotInSheet(coding: Coding, profile: string): boolean {
    if (coding.code == undefined || coding.code == null) {
      return false;
    } else {
      return !this.codeIsInSheet(coding, profile);
    }
  }
}
