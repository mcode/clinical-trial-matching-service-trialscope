import { Quantity, Ratio } from 'clinical-trial-matching-service';
import { Bundle, BundleEntry, Coding, Condition, Observation, Procedure, Resource } from 'clinical-trial-matching-service/dist/fhir-types';
import { TrialscopeMappingLogic } from "../src/trialscopemappinglogic";

const createPrimaryCancerResource = (primaryCoding: Coding, histologyBehavior: Coding, clinicalStatus: Coding, tnmClinical: Coding, tnmPathological: Coding): Bundle => {
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
          }
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

  if(clinicalStatus) {
    (primaryCancerBundle.entry[0].resource as Condition).clinicalStatus = {
      coding: [
        clinicalStatus
      ],
    }
  }

  if(tnmClinical){
    const tnmClinicalResource: BundleEntry = {
      resource: {
        resourceType: "Observation",
        meta: {
          profile: [
            "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-stage-group",
          ],
        },
        valueCodeableConcept: {
          coding: tnmClinical,
        },
      } as unknown as Resource
    };
    primaryCancerBundle.entry.push(tnmClinicalResource);
  }

  if(tnmPathological){
    const tnmPathologicalResource: BundleEntry = {
      resource: {
        resourceType: "Observation",
        meta: {
          profile: [
            "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group",
          ],
        },
        valueCodeableConcept: {
          coding: tnmPathological,
        },
      } as unknown as Resource
    };
    primaryCancerBundle.entry.push(tnmPathologicalResource);
  }

  return primaryCancerBundle;
}

describe('checkPrimaryCancerFilterLogic', () => {

  const createPrimaryCancerValues = (primaryCoding: Coding, histologyBehavior: Coding, clinicalStatus: Coding, tnmClinical: Coding, tnmPathological: Coding): string => {
    const mappingLogic = new TrialscopeMappingLogic(createPrimaryCancerResource(primaryCoding, histologyBehavior, clinicalStatus, tnmClinical, tnmPathological));
    return mappingLogic.getPrimaryCancerValues();
  }

  it('Test Breast Cancer Filter', () => {
    const clinicalStatus = ({ system: 'snomed', code: 'N/A', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
    const histologyMorphologyBehavior = ({ system: 'snomed', code: 'N/A', display: 'N/A' } as Coding);
    expect(createPrimaryCancerValues(coding, histologyMorphologyBehavior, clinicalStatus, undefined, undefined)).toBe('BREAST_CANCER');
  });

  it('Test Concomitant invasive malignancies Filter', () => {
    const clinicalStatus = ({ system: 'snomed', code: 'active', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
    const tnmClinical = ({ system: 'AJCC', code: 'II', display: 'N/A' } as Coding); // Any code in 'Stage-2'
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, tnmClinical, undefined)).toBe('CONCOMITANT_INVASIVE_MALIGNANCIES');
  });

  it('Test Invasive Breast Cancer and Recurrent Filter', () => {
    const clinicalStatus = ({ system: 'snomed', code: 'recurrence', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '78354100ƒ√ƒ9', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({ system: 'N/Asnomed', code: '734075007', display: 'N/A' } as Coding); // Any code in 'Morphology-Invasive'
    expect(createPrimaryCancerValues(coding, histologyMorphologyBehavior, clinicalStatus, undefined, undefined)).toBe('INVASIVE_BREAST_CANCER_AND_RECURRENT');
  });

  it('Test Locally Recurrent Filter', () => {
    const clinicalStatus = ({ system: 'snomed', code: 'recurrence', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, undefined, undefined)).toBe('LOCALLY_RECURRENT');
  });

  it('Test Other malignancy - except skin or cervical  Filter', () => {
    const clinicalStatus = ({ system: 'snomed', code: 'active', display: 'N/A' } as Coding);
    const coding = ({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
    expect(createPrimaryCancerValues(coding, undefined, clinicalStatus, undefined, undefined)).toBe('OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL');
  });

});

/* Secondary Cancer Condition Logic Tests */

describe('checkSecondaryCancerFilterLogic', () => {

  const createSecondaryCancerValues = (secondaryCancerCondition: Coding, secondaryClinicalStatus: Coding, primaryCoding: Coding, primaryHistology: Coding, secondaryBodySite: Coding, tnmPathological: Coding): string => {
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
            bodySite: {coding: []},
            clinicalStatus: {coding: []}
          } as Condition
        }
      ]
    };

    if(secondaryCancerCondition) {
      (secondaryCancerBundle.entry[0].resource as Condition).code = {
        coding: [secondaryCancerCondition],
        text: "Malignant neoplasm of breast (disorder)"
      }
    }

    if(secondaryClinicalStatus) {
      (secondaryCancerBundle.entry[0].resource as Condition).clinicalStatus = {
        coding: [secondaryClinicalStatus]
      }
    }

    if(secondaryBodySite) {
      (secondaryCancerBundle.entry[0].resource as Condition).bodySite = {
        coding: [secondaryBodySite]
      }
    }

    if(primaryCoding || primaryHistology) {
      const primaryCancerResource: BundleEntry = {
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
          };

          if(primaryCoding) {
            primaryCancerResource.resource.code = {
              coding: [
                primaryCoding
              ],
              text: "Malignant neoplasm of breast (disorder)"
            };
          }

          if(primaryHistology){
            primaryCancerResource.resource.extension = [
              {
                url: "http://hl7.org/fhir/us/mcode/ValueSet/mcode-histology-morphology-behavior-vs",
                valueCodeableConcept: {
                  coding: [
                    primaryHistology
                  ]
                }
              }
            ];
          }
          secondaryCancerBundle.entry.push(primaryCancerResource);
      }

      if(tnmPathological) {
        const tnmResource: BundleEntry = {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group",
                ],
              },
              valueCodeableConcept: {
                coding: tnmPathological,
              },
            } as unknown as Resource,
          };

          secondaryCancerBundle.entry.push(tnmResource);
        }

    const mappingLogic = new TrialscopeMappingLogic(secondaryCancerBundle);
    return mappingLogic.getSecondaryCancerValues();
  }

  it('Test Brain Metastasis Filter', () => {
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code in 'Metastasis-Brain'
    const secondaryClinicalStatus = ({ system: 'snomed', code: 'active', display: 'N/A' } as Coding);
    expect(createSecondaryCancerValues(secondaryCoding, secondaryClinicalStatus, undefined, undefined, undefined, undefined)).toBe('BRAIN_METASTASIS');
  });

  it('Test Invasive Breast Cancer and Metastatic Filter', () => {
    const primaryCoding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const primaryHistologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code
    expect(createSecondaryCancerValues(secondaryCoding, undefined, primaryCoding, primaryHistologyMorphologyBehavior, undefined, undefined)).toBe('INVASIVE_BREAST_CANCER_AND_METASTATIC');
  });

  it('Test Leptomeningeal metastatic disease Filter', () => {
    const secondaryBodySite = ({ system: 'http://snomed.info/sct', code: '8935007', display: 'N/A' } as Coding);
    expect(createSecondaryCancerValues(undefined, undefined, undefined, undefined, secondaryBodySite, undefined)).toBe('LEPTOMENINGEAL_METASTATIC_DISEASE');
  });

  it('Test Metastatic Filter', () => {
    const tnmPathological = ({ system: 'snomed', code: '313046007', display: 'N/A' } as Coding); // Any code in 'Stage-4'
    const secondaryCoding = ({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code
    expect(createSecondaryCancerValues(secondaryCoding, undefined, undefined, undefined, undefined, tnmPathological)).toBe('METASTATIC');
  });
});

describe('checkHistologyMorphologyFilterLogic', () => {

  const createHistologyMorphologyResource = (primaryCoding: Coding, histologyBehavior: Coding, tnmClinicalStage: Coding, tnmPathologicalStage: Coding): string => {
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

    if(tnmPathologicalStage){
      const tnmPathologicalResource: BundleEntry = {
        resource: {
          resourceType: "Observation",
          meta: {
            profile: [
              "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group",
            ],
          },
          valueCodeableConcept: {
            coding: tnmPathologicalStage,
          },
        } as unknown as Resource
      };
      histologyMorphology.entry.push(tnmPathologicalResource);
    }

    if(tnmClinicalStage){
      const tnmClinicalResource: BundleEntry = {
        resource: {
          resourceType: "Observation",
          meta: {
            profile: [
              "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-stage-group",
            ],
          },
          valueCodeableConcept: {
            coding: tnmClinicalStage,
          },
        } as unknown as Resource
      };
      histologyMorphology.entry.push(tnmClinicalResource);
    }

    const mappingLogic = new TrialscopeMappingLogic(histologyMorphology);
    return mappingLogic.getHistologyMorphologyValue();
  }

  it('Test Invasive Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive_Carcinoma'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('INVASIVE_CARCINOMA');
  });

  it('Test Invasive Breast Cancer Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '446688004', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('INVASIVE_BREAST_CANCER');
  });

  it('Test Invasive Mammory Carcinoma Filter 1', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '128701002', display: 'N/A'} as Coding); // Any code in 'Morphology-Invas_Carc_Mix'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('INVASIVE_MAMMORY_CARCINOMA');
  });

  it('Test Invasive Mammory Carcinoma Filter 2', () => {
    const primaryCoding = ({ system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' } as Coding); // SNOMED#444604002
    const tnmClinicalStage = { system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' }; // Any Code not in 'Stage-0'
    expect(createHistologyMorphologyResource(primaryCoding, undefined, tnmClinicalStage, undefined)).toBe('INVASIVE_MAMMORY_CARCINOMA');
  });

  it('Test Invasive Mammory Carcinoma Filter 3', () => {
    const primaryCoding = ({ system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' } as Coding); // SNOMED#444604002
    const tnmPathological = { system: 'http://snomed.info/sct', code: '444604002', display: 'N/A' }; // Any Code not in 'Stage-0'
    expect(createHistologyMorphologyResource(primaryCoding, undefined, undefined, tnmPathological)).toBe('INVASIVE_MAMMORY_CARCINOMA');
  });

  it('Test Invasive Ductal Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '444134008', display: 'N/A'} as Coding); // Any code in 'Morphology-Invas_Duct_Carc'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('INVASIVE_DUCTAL_CARCINOMA');
  });

  it('Test Invasive Lobular Carcinoma Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '1080261000119100', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invas Lob Carc'
    expect(createHistologyMorphologyResource(coding, undefined, undefined, undefined)).toBe('INVASIVE_LOBULAR_CARCINOMA');
  });

  it('Test Ductal Carcinoma In Situ Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '18680006', display: 'N/A'} as Coding); // Any code in 'Morphology-Duct_Car_In_Situ'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('DUCTAL_CARCINOMA_IN_SITU');
  });

  it('Test Non-Inflammatory Invasive Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '254840009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invasive-Breast' AND 'Cancer-Inflammatory'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding); // Any code in 'Morphology-Invasive'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('NON-INFLAMMATORY_INVASIVE');
  });

  it('Test Inflammatory Filter', () => {
    const coding = ({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
    const histologyMorphologyBehavior = ({system: 'http://snomed.info/sct', code: '32968003', display: 'N/A'} as Coding); // Code: SNOMED 32968003'
    expect(createHistologyMorphologyResource(coding, histologyMorphologyBehavior, undefined, undefined)).toBe('INFLAMMATORY');
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
    const primaryClinicalStatus = ({ system: 'snomed', code: 'N/A', display: 'N/A' } as Coding);
    const primaryCoding = ({ system: 'http://snomed.info/sct', code: '722524005', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invasive-Breast'
    const histologyMorphologyBehavior = ({ system: 'snomed', code: 'N/A', display: 'N/A' } as Coding);
    const tnmPathological = ({ system: 'snomed', code: '261640009', display: 'N/A' } as Coding); // Any code in 'Stage-3'

    const bundle = createPrimaryCancerResource(primaryCoding, histologyMorphologyBehavior, primaryClinicalStatus, undefined, tnmPathological)
    const mappingLogic = new TrialscopeMappingLogic(bundle);

    const stages: string[] = mappingLogic.getStageValues();
    expect(stages[0]).toBe('INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED');
    expect(stages[1]).toBe('THREE');
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
            bodySite: [],
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

    if(bodySite){
      (radiationBundle.entry[0].resource as Procedure).bodySite = [{coding: [bodySite]}];
    }
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
    const surgicalValue = createSurgicalBundle({ system: 'http://snomed.info/sct', code: '765478004', display: 'N/A' } as Coding); // Any code in 'Treatment-Organ_Transplant'
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

describe('checkTumorMarkerFilterLogic', () => {

  const createTumorMarkerResource = (
    valueRatio: Ratio,
    valueQuantity: Quantity,
    interpretation: Coding,
    valueCodeableConcept: Coding,
    ...coding: Coding[]
  ): BundleEntry => {
    let bundleEntry: BundleEntry = undefined;
  
    if (interpretation) {
      bundleEntry = {
          resource: {
            resourceType: "Observation",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker",
              ],
            },
            interpretation: {
              coding: [interpretation],
            },
            code: {
              coding: coding,
            },
          } as unknown as Resource,
      };
    } else if (valueCodeableConcept) {
      bundleEntry = {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker",
                ],
              },
              valueCodeableConcept: {
                coding: [valueCodeableConcept],
              },
              code: {
                coding: coding,
              },
            } as unknown as Resource
      };
    } else if (valueRatio) {
      bundleEntry = {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker",
                ],
              },
              code: {
                coding: coding,
              },
              valueRatio: valueRatio,
            } as unknown as Resource,
      };
    } else if(valueQuantity) {
      bundleEntry = {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker",
                ],
              },
              code: {
                coding: coding,
              },
              valueQuantity: valueQuantity,
            } as unknown as Resource,
      };
    } else {
      bundleEntry = {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker",
                ],
              }
            } as unknown as Resource,
      };
    }
  
    return bundleEntry;
  }

  const createTumorMarkerValues = (...entries: BundleEntry[]): string => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        ...entries
      ]
    };
    const mappingLogic = new TrialscopeMappingLogic(bundle);
    return mappingLogic.getTumorMarkerValues();
  }
  
  it('Test PR+ Filter', () => {
    // PR+ Filter Attributes
    const tmCode = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tmValueRatio = ({
      numerator: { value: '100', comparator: '>=', unit: '%', code: '%' } as Quantity,
      denominator: { value: '3', comparator: '>=', unit: '%', code: '%' } as Quantity
    } as Ratio);
    const tumorMarker = createTumorMarkerResource(tmValueRatio, undefined, undefined, undefined, tmCode);
    expect(createTumorMarkerValues(tumorMarker)).toBe('PR_PLUS');
  });

  it('Test ER+ Filter', () => {
    // ER+ Filter Attributes
    const tmCode = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tmInterpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'H', display: 'N/A'} as Coding);
    const tumorMarker = createTumorMarkerResource(undefined, undefined, tmInterpretation, undefined, tmCode);
    expect(createTumorMarkerValues(tumorMarker)).toBe('ER_PLUS');
  });

  it('Test HER- Filter', () => {
    // HER2- Filter Attributes
    const code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const valueQuantity = ({ value: '2+', comparator: '=' } as Quantity);
    const tumorMarker = createTumorMarkerResource(undefined, valueQuantity, undefined, undefined, code)
    expect(createTumorMarkerValues(tumorMarker)).toBe('HER2_MINUS');
  });

  it('Test HER2+ Filter', () => {
    const code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const valueQuantity = ({ value: '3+', comparator: '=' } as Quantity);
    const tumorMarker = createTumorMarkerResource(undefined, valueQuantity, undefined, undefined, code)
    expect(createTumorMarkerValues(tumorMarker)).toBe('HER2_PLUS');
  });

  it('Test HER2+ and ER+ Filter', () => {
    // HER2+ Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueCodeableConcept = ({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, undefined, tm1ValueCodeableConcept, tm1Code);
    // ER+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm2ValueQuantity = ({ value: '11', comparator: '>=', unit: '%', code: '%' } as Quantity);
    const tumorMarker2 = createTumorMarkerResource(undefined, tm2ValueQuantity, undefined, undefined, tm2Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2)).toBe('HER2_PLUS_AND_ER_PLUS');
  });

  it('Test HER2+ and PR+ Filter', () => {
    // HER2+ Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'POS', display: 'N/A'} as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, tm1Interpretation, undefined, tm1Code);
    // PR+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueRatio = ({
      numerator: { value: '30', comparator: '>=', unit: '%', code: '%' } as Quantity,
      denominator: { value: '2', comparator: '>=', unit: '%', code: '%' } as Quantity
    } as Ratio);
    const tumorMarker2 = createTumorMarkerResource(tm2ValueRatio, undefined, undefined, undefined, tm2Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2)).toBe('HER2_PLUS_AND_PR_PLUS');
  });

  it('Test ER+ and HER- Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueQuantity = ({ value: '2+', comparator: '=' } as Quantity);
    const tumorMarker1 = createTumorMarkerResource(undefined, tm1ValueQuantity, undefined, undefined, tm1Code);
    // ER+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm2Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'DET', display: 'N/A'} as Coding);
    const tumorMarker2 = createTumorMarkerResource(undefined, undefined, tm2Interpretation, undefined, tm2Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2)).toBe('ER_PLUS_AND_HER2_MINUS');
  });

  it('Test PR+ and HER- Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'NEG', display: 'N/A'} as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, tm1Interpretation, undefined, tm1Code);
    // PR+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2Interpretation = ({
      system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
      code: 'H',
      display: 'N/A'
    } as Coding);
    const tumorMarker2 = createTumorMarkerResource(undefined, undefined, tm2Interpretation, undefined, tm2Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2)).toBe('PR_PLUS_AND_HER2_MINUS');
  });


  it('Test ER+ and HER- and FGFR Amplifications Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'NEG', display: 'N/A'} as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, tm1Interpretation, undefined, tm1Code);
    // ER+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm2ValueCodeableConcept = ({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
    const tumorMarker2 = createTumorMarkerResource(undefined, undefined, undefined, tm2ValueCodeableConcept, tm2Code);
    // FGFR Amplifications Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A' } as Coding); // Any code in 'Biomarker-FGFR'
    const tm3ValueQuantity = ({ value: '1', comparator: '>=', unit: '%', code: '%' } as Quantity);
    const tumorMarker3 = createTumorMarkerResource(undefined, tm3ValueQuantity, undefined, undefined, tm3Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3)).toBe('ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });

  it('Test PR+ and HER- and FGFR Amplifications Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueCodeableConcept = ({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, undefined, tm1ValueCodeableConcept, tm1Code);
    // PR+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueCodeableConcept = ({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
    const tumorMarker2 = createTumorMarkerResource(undefined, undefined, undefined, tm2ValueCodeableConcept, tm2Code);
    // FGFR Amplifications Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A' } as Coding); // Any code in 'Biomarker-FGFR'
    const tm3Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'POS', display: 'N/A'} as Coding);
    const tumorMarker3 = createTumorMarkerResource(undefined, undefined, tm3Interpretation, undefined, tm3Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3)).toBe('PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });

  it('Test ER+ and PR+ and HER2- Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueCodeableConcept = ({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
    const tumorMarker1 = createTumorMarkerResource(undefined, undefined, undefined, tm1ValueCodeableConcept, tm1Code);
    // PR+ Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueRatio = ({
      numerator: { value: '100', comparator: '>=', unit: '%', code: '%' } as Quantity,
      denominator: { value: '3', comparator: '>=', unit: '%', code: '%' } as Quantity
    } as Ratio);
    const tumorMarker2 = createTumorMarkerResource(tm2ValueRatio, undefined, undefined, undefined, tm2Code);
    // ER+ Filter Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm3Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'H', display: 'N/A'} as Coding);
    const tumorMarker3 = createTumorMarkerResource(undefined, undefined, tm3Interpretation, undefined, tm3Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3)).toBe('ER_PLUS_PR_PLUS_HER2_MINUS');
  });

  it('Test Triple negative Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueQuantity = ({ value: '2+', comparator: '=' } as Quantity);
    const tumorMarker1 = createTumorMarkerResource(undefined, tm1ValueQuantity, undefined, undefined, tm1Code);
    // PR- Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueRatio = ({
      numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
      denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as Quantity
    } as Ratio);
    const tumorMarker2 = createTumorMarkerResource(tm2ValueRatio, undefined, undefined, undefined, tm2Code);
    // ER- Filter Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm3Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding);
    const tumorMarker3 = createTumorMarkerResource(undefined, undefined, tm3Interpretation, undefined, tm3Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3)).toBe('TRIPLE_NEGATIVE');
  });

  it('Test Triple negative-10 Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueQuantity = ({ value: '1', comparator: '=' } as Quantity);
    const tumorMarker1 = createTumorMarkerResource(undefined, tm1ValueQuantity, undefined, undefined, tm1Code);
    // PR- Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueQuantity = ({ value: '9', comparator: '<', unit: '%', code: '%' } as Quantity);
    const tumorMarker2 = createTumorMarkerResource(undefined, tm2ValueQuantity, undefined, undefined, tm2Code);
    // ER- Filter Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm3Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding);
    const tumorMarker3 = createTumorMarkerResource(undefined, undefined, tm3Interpretation, undefined, tm3Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3)).toBe('TRIPLE_NEGATIVE_MINUS_10');
  });
  
  it('Test Triple negative and RB Positive Filter', () => {
    // HER2- Filter Attributes
    const tm1Code = ({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
    const tm1ValueQuantity = ({ value: '2+', comparator: '=' } as Quantity);
    const tumorMarker1 = createTumorMarkerResource(undefined, tm1ValueQuantity, undefined, undefined, tm1Code);
    // PR- Filter Attributes
    const tm2Code = ({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
    const tm2ValueRatio = ({
      numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as Quantity,
      denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as Quantity
    } as Ratio);
    const tumorMarker2 = createTumorMarkerResource(tm2ValueRatio, undefined, undefined, undefined, tm2Code);
    // ER- Filter Attributes
    const tm3Code = ({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
    const tm3Interpretation = ({system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding);
    const tumorMarker3 = createTumorMarkerResource(undefined, undefined, tm3Interpretation, undefined, tm3Code);
    // RB+ Attributes
    const tm4Code = ({ system: 'http://loinc.info/sct', code: '42795-5', display: 'N/A' } as Coding); // Any code in 'Biomarker-RB'
    const tm4ValueQuantity = ({ value: '51', comparator: '>', unit: '%', code: '%' } as Quantity);
    const tumorMarker4 = createTumorMarkerResource(undefined, tm4ValueQuantity, undefined, undefined, tm4Code);
    expect(createTumorMarkerValues(tumorMarker1, tumorMarker2, tumorMarker3, tumorMarker4)).toBe('TRIPLE_NEGATIVE_AND_RB_POSITIVE');
  });

  const createCgvTumorMarkerValues = (cgvGeneStudiedVcc: Coding, cgvGeneStudiedInterpretation: Coding, cgvGenomicSourceClassVcc: Coding, cgvValueCodeableConcepts: Coding[], cgvInterpretation: Coding): string => {
    const mappingLogic = new TrialscopeMappingLogic(createCgvTumorMarkerBundle(cgvGeneStudiedVcc, cgvGeneStudiedInterpretation, cgvGenomicSourceClassVcc, cgvValueCodeableConcepts, cgvInterpretation));
    return mappingLogic.getTumorMarkerValues();
  }

  const createCgvTumorMarkerBundle = (cgvGeneStudiedVcc: Coding, cgvGeneStudiedInterpretation: Coding, cgvGenomicSourceClassVcc: Coding, cgvValueCodeableConcepts: Coding[], cgvInterpretation: Coding): Bundle => {
    const bundle: Bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          {
            fullUrl: "urn:uuid:6556b6b3-678c-4fd6-9309-8df77xxxxxxx",
            resource: {
              resourceType: "Observation",
              id: "6556b6b3-678c-4fd6-9309-8df77xxxxxxx",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-genetic-variant"
                ],
                lastUpdated: ""
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        system: "http://loinc.org",
                        code: "48018-6"
                      }
                    ]
                  },
                  valueCodeableConcept: {
                    coding: []
                  }
                },
                {
                  code: {
                    coding: [
                      {
                        system: "http://loinc.org",
                        code: "48002-0"
                      }
                    ]
                  },
                  valueCodeableConcept: {
                    coding: []
                  }
                }
              ]
            } as unknown as Observation
          }
        ]
    };

    if(cgvGeneStudiedVcc){
      bundle.entry[0].resource.component[0].valueCodeableConcept = {coding: [cgvGeneStudiedVcc]};
    }

    if(cgvGeneStudiedInterpretation) {
      bundle.entry[0].resource.component[0].interpretation = {coding: [cgvGeneStudiedInterpretation]};
    }

    if(cgvGenomicSourceClassVcc) {
      bundle.entry[0].resource.component[1].valueCodeableConcept = {coding: [cgvGenomicSourceClassVcc]};
    }

    if(cgvValueCodeableConcepts){
      bundle.entry[0].resource.valueCodeableConcept = {coding: cgvValueCodeableConcepts};
    }

    if(cgvInterpretation){
      bundle.entry[0].resource.interpretation = {coding: [cgvInterpretation]};
    }

    return bundle;
  };

  it('Test BRCA1-Germline Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1100', display: 'BRCA1' });
    const cgvValueCodeableConcepts = [({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' })];
    cgvValueCodeableConcepts.push({ system: 'http://loinc.info/sct', code: 'LA9633-4', display: 'N/A' });
    const cgvInterpretation = ({ system: 'snomed', code: 'CAR', display: 'CAR' });
    const cgvGeneStudiedInterpretation = ({ system: 'snomed', code: 'CAR', display: 'CAR' });
    const cgvGenomicSourceClassVcc = ({system: ' http://loinc.info/sct', code: 'LA6683-2', display: 'N/A'});
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, cgvGeneStudiedInterpretation, cgvGenomicSourceClassVcc, cgvValueCodeableConcepts, cgvInterpretation)).toBe('BRCA1-GERMLINE');
  });

  it('Test BRCA2-Germline Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1101', display: 'BRCA2' });
    const cgvValueCodeableConcepts = [({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' })];
    const cgvGenomicSourceClassVcc = ({system: ' http://loinc.info/sct', code: 'LA6683-2', display: 'N/A'});
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, undefined, cgvGenomicSourceClassVcc, cgvValueCodeableConcepts, undefined)).toBe('BRCA2-GERMLINE');
  });

  it('Test BRCA1-Somatic Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1100', display: 'BRCA1' });
    const cgvValueCodeableConcepts = [({ system: 'http://loinc.info/sct', code: 'LA9633-4', display: 'N/A' })];
    const cgvGenomicSourceClassVcc = ({system: ' http://loinc.info/sct', code: 'LA6684-0', display: 'N/A'});
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, undefined, cgvGenomicSourceClassVcc, cgvValueCodeableConcepts, undefined)).toBe('BRCA1-SOMATIC');
  });

  it('Test BRCA2-Somatic Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1101', display: 'BRCA2' });
    const cgvInterpretation = ({ system: 'snomed', code: 'CAR', display: 'CAR' });
    const cgvGenomicSourceClassVcc = ({system: ' http://loinc.info/sct', code: 'LA6684-0', display: 'N/A'});
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, undefined, cgvGenomicSourceClassVcc, undefined, cgvInterpretation)).toBe('BRCA2-SOMATIC');
  });

  it('Test BRCA1 Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1100', display: 'BRCA1' });
    const cgvGeneStudiedInterpretation = ({ system: 'snomed', code: 'A', display: 'AWW' });
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, cgvGeneStudiedInterpretation, undefined, undefined, undefined)).toBe('BRCA1');
  });

  it('Test BRCA2 Filter', () => {
    const cgvGeneStudiedVcc = ({ system: 'hgnc', code: '1101', display: 'BRCA2' });
    const cgvInterpretation = ({ system: 'snomed', code: 'POS', display: 'POS' });
    expect(createCgvTumorMarkerValues(cgvGeneStudiedVcc, undefined, undefined, undefined, cgvInterpretation)).toBe('BRCA2');
  });

  it('Test Tumor Filter Empty Components Added', () => {
    expect(createCgvTumorMarkerValues(undefined, undefined, undefined, undefined, undefined)).toBe('NOT_SURE');
  });

});

describe('checkECOGFilterLogic', () => {
  it('Test ECOG Filter', () => {
    const resource: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [{
      "resource": {
        "resourceType": "Observation",
        "id": "mCODEKarnofskyPerformanceStatusExample",
        "meta": {
          "profile": [
            "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-ecog-performance-status"
          ],
          "lastUpdated": ""
        },
        "code": {
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "89243-0"
            }
          ]
        },
        "valueInteger": 3
      } as unknown as Observation
    }]};
    const mappingLogic = new TrialscopeMappingLogic(resource);
    expect(mappingLogic.getECOGScore()).toBe('THREE');
  });
});

describe('checkKarnofskyFilterLogic', () => {

  it('Test Karnofsky Filter', () => {
    const resource: Bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [{
      "resource": {
        "resourceType": "Observation",
        "id": "mCODEKarnofskyPerformanceStatusExample",
        "meta": {
          "profile": [
            "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-karnofsky-performance-status"
          ],
          "lastUpdated": ""
        },
        "code": {
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "89243-0"
            }
          ]
        },
        "valueInteger": 90
      } as unknown as Observation
    }]};
    const mappingLogic = new TrialscopeMappingLogic(resource);
    expect(mappingLogic.getKarnofskyScore()).toBe('NINETY');
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
  const emptyPatientBundle: Bundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: []
  };
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
