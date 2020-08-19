import { Coding } from '../src/mcode';

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
export interface CodingProfile {
  coding?: Coding[];
  clinicalStatus?: Coding[];
}
