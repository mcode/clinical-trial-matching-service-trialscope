import { PrimaryCancerCondition, Quantity, Ratio, TumorMarker } from 'clinical-trial-matching-service';
import { Bundle, BundleEntry, Coding, Condition, Procedure, Resource } from 'clinical-trial-matching-service/dist/fhir-types';
import { TrialscopeMappingLogic } from "../src/trialscopemappinglogic";

describe('checkPrimaryCancerFilterLogic', () => {
  const createPrimaryCancerValues = (primaryCoding: Coding, histologyBehavior?: Coding, clinicalStatus?: Coding, tnmClinical?: Coding): string => {
    const primaryCancerBundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:4dee068c-5ffe-4977-8677-4ff9b518e763",
          resource: {
            resourceType: "Condition",
            id: "4dee068c-5ffe-4977-8677-4ff9b518e763",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-primary-cancer-condition",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
              ],
              lastUpdated: ""
            },
            clinicalStatus: {coding: [clinicalStatus]}
          } as Condition
        }
      ]
    };

    if(primaryCoding) {
      primaryCancerBundle.entry[0].resource.code = {
        coding: [
          primaryCoding
        ],
        text: "Malignant neoplasm of breast (disorder)"
      }
    }

    if(histologyBehavior){
      primaryCancerBundle.entry[0].resource.extension = [
        {
          url: "http://hl7.org/fhir/us/mcode/ValueSet/mcode-histology-morphology-behavior-vs",
          valueCodeableConcept: {
            coding: [
              histologyBehavior
            ]
          }
        }
      ]
    }

    // if(clinicalStatus) {
    //   primaryCancer.entry[0].resource.clinicalStatus = {
    //     coding: [
    //       clinicalStatus
    //     ],
    //   }
    // }

    if(tnmClinical){
      const tnmClinicalResource: BundleEntry = {resource: {
          resourceType: "Observation",
          meta: {
            profile: [
              "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group",
            ],
          },
          valueCodeableConcept: {
            coding: tnmClinical,
          },
        } as unknown as Resource;
      }
      primaryCancerBundle.entry.push(tnmClinicalResource);
    }

    const mappingLogic = new TrialscopeMappingLogic(primaryCancerBundle);
    return mappingLogic.getPrimaryCancerValues();
  }

  it('Test Breast Cancer Filter', () => {
    const clinicalStatus = ({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
    const histologyMorphologyBehavior = ({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
    expect(createPrimaryCancerValues(coding, histologyMorphologyBehavior, clinicalStatus, undefined)).toBe('BREAST_CANCER');
  });

  it('Test Concomitant invasive malignancies Filter', () => {
    const clinicalStatus = ({ system: 'N/A', code: 'active', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
    const tnmClinical = ({ system: 'AJCC', code: 'II', display: 'N/A' } as Coding); // Any code in 'Stage-2'
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, tnmClinical)).toBe('CONCOMITANT_INVASIVE_MALIGNANCIES');
  });

  it('Test Invasive Breast Cancer and Recurrent Filter', () => {
    const clinicalStatus = ({ system: 'N/A', code: 'recurrence', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({ system: 'N/Asnomed', code: '734075007', display: 'N/A' } as Coding); // Any code in 'Morphology-Invasive'
    expect(createPrimaryCancerValues(coding, histologyMorphologyBehavior, clinicalStatus, undefined)).toBe('INVASIVE_BREAST_CANCER_AND_RECURRENT');
  });

  it('Test Locally Recurrent Filter', () => {
    const clinicalStatus = ({ system: 'N/A', code: 'recurrence', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, undefined)).toBe('LOCALLY_RECURRENT');
  });

  it('Test Other malignancy - except skin or cervical  Filter', () => {
    const clinicalStatus = ({ system: 'N/A', code: 'active', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, undefined)).toBe('OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL');
  });

});

/* Secondary Cancer Condition Logic Tests */

describe('checkSecondaryCancerFilterLogic', () => {

  const createSecondaryCancerValues = (secondaryCancerCondition: Coding, clinicalStatus: Coding): string => {
    const secondaryCancerBundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:4dee068c-5ffe-4977-8677-4ff9b518e763",
          resource: {
            resourceType: "Condition",
            id: "4dee068c-5ffe-4977-8677-4ff9b518e763",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-secondary-cancer-condition",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
              ],
              lastUpdated: ""
            },
            code: {
              coding: [secondaryCancerCondition],
              text: "Malignant neoplasm of breast (disorder)"
            },
            clinicalStatus: {coding: [clinicalStatus]}
          }
        }
      ]
    };

    const mappingLogic = new TrialscopeMappingLogic(secondaryCancerBundle);
    return mappingLogic.getPrimaryCancerValues();
  }

  it('Test Brain Metastasis Filter', () => {
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code in 'Metastasis-Brain'
    const secondaryClinicalStatus = ({ system: 'N/A', code: 'active', display: 'N/A' } as Coding);
    expect(createSecondaryCancerValues(secondaryCoding, secondaryClinicalStatus)).toBe('BRAIN_METASTASIS');
  });

  it('Test Invasive Breast Cancer and Metastatic Filter', () => {
    const primaryCoding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const primaryHistologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('INVASIVE_BREAST_CANCER_AND_METASTATIC');
  });
});

describe('checkSecondaryCancerFilterLogic-LeptomeningealMetastaticDisease', () => {
  it('Test Leptomeningeal metastatic disease Filter', () => {
    const secondaryBodySite = ({ system: 'http://snomed.info/sct', code: '8935007', display: 'N/A' } as Coding);
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('LEPTOMENINGEAL_METASTATIC_DISEASE');
  });
});

describe('checkSecondaryCancerFilterLogic-Metastatic', () => {

  it('Test Metastatic Filter', () => {
    const tnmPathological = ({ system: 'snomed', code: '313046007', display: 'N/A' } as Coding); // Any code in 'Stage-4'
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('METASTATIC');
  });
});

describe('checkHistologyMorphologyFilterLogic', () => {

  const createHistologyMorphologyResource = (primaryCoding: Coding, histologyBehavior?: Coding): string => {
    const histologyMorphology: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:4dee068c-5ffe-4977-8677-4ff9b518e763",
          resource: {
            resourceType: "Condition",
            id: "4dee068c-5ffe-4977-8677-4ff9b518e763",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-primary-cancer-condition",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
              ],
              lastUpdated: ""
            }
          } as Condition
        }
      ]
    };

    if(primaryCoding) {
      histologyMorphology.entry[0].resource.code = {
        coding: [
          primaryCoding
        ],
        text: "Malignant neoplasm of breast (disorder)"
      }
    }

    if(histologyBehavior){
      histologyMorphology.entry[0].resource.extension = [
        {
          url: "http://hl7.org/fhir/us/mcode/ValueSet/mcode-histology-morphology-behavior-vs",
          valueCodeableConcept: {
            coding: [
              histologyBehavior
            ]
          }
        }
      ]
    }

    const mappingLogic = new TrialscopeMappingLogic(histologyMorphology);
    return mappingLogic.getHistologyMorphologyValue();
  }

  it('Test Invasive Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive_Carcinoma'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INVASIVE_CARCINOMA');
  });

  it('Test Invasive Breast Cancer Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '446688004', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INVASIVE_BREAST_CANCER');
  });

  it('Test Invasive Mammory Carcinoma Filter 1', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '128701002', display: 'N/A'} as Coding); // Any code in 'Morphology-Invas_Carc_Mix'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INVASIVE_MAMMORY_CARCINOMA');
  });

  it('Test Invasive Mammory Carcinoma Filter 2', () => {
  //   const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
  //   const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '128701002', display: 'N/A'} as Coding); // Any code in 'Morphology-Invas_Carc_Mix'
  //   expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INVASIVE_MAMMORY_CARCINOMA');
  //     // Invasive Mammory Carcinoma Filter Attributes
  //   pcc.coding.push({ system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' } as Coding); // SNOMED#444604002
  //   const tnmC = { system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' }; // Any Code not in 'Stage-0'

  //   extractedMCODE.primaryCancerCondition.push(pcc);
  //   extractedMCODE.TNMClinicalStageGroup.push(tnmC);

  // it('Test Invasive Mammory Carcinoma Filter', () => {
  //   expect(extractedMCODE.getHistologyMorphologyValue()).toBe('INVASIVE_MAMMORY_CARCINOMA');
  // });
  });

  it('Test Invasive Mammory Carcinoma Filter 3', () => {
  // // Invasive Mammory Carcinoma Filter Attributes
  // pcc.coding.push({ system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' } as Coding); // SNOMED#444604002
  // const tnmP = { system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' }; // Any Code not in 'Stage-0'

  // extractedMCODE.primaryCancerCondition.push(pcc);
  // extractedMCODE.TNMPathologicalStageGroup.push(tnmP);

  // it('Test Invasive Mammory Carcinoma Filter', () => {
  //   expect(extractedMCODE.getHistologyMorphologyValue()).toBe('INVASIVE_MAMMORY_CARCINOMA');
  // });
  });

  it('Test Invasive Invasive Ductal Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '444134008', display: 'N/A'} as Coding); // Any code in 'Morphology-Invas_Duct_Carc'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INVASIVE_DUCTAL_CARCINOMA');
  });

  it('Test Invasive Lobular Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '1080261000119100', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invas Lob Carc'
    expect(createHistologyMorphologyResource(coding, undefined)).toBe('INVASIVE_LOBULAR_CARCINOMA');
  });

  it('Test Ductal Carcinoma In Situ Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '18680006', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '444134008', display: 'N/A'} as Coding); // Any code in 'Morphology-Duct_Car_In_Situ'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('DUCTAL_CARCINOMA_IN_SITU');
  });

  it('Test Non-Inflammatory Invasive Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '254840009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invasive-Breast' AND 'Cancer-Inflammatory'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('NON-INFLAMMATORY_INVASIVE');
  });

  it('Test Inflammatory Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '32968003', display: 'N/A'} as Coding); // Code: SNOMED 32968003'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior)).toBe('INFLAMMATORY');
  });

});

/* Stage Logic Tests */

describe('checkStageFilterLogic', () => {

  function createTnmPathologicalBundle(...coding: Coding[]): string[] {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          resource: {
            resourceType: "Observation",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group",
              ],
            },
            valueCodeableConcept: {
              coding: coding,
            },
          } as unknown as Resource,
        }
      ]
    };
    const mappingLogic = new TrialscopeMappingLogic(bundle);
    return mappingLogic.getStageValues();
  }

  it('Test Invasive Breast Cancer and Locally Advanced Filter', () => {
    // Invasive Breast Cancer and Locally Advanced Filter Attributes
    // pcc.clinicalStatus.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
    // pcc.coding.push({ system: 'http://snomed.info/sct', code: '722524005', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invasive-Breast'
    // pcc.histologyMorphologyBehavior.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
    // tnmPathological.push({ system: 'snomed', code: '261640009', display: 'N/A' } as Coding); // Any code in 'Stage-3'

    // extractedMCODE.primaryCancerCondition.push(pcc);
    // extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

    // const stages: string[] = extractedMCODE.getStageValues();
    // expect(stages[0]).toBe('INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED');
    // expect(stages[1]).toBe('THREE');
  });

  it('Test Stage 0 Filter', () => {
    const stages = createTnmPathologicalBundle({ system: 'snomed', code: '261645004', display: 'N/A' } as Coding); // Any code in 'Stage-0'
    expect(stages[0]).toBe('ZERO');
    expect(stages[1]).toBe('NOT_SURE');
  });

  it('Test Stage 1 Filter', () => {
    const stages = createTnmPathologicalBundle({ system: 'snomed', code: '313112008', display: 'N/A' } as Coding); // Any code in 'Stage-1'
    expect(stages[0]).toBe('ONE');
    expect(stages[1]).toBe('NOT_SURE');
  });

  it('Test Stage 2 Filter', () => {
    const stages = createTnmPathologicalBundle({ system: 'snomed', code: 'Stage 2B (qualifier value)', display: 'N/A' } as Coding); // Any code in 'Stage-2'
    expect(stages[0]).toBe('TWO');
    expect(stages[1]).toBe('NOT_SURE');
  });

  it('Test Stage 3 Filter', () => {
    const stages = createTnmPathologicalBundle({ system: 'snomed', code: '261640009', display: 'N/A' } as Coding); // Any code in 'Stage-3'
    expect(stages[0]).toBe('THREE');
    expect(stages[1]).toBe('NOT_SURE');
  });

  it('Test Stage 4 Filter', () => {
    const stages = createTnmPathologicalBundle({ system: 'snomed', code: '261643006', display: 'N/A' } as Coding); // Any code in 'Stage-4'
    expect(stages[0]).toBe('FOUR');
    expect(stages[1]).toBe('NOT_SURE');
  });
});

describe('checkRadiationProcedureFilterLogic', () => {

  const createRadiationBundle = (coding: Coding, bodySite: Coding): string => {
    const radiationBundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:92df8252-84bd-4cbe-b1dc-f80a9f28d1cc",
          resource: {
            resourceType: "Procedure",
            id: "92df8252-84bd-4cbe-b1dc-f80a9f28d1cc",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-radiation-procedure",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure"
              ],
              lastUpdated: ""
            },
            code: {
              coding: [coding],
            },
            bodySite: [
              {
                coding: [bodySite]
              }
            ],
            reasonReference: [
              {
                "reference": "4dee068c-5ffe-4977-8677-4ff9b518e763",
                "display": "Malignant neoplasm of breast (disorder)"
              }
            ]
          } as Procedure
        }
      ]
    };
    const mappingLogic = new TrialscopeMappingLogic(radiationBundle);
    return mappingLogic.getRadiationProcedureValues();
  };

  it('Test SRS Filter', () => {
    const radiationValue = createRadiationBundle({ system: 'http://snomed.info/sct', code: '473237008', display: 'N/A' } as Coding, undefined); // Any code in 'Treatment-SRS-Brain'
    expect(radiationValue).toBe('SRS');
  });

  it('Test WBRT Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '108290001', display: 'N/A' } as Coding);
    const bodySite = ({ system: 'http://snomed.info/sct', code: '12738006', display: 'N/A' } as Coding);
    const radiationValue = createRadiationBundle(coding, bodySite);
    expect(radiationValue).toBe('WBRT');
  });

  it('Test Radiation Therapy Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '108290001', display: 'N/A' } as Coding); // Any code.
    const radiationValue = createRadiationBundle(coding, undefined);
    expect(radiationValue).toBe('RADIATION_THERAPY');
  });

});

describe('checkSurgicalProcedureFilterLogic', () => {

  const createSurgicalBundle = (coding: Coding): string => {
    const surgicalBundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:6a401855-9277-4b01-ac59-48ac734eece6",
          resource: {
            resourceType: "Procedure",
            id: "6a401855-9277-4b01-ac59-48ac734eece6xxx",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-surgical-procedure",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure"
              ],
              lastUpdated: ""
            },
            code: {coding: [coding],},
            reasonReference: [
              {
                reference: "4dee068c-5ffe-4977-8677-4ff9b518e763x",
                display: "Secondary Cancer Condition Reference - for tests."
              }
            ]
         } as Procedure
      }
    ]
    };
    const mappingLogic = new TrialscopeMappingLogic(surgicalBundle);
    return mappingLogic.getSurgicalProcedureValues();
  };

  it('Test Resection Filter', () => {
    const surgicalValue = createSurgicalBundle({ system: 'http://snomed.info/sct', code: '446103006', display: 'N/A' } as Coding); // Any code in 'Treatment-Resection-Brain'
    expect(surgicalValue).toBe('RESECTION');
  });

  it('Test Splenectomy Filter', () => {
    const surgicalValue = createSurgicalBundle({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code in 'Treatment-Splenectomy'
    expect(surgicalValue).toBe('SPLENECTOMY');
  });

  it('Test Bone Marrow Transplant Filter', () => {
    const surgicalValue = createSurgicalBundle({ system: 'http://snomed.info/sct', code: '58390007', display: 'N/A' } as Coding); // One specific Code for Bone Marrow Transplant
    expect(surgicalValue).toBe('BONE_MARROW_TRANSPLANT');
  });

  it('Test Organ Transplant Filter', () => {
    const surgicalValue = createSurgicalBundle({ system: 'http://snomed.info/sct', code: '58390007', display: 'N/A' } as Coding); // Any code in 'Treatment-Organ_Transplant'
    expect(surgicalValue).toBe('ORGAN_TRANSPLANT');
  });
});

/* Medication Statement Logic Tests */

describe('Medication Logic Tests', () => {

  const getMedicationStatementValues = (...coding: Coding[]): string[] => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          resource: {
            resourceType: "MedicationStatement",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-medication-statement",
              ],
            },
            medicationCodeableConcept: {
              coding: coding,
            },
          } as unknown as Resource,
        }
      ]
    };
    const mappingLogic = new TrialscopeMappingLogic(bundle);
    return mappingLogic.getMedicationStatementValues();
  }

  it('Test T-DM1 Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A' } as Coding; // Any code in 'Treatment-T-DM1'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('T_DM1');
    expect(medications[1]).toBe('ANTI_HER2');
    expect(medications[2]).toBe('TRASTUZ_AND_PERTUZ');
  });

  it('Test CDK4/6 inhibitor Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A' } as Coding; // Any code in 'Treatment-CDK4_6_Inhibtor'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('CDK4_6_INHIBITOR');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Poly ICLC Filter', () => {
    const code = { system: 'NIH', code: '#C1198', display: 'N/A' } as Coding;
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('POLY_ICLC');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test DrugCombo-1 Filter', () => {
    const codes = [{ system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A' } as Coding]; // Any code in 'Treatment-Trastuzamab'  and 'Treatment-T-DM1'
    codes.push({ system: 'http://rxnorm.info/sct', code: '1298949', display: 'N/A' } as Coding); // Any code in 'Treatment-Pertuzumab'
    const medications = getMedicationStatementValues(...codes);
    expect(medications[0]).toBe('DRUGCOMBO_1');
    expect(medications[1]).toBe('T_DM1');
    expect(medications[2]).toBe('ANTI_HER2');
  });

  it('Test Pembrolizumab Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1547545', display: 'N/A' } as Coding; // Any code in 'Treatment-Pembrolizumab'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('PEMBROLIZUMAB');
    expect(medications[1]).toBe('ANTI_PD');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test mTOR inhibitor Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '845509', display: 'N/A' } as Coding; // Any code in 'Treatment-mTOR_Inhibtor'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('MTOR_INHIBITOR');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Concurrent Endocrine Therapy  Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A' } as Coding; // Any code in 'Treatment-Endocrine_Therapy'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('CONCURRENT_ENDOCRINE_THERAPY');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Anti-androgen Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '151495', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-Androgen'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI_ANDROGEN');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test anti-HER2 Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '101306', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-HER2'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI_HER2');
    expect(medications[1]).toBe('TRASTUZ_AND_PERTUZ');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Tyrosine Kinase Inhibitor Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1430449', display: 'N/A' } as Coding; // Any code in 'Treatment-Tyrosine_Kinase_Inhib'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('TYROSINE_KINASE_INHIBITOR');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test P13K inhibitor  Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '2169302', display: 'N/A' } as Coding; // Any code in 'Treatment-P13K_Inhibitor'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('P13K_INHIBITOR');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test anti-PD Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1792780', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-PD1,PDL1,PDL2'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI_PD');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test CDK4/6-mTOR and Endocrine Filter', () => {
    const codes = [{ system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A' } as Coding]; // Any code in 'Treatment-CDK4_6_Inhibtor'
    codes.push({ system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A' } as Coding); // Any code in 'Treatment-Endocrine_Therapy'
    const medications = getMedicationStatementValues(...codes);
    expect(medications[0]).toBe('CDK4_6_MTOR_AND_ENDOCRINE');
    expect(medications[1]).toBe('CDK4_6_INHIBITOR');
    expect(medications[2]).toBe('CONCURRENT_ENDOCRINE_THERAPY');
  });

  it('Test anti PARP Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1918231', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-PARP'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI_PARP');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test SG Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '2360231', display: 'N/A' } as Coding; // Any code in 'Treatment-SG'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('SG');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Treatment-anti-topoisomerase-1 Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1719773', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-topoisomerase-1'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI-TOPOISOMERASE-1');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Treatment-anti-CTLA4 Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '1657013', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-CTLA4'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI-CTLA4');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Treatment-anti-CD40 Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '226754', display: 'N/A' } as Coding; // Any code in 'Treatment-anti-CD40'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('ANTI-CD40');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

  it('Test Treatment-Trastuz-And-Pertuz Filter', () => {
    const code = { system: 'http://rxnorm.info/sct', code: '2382609', display: 'N/A' } as Coding; // Any code in 'Treatment-Trastuz_and_Pertuz'
    const medications = getMedicationStatementValues(code);
    expect(medications[0]).toBe('TRASTUZ_AND_PERTUZ');
    expect(medications[1]).toBe('NOT_SURE');
    expect(medications[2]).toBe('NOT_SURE');
  });

});

/* Tumor Marker Logic Tests */

describe('checkTumorMarkerFilterLogic-HER2+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm: TumorMarker = {};
  tm.code = [] as Coding[];
  tm.interpretation = [] as Coding[];
  tm.valueCodeableConcept = [] as Coding[];
  tm.valueQuantity = [] as Quantity[];
  tm.valueRatio = [] as Ratio[];

  // HER2+ Filter Attributes
  tm.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm.valueQuantity.push({ value: '3+', comparator: '=' } as Quantity);

  extractedTumorMarker.push(tm);

  it('Test HER2+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and ER+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];

  // HER2+ Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
  // ER+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm2.valueQuantity.push({ value: '11', comparator: '>=', unit: '%', code: '%' } as Quantity);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);

  it('Test HER2+ and ER+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS_AND_ER_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and PR+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  extractedTumorMarker = [] as TumorMarker[];
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];

  // HER2+ Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'POS',
    display: 'N/A'
  } as Coding);
  // PR+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueRatio.push({
    numerator: { value: '30', comparator: '>=', unit: '%', code: '%' } as Quantity,
    denominator: { value: '2', comparator: '>=', unit: '%', code: '%' } as Quantity
  } as Ratio);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);

  it('Test HER2+ and PR+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS_AND_PR_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '2+', comparator: '=' } as Quantity);
  // ER+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm2.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'DET',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_AND_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'NEG',
    display: 'N/A'
  } as Coding);
  // PR+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'H',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);

  it('Test PR+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('PR_PLUS_AND_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER2- and FGFR amplifications', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'NEG',
    display: 'N/A'
  } as Coding);
  // ER+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm2.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
  // FGFR Amplifications Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A' } as Coding); // Any code in 'Biomarker-FGFR'
  tm3.valueQuantity.push({ value: '1', comparator: '>=', unit: '%', code: '%' } as Quantity);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER- and FGFR Amplifications', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
  // PR+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
  // FGFR Amplifications Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A' } as Coding); // Any code in 'Biomarker-FGFR'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'POS',
    display: 'N/A'
  } as Quantity);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);

  it('Test PR+ and HER- and FGFR Amplifications Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and PR+ and HER2-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
  // PR+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueRatio.push({
    numerator: { value: '100', comparator: '>=', unit: '%', code: '%' } as Quantity,
    denominator: { value: '3', comparator: '>=', unit: '%', code: '%' } as Quantity
  } as Ratio);
  // ER+ Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'H',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);

  it('Test ER+ and PR+ and HER2- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_PR_PLUS_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '2+', comparator: '=' } as Quantity);
  // PR- Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueRatio.push({
    numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
    denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as Quantity
  } as Ratio);
  // ER- Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'N',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);

  it('Test Triple negative Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative-10', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '1', comparator: '=' } as Quantity);
  // PR- Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueQuantity.push({ value: '9', comparator: '<', unit: '%', code: '%' } as Quantity);
  // ER- Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'N',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);

  it('Test Triple negative-10 Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE_MINUS_10');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative and RB Positive', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];
  const tm3: TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as Quantity[];
  tm3.valueRatio = [] as Ratio[];
  const tm4: TumorMarker = {};
  tm4.code = [] as Coding[];
  tm4.interpretation = [] as Coding[];
  tm4.valueCodeableConcept = [] as Coding[];
  tm4.valueQuantity = [] as Quantity[];
  tm4.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '1', comparator: '=' } as Quantity);
  // PR- Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'ND',
    display: 'N/A'
  } as Coding);
  // ER- Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'N',
    display: 'N/A'
  } as Coding);
  // RB+ Attributes
  tm4.code.push({ system: 'http://loinc.info/sct', code: '42795-5', display: 'N/A' } as Coding); // Any code in 'Biomarker-RB'
  tm4.valueQuantity.push({ value: '51', comparator: '>', unit: '%', code: '%' } as Quantity);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);
  extractedTumorMarker.push(tm3);
  extractedTumorMarker.push(tm4);

  it('Test Triple negative and RB Positive Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE_AND_RB_POSITIVE');
  });
});

describe('Ratio and Quantity Error Tests', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];

  // Invalid Operator
  tm1.valueQuantity.push({ value: '51', comparator: '!=', unit: '%', code: '%' } as Quantity);
  // Invalid Operator
  tm1.valueRatio.push({
    numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
    denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as Quantity
  } as Ratio);

  it('Test Quantity Error', () => {
    expect(extractedQuantityMatch(3, '%', [10], '<')).toBe(false);
  });

  it('Test Ratio Error', () => {
    expect(
      extractedRatioMatch(
        { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
        { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
        10,
        '<'
      )
    ).toBe(false);
  });
});

// Advanced Matches update new Tumor Marker Tests

describe('checkTumorMarkerFilterLogic-BRCA1-Germline', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };
  const cgvGenomicSourceClass: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA1-Germline Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1100', display: 'BRCA1' });
  cgv.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' });
  cgv.valueCodeableConcept.push({ system: 'http://loinc.info/sct', code: 'LA9633-4', display: 'N/A' });
  cgv.interpretation.push({ system: 'N/A', code: 'CAR', display: 'CAR' });
  cgvGeneStudied.interpretation.coding.push({ system: 'N/A', code: 'CAR', display: 'CAR' });
  cgvGenomicSourceClass.valueCodeableConcept.coding.push({
    system: ' http://loinc.info/sct',
    code: 'LA6683-2',
    display: 'N/A'
  });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgvComponent.genomicsSourceClass.push(cgvGenomicSourceClass);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA1-Germline Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA1-GERMLINE');
  });
});

describe('checkTumorMarkerFilterLogic-BRCA2-Germline', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };
  const cgvGenomicSourceClass: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA2-Germline Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1101', display: 'BRCA2' });
  cgv.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' });
  cgvGenomicSourceClass.valueCodeableConcept.coding.push({
    system: ' http://loinc.info/sct',
    code: 'LA6683-2',
    display: 'N/A'
  });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgvComponent.genomicsSourceClass.push(cgvGenomicSourceClass);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA2-Germline Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA2-GERMLINE');
  });
});

describe('checkTumorMarkerFilterLogic-BRCA1-Somatic', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };
  const cgvGenomicSourceClass: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA1-Somatic Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1100', display: 'BRCA1' });
  cgv.valueCodeableConcept.push({ system: 'http://loinc.info/sct', code: 'LA9633-4', display: 'N/A' });
  cgvGenomicSourceClass.valueCodeableConcept.coding.push({
    system: ' http://loinc.info/sct',
    code: 'LA6684-0',
    display: 'N/A'
  });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgvComponent.genomicsSourceClass.push(cgvGenomicSourceClass);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA1-Somatic Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA1-SOMATIC');
  });
});

describe('checkTumorMarkerFilterLogic-BRCA2-Somatic', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };
  const cgvGenomicSourceClass: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA2-Somatic Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1101', display: 'BRCA2' });
  cgv.interpretation.push({ system: 'N/A', code: 'CAR', display: 'CAR' });
  cgvGenomicSourceClass.valueCodeableConcept.coding.push({
    system: ' http://loinc.info/sct',
    code: 'LA6684-0',
    display: 'N/A'
  });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgvComponent.genomicsSourceClass.push(cgvGenomicSourceClass);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA2-Somatic Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA2-SOMATIC');
  });
});

describe('checkTumorMarkerFilterLogic-BRCA1', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA1 Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1100', display: 'BRCA1' });
  cgvGeneStudied.interpretation.coding.push({ system: 'N/A', code: 'A', display: 'AWW' });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA1 Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA1');
  });
});

describe('checkTumorMarkerFilterLogic-BRCA2', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };
  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  // BRCA2 Filter Attributes
  cgvGeneStudied.valueCodeableConcept.coding.push({ system: 'hgnc', code: '1101', display: 'BRCA2' });
  cgv.interpretation.push({ system: 'N/A', code: 'POS', display: 'POS' });

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgv.component = cgvComponent;
  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test BRCA2 Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('BRCA2');
  });
});

// empty geneStudied component and empty genomicSourceClass component
describe('checkTumorMarkerFilterLogic-empty-components-added', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const cgv: mcode.CancerGeneticVariant = {
    valueCodeableConcept: [] as Coding[],
    interpretation: [] as Coding[],
    component: {} as mcode.CancerGeneticVariantComponent
  };
  const cgvComponent: mcode.CancerGeneticVariantComponent = {
    geneStudied: [] as mcode.CancerGeneticVariantComponentType[],
    genomicsSourceClass: [] as mcode.CancerGeneticVariantComponentType[]
  };

  const cgvGenomicSourceClass: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  const cgvGeneStudied: mcode.CancerGeneticVariantComponentType = {
    valueCodeableConcept: { coding: [] as Coding[] },
    interpretation: { coding: [] as Coding[] }
  };

  cgvComponent.geneStudied.push(cgvGeneStudied);
  cgvComponent.genomicsSourceClass.push(cgvGenomicSourceClass);
  cgv.component = cgvComponent;

  extractedMCODE.cancerGeneticVariant.push(cgv);

  it('Test Tumor Filter Empty Components Added', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('NOT_SURE');
  });
});

describe('checkTumorMarkerFilterLogic-PR+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];
  const tm2: TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as Quantity[];
  tm2.valueRatio = [] as Ratio[];

  // PR+ Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm1.valueRatio.push({
    numerator: { value: '100', comparator: '>=', unit: '%', code: '%' } as Quantity,
    denominator: { value: '3', comparator: '>=', unit: '%', code: '%' } as Quantity
  } as Ratio);

  extractedTumorMarker.push(tm1);
  extractedTumorMarker.push(tm2);

  it('Test PR+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('PR_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];

  // ER+ Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm1.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'H',
    display: 'N/A'
  } as Coding);

  extractedTumorMarker.push(tm1);

  it('Test ER+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS');
  });
});

describe('checkTumorMarkerFilterLogicHER-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  const tm1: TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as Quantity[];
  tm1.valueRatio = [] as Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '2+', comparator: '=' } as Quantity);

  extractedTumorMarker.push(tm1);

  it('Test HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_MINUS');
  });
});

// ECOG Test
describe('checkECOGFilterLogic', () => {
  //Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  extractedMCODE.ecogPerformaceStatus = 3;

  it('Test ECOG Filter', () => {
    expect(extractedMCODE.getECOGScore()).toBe('THREE');
  });
});

// Karnofsky Test
describe('checkKarnofskyFilterLogic', () => {
  //Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
  extractedMCODE.karnofskyPerformanceStatus = 90;

  it('Test Karnofsky Filter', () => {
    expect(extractedMCODE.getKarnofskyScore()).toBe('NINETY');
  });
});

describe('checkAgeFilterLogic', () => {
  // Initialize
  const createBirthdateBundle = (birthdate: string): Bundle => {
    const birthdateResource: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          fullUrl: "urn:uuid:1e208b6b-77f1-4808-a32b-9f9caf1ec334",
          resource: {
            resourceType: "Patient",
            id: "1e208b6b-77f1-4808-a32b-9f9caf1ec334",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-patient",
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
              ],
              lastUpdated: ""
            },
            gender: "female",
            birthDate: birthdate
            }
          }
        ]
      };
      return birthdateResource;
    };

  it('Test Age is over 18 Filter', () => {
    const patientBundle = createBirthdateBundle('2000-06-11');
    const mappingLogic = new TrialscopeMappingLogic(patientBundle);
    expect(mappingLogic.getAgeValue()).toBe('18_OR_OVER');
  });

  it('Test Age is under 18 Filter', () => {
    const patientBundle = createBirthdateBundle('2020-06-11');
    const mappingLogic = new TrialscopeMappingLogic(patientBundle);
    expect(mappingLogic.getAgeValue()).toBe('UNDER_18');
  });
});

describe('NotSureTests', () => {
  // Initialize
  const emptyPatientBundle = null;
  const extractedMCODE = new TrialscopeMappingLogic(emptyPatientBundle);

  it('Test NOT_SURE returns for null inputs', () => {
    expect(extractedMCODE.getPrimaryCancerValues()).toBe('NOT_SURE');
    expect(extractedMCODE.getSecondaryCancerValues()).toBe('NOT_SURE');
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getMedicationStatementValues()).toEqual(['NOT_SURE', 'NOT_SURE', 'NOT_SURE']);
    expect(extractedMCODE.getRadiationProcedureValues()).toBe('NOT_SURE');
    expect(extractedMCODE.getSurgicalProcedureValues()).toBe('NOT_SURE');
    expect(extractedMCODE.getStageValues()).toEqual(['NOT_SURE', 'NOT_SURE']);
    expect(extractedMCODE.getTumorMarkerValues()).toBe('NOT_SURE');
    expect(extractedMCODE.getAgeValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getECOGScore()).toBe('NOT_SURE');
    expect(extractedMCODE.getKarnofskyScore()).toBe('NOT_SURE');
  });
});
