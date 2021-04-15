import { Coding } from './mcode';

export interface ProfileType {
  types: string[];
}
export interface ProfileSystemCodes {
  [key: string] : CodeProfile;
  'Cancer-Skin'?: CodeProfile;
  'Treatment-Pertuzumab'?: CodeProfile;
  'Treatment-SRS-Brain'?: CodeProfile;
  'Treatment-anti-PD1,PDL1, PDL2'?: CodeProfile;
  'Treatment-Trastuzumab'?: CodeProfile;
  'Cancer-Invasive_Breast'?: CodeProfile;
  'Biomarker-PR'?: CodeProfile;
  'Treatment-Pembrolizumab'?: CodeProfile;
  'Treatment-Neratinib'?: CodeProfile;
  'Treatment-anti-CTLA-4'?: CodeProfile;
  'Treatment-P13K Inhibitor'?: CodeProfile;
  'Metastasis-Brain'?: CodeProfile;
  'Treatment-anti-Androgen'?: CodeProfile;
  'Stage-3'?: CodeProfile;
  'Stage-4'?: CodeProfile;
  'Stage-1'?: CodeProfile;
  'Stage-2'?: CodeProfile;
  'Biomarker-HER2'?: CodeProfile;
  'Treatment-Mifepristone'?: CodeProfile;
  'Biomarker-PR & ER'?: CodeProfile;
  'Treatment-Nab-Paclitaxel'?: CodeProfile;
  'Stage-0'?: CodeProfile;
  'Morphology-Invasive-Carcinoma'?: CodeProfile;
  'Treatment-CDK4 6 Inhibtor'?: CodeProfile;
  'Cancer-Breast'?: CodeProfile;
  'Treatment-Tyrosine Kinase Inhib'?: CodeProfile;
  'Treatment-Endocrine Therapy'?: CodeProfile;
  'Treatment-T-DM1'?: CodeProfile;
  'Treatment-anti-HER2'?: CodeProfile;
  'Treatment-mTOR Inhibitor'?: CodeProfile;
  'Treatment-Splenectomy'?: CodeProfile;
  'Cancer-Cervical'?: CodeProfile;
  'Morphology-Invasive'?: CodeProfile;
  'Treatment-anti-FGF'?: CodeProfile;
  'Biomarker-RB'?: CodeProfile;
  'Cancer-Invasive Carcinoma'?: CodeProfile;
  'Treatment-Resection-Brain'?: CodeProfile;
  'Biomarker-ER'?: CodeProfile;
}
export interface CodeProfile {
  [key: string] : { code: string }[];
  SNOMED?: { code: string }[];
  RxNorm?: { code: string }[];
  ICD10?: { code: string }[];
  AJCC?: { code: string }[];
  LOINC?: { code: string }[];
}
export interface CodingProfile {
  coding?: Coding[];
  clinicalStatus?: Coding[];
}
