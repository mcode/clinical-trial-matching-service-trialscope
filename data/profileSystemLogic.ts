
// export interface profileSystemLogic {
//   PrimaryCancer: string;
//   SecondaryCancer: string;
//   HistologyMorphology: string;
//   Stage: string;
//   Age: string;
//   TumorMarker: string;
//   RadiationProcedure: string;
//   SurgicalProcedure: string;
//   MedicationStatement: string;
// }

export interface ProfileType {
  types: string[];
}

export interface CodeProfile {
  SNOMED: string[];
  RXNORM: string[];
  ICD10: string[];
  AJCC: string[];
  LOINC: string[];
}

