import * as mcode from '../src/mcode';
import { Coding } from '../src/mcode';
import { PrimaryCancerCondition } from '../src/mcode';
import { SecondaryCancerCondition } from '../src/mcode';

import fs from 'fs';
import path from 'path';
import { fhir } from 'clinical-trial-matching-service';
//const util = require('util')

describe('extractedMCODE', () => {
  let sampleData: fhir.Bundle;
  beforeAll(() => {
    return new Promise((resolve, reject) => {
      const patientDataPath = path.join(__dirname, '../../spec/data/patient_data.json');
      fs.readFile(patientDataPath, { encoding: 'utf8' }, (error, data) => {
        if (error) {
          console.error('Could not read spec file');
          reject(error);
          return;
        }
        try {
          sampleData = JSON.parse(data) as fhir.Bundle;
          // The object we resolve to doesn't really matter
          resolve(sampleData);
        } catch (ex) {
          reject(error);
        }
      });
    });
  });

  it('checksCountOfExtractedProfiles', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    //console.log(util.inspect(extractedData, false, null, true));
    expect(extractedData.primaryCancerCondition.length).toBe(1);
    expect(extractedData.TNMClinicalStageGroup.length).toBe(2);
    expect(extractedData.TNMPathologicalStageGroup.length).toBe(2);
    expect(extractedData.secondaryCancerCondition.length).toBe(1);
    expect(extractedData.birthDate != 'NA').toBeTrue();
    expect(extractedData.tumorMarker.length).toBe(3);
    expect(extractedData.cancerRelatedRadiationProcedure.length).toBe(2);
    expect(extractedData.cancerRelatedSurgicalProcedure.length).toBe(2);
    expect(extractedData.cancerRelatedMedicationStatement.length).toBe(1);
  });

});

/* Primary Cancer Condition Logic Tests */

describe('checkPrimaryCancerFilterLogic-BreastCancer', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();
  let tnmClinical: Coding[] = new Array();
  let tnmPathological: Coding[] = new Array();

  // Breast Cancer Filter Attributes
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'N/A', display: 'N/A'} as Coding;
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;
  pcc.histologyMorphologyBehavior[0] = {system: 'N/A', code: 'N/A', display: 'N/A'} as Coding;

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Breast Cancer Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe("BREAST_CANCER");
  });
});

describe('checkPrimaryCancerFilterLogic-ConcomitantInvasiveMalignancies', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();
  let tnmClinical: Coding[] = new Array();
  let tnmPathological: Coding[] = new Array();

  // Concomitant invasive malignancies Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '67097003', display: 'N/A'} as Coding; // Any code not in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'N/A', code: 'N/A', display: 'N/A'} as Coding;
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'current', display: 'N/A'} as Coding;
  tnmClinical[0] = {system: 'AJCC', code: 'II', display: 'N/A'} as Coding;  // <- THERE IS SOMETHING WRONG WITH AJCC  // Any code in 'Stage-2'
  tnmPathological[0] = {system: 'snomed', code: '261640009', display: 'N/A'} as Coding; // Any code in 'Stage-2'

  extractedMCODE.primaryCancerCondition[0] = pcc;
  extractedMCODE.TNMClinicalStageGroup = tnmClinical;
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Concomitant invasive malignancies Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe("CONCOMITANT_INVASIVE_MALIGNANCIES");
  });
});

describe('checkPrimaryCancerFilterLogic-InvasiveBreastCancerandRecurrent', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Invasive Breast Cancer and Recurrent Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;  // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding; // Any code in 'Morphology-Invasive'
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'recurrent', display: 'N/A'} as Coding;

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Invasive Breast Cancer and Recurrent Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe("INVASIVE_BREAST_CANCER_AND_RECURRENT");
  });
});

describe('checkPrimaryCancerFilterLogic-LocallyRecurrent', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Locally Recurrent Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'recurrent', display: 'N/A'} as Coding;

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Locally Recurrent Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe("LOCALLY_RECURRENT");
  });
});

describe('checkPrimaryCancerFilterLogic-OtherMalignancyExceptSkinOrCervical ', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Other malignancy - except skin or cervical  Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '67097003', display: 'N/A'} as Coding; // Any code not in 'Cancer-Breast'
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'current', display: 'N/A'} as Coding;

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Other malignancy - except skin or cervical  Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe("OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL");
  });
});

/* Secondary Cancer Condition Logic Tests */

describe('checkSecondaryCancerFilterLogic-BrainMetastasis', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = new Array();
  scc.coding = new Array();
  scc.bodySite = new Array();

  // Brain Metastasis Filter Attributes
  scc.coding[0] = {system: 'http://snomed.info/sct', code: '285641009', display: 'N/A'} as Coding;  // Any code in 'Metastasis-Brain'
  scc.clinicalStatus[0] = {system: 'N/A', code: 'active', display: 'N/A'} as Coding;

  extractedMCODE.secondaryCancerCondition[0] = scc;

  it('Test Brain Metastasis Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe("BRAIN_METASTASIS");
  });
});

describe('checkSecondaryCancerFilterLogic-InvasiveBreastCancerAndMetastatic', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = new Array();
  scc.coding = new Array();
  scc.bodySite = new Array();
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Invasive Breast Cancer and Metastatic  Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;  // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding; // Any code in 'Morphology-Invasive'
  scc.coding[0] = {system: 'http://snomed.info/sct', code: '285641009', display: 'N/A'} as Coding;  // Any code

  extractedMCODE.secondaryCancerCondition[0] = scc;

  it('Test Invasive Breast Cancer and Metastatic Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe("INVASIVE_BREAST_CANCER_AND_METASTATIC");
  });
});

describe('checkSecondaryCancerFilterLogic-LeptomeningealMetastaticDisease', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = new Array();
  scc.coding = new Array();
  scc.bodySite = new Array();

  // Leptomeningeal metastatic disease Filter Attributes
  scc.bodySite[0] = {system: 'http://snomed.info/sct', code: '8935007', display: 'N/A'} as Coding;

  extractedMCODE.secondaryCancerCondition[0] = scc;

  it('Test Leptomeningeal metastatic disease Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe("LEPTOMENINGEAL_METASTATIC_DISEASE");
  });
});

describe('checkSecondaryCancerFilterLogic-Metastatic', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = new Array();
  scc.coding = new Array();
  scc.bodySite = new Array();
  let tnmPathological: Coding[] = new Array();

  // Metastatic Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '313046007', display: 'N/A'} as Coding; // Any code in 'Stage-4'
  scc.coding[0] = {system: 'http://snomed.info/sct', code: '285641009', display: 'N/A'} as Coding;  // Any code

  extractedMCODE.secondaryCancerCondition[0] = scc;
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Metastatic Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe("METASTATIC");
  });
});

/* Histology Morphology Logic Tests */

describe('checkHistologyMorphologyFilterLogic-InvasiveCarcinoma', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Invasive Carcinoma Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;  // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'http://snomed.info/sct', code: '734075007', display: 'N/A'} as Coding; // Any code in 'Morphology-Invasive_Carcinoma'

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Invasive Carcinoma Filter', () => {
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe("INVASIVE_CARCINOMA");
  });
});

describe('checkHistologyMorphologyFilterLogic-InvasiveBreastCancer', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();

  // Invasive Breast Cancer Filter Attributes
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '783541009', display: 'N/A'} as Coding;  // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'http://snomed.info/sct', code: '446688004', display: 'N/A'} as Coding; // Any code in 'Morphology-Invasive'

  extractedMCODE.primaryCancerCondition[0] = pcc;

  it('Test Invasive Breast Cancer Filter', () => {
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe("INVASIVE_BREAST_CANCER");
  });
});

/* Stage Logic Tests */

describe('checkStageFilterLogic-Invasive Breast Cancer and Locally Advanced', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = new Array();
  pcc.coding = new Array();
  pcc.histologyMorphologyBehavior = new Array();
  let tnmPathological: Coding[] = new Array();

  // Invasive Breast Cancer and Locally Advanced Filter Attributes
  pcc.clinicalStatus[0] = {system: 'N/A', code: 'N/A', display: 'N/A'} as Coding;
  pcc.coding[0] = {system: 'http://snomed.info/sct', code: '722524005', display: 'N/A'} as Coding;  // Any Code in 'Cancer-Invasive-Breast'
  pcc.histologyMorphologyBehavior[0] = {system: 'N/A', code: 'N/A', display: 'N/A'} as Coding;
  tnmPathological[0] = {system: 'snomed', code: '261640009', display: 'N/A'} as Coding; // Any code in 'Stage-3'


  extractedMCODE.primaryCancerCondition[0] = pcc;
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Invasive Breast Cancer and Locally Advanced Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED");
  });
});

describe('checkStageFilterLogic-Stage 0', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Stage 0 Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '261645004', display: 'N/A'} as Coding; // Any code in 'Stage-0'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 0 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("ZERO");
  });
});

describe('checkStageFilterLogic-Stage 1', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Stage 1 Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '313112008', display: 'N/A'} as Coding; // Any code in 'Stage-1'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 1 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("ONE");
  });
});

describe('checkStageFilterLogic-Stage 2', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Stage 2 Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: 'Stage 2B (qualifier value)', display: 'N/A'} as Coding; // Any code in 'Stage-2

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 2 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("TWO");
  });
});

describe('checkStageFilterLogic-Stage 3', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Stage 3 Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '261640009', display: 'N/A'} as Coding; // Any code in 'Stage-3'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 3 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("THREE");
  });
});

describe('checkStageFilterLogic-Stage 4', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Stage 4 Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '261643006', display: 'N/A'} as Coding; // Any code in 'Stage-4'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 4 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("FOUR");
  });
});

/* Radiation Procedure Logic Tests */

describe('checkRadiationProcedureFilterLogic-SRS', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = new Array();
  crrp.coding = new Array();

  // SRS Filter Attributes
  crrp.coding[0] = {system: 'http://snomed.info/sct', code: '473237008', display: 'N/A'} as Coding; // Any code in 'Treatment-SRS-Brain'

  extractedMCODE.cancerRelatedRadiationProcedure[0] = crrp;

  it('Test SRS Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe("SRS");
  });
});

describe('checkRadiationProcedureFilterLogic-WBRT', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = new Array();
  crrp.coding = new Array();

  // WBRT Filter Attributes
  crrp.coding[0] = {system: 'http://snomed.info/sct', code: '108290001', display: 'N/A'} as Coding;
  crrp.bodySite[0] = {system: 'http://snomed.info/sct', code: '12738006', display: 'N/A'} as Coding;

  extractedMCODE.cancerRelatedRadiationProcedure[0] = crrp;

  it('Test WBRT Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe("WBRT");
  });
});

describe('checkRadiationProcedureFilterLogic-Radiation Therapy', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = new Array();
  crrp.coding = new Array();

  // Radiation Therapy Filter Attributes
  crrp.coding[0] = {system: 'http://snomed.info/sct', code: '108290001', display: 'N/A'} as Coding; // Any code

  extractedMCODE.cancerRelatedRadiationProcedure[0] = crrp;

  it('Test Radiation Therapy Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe("RADIATION_THERAPY");
  });
});

/* Surgical Procedure Logic Tests */

describe('checkSurgicalProcedureFilterLogic-Resection', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let sp: Coding[] = new Array();

  // Resection Filter Attributes
  sp[0] = {system: 'http://snomed.info/sct', code: '446103006', display: 'N/A'} as Coding; // Any code in 'Treatment-Resection-Brain'
  extractedMCODE.cancerRelatedSurgicalProcedure = sp;

  it('Test Resection Filter', () => {
    expect(extractedMCODE.getSurgicalProcedureValue()).toBe("RESECTION");
  });
});

describe('checkSurgicalProcedureFilterLogic-Splenectomy', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let sp: Coding[] = new Array();

  // Splenectomy Filter Attributes
  sp[0] = {system: 'http://snomed.info/sct', code: '67097003', display: 'N/A'} as Coding; // Any code in 'Treatment-Splenectomy'
  extractedMCODE.cancerRelatedSurgicalProcedure = sp;

  it('Test Splenectomy Filter', () => {
    expect(extractedMCODE.getSurgicalProcedureValue()).toBe("SPLENECTOMY");
  });
});

/* Medication Statement Logic Tests */

describe('checkMedicationStatementFilterLogic-T-DM1', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // T-DM1 Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A'} as Coding; // Any code in 'Treatment-T-DM1'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test T-DM1 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("T_DM1");
  });
});

describe('checkMedicationStatementFilterLogic-CDK4/6 inhibitor', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // CDK4/6 inhibitor Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A'} as Coding; // Any code in 'Treatment-CDK4_6_Inhibtor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test CDK4/6 inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("CDK4_6_INHIBITOR");
  });
});

describe('checkMedicationStatementFilterLogic-Poly ICLC ', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // Poly ICLC  Filter Attributes
  ms[0] = {system: 'NIH', code: '#C1198', display: 'N/A'} as Coding;
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Poly ICLC Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("POLY_ICLC");
  });
});

describe('checkMedicationStatementFilterLogic-DrugCombo-1', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // DrugCombo-1 Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A'} as Coding; // Any code in 'Treatment-Trastuzamab'  and 'Treatment-T-DM1'
  ms[1] = {system: 'http://rxnorm.info/sct', code: '1298949', display: 'N/A'} as Coding; // Any code in 'Treatment-Pertuzumab'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test DrugCombo-1 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("DRUGCOMBO_1");
  });
});

describe('checkMedicationStatementFilterLogic-Pembrolizumab', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // Pembrolizumab Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1547545', display: 'N/A'} as Coding; // Any code in 'Treatment-Pembrolizumab'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Pembrolizumab Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("PEMBROLIZUMAB");
  });
});

describe('checkMedicationStatementFilterLogic-mTOR inhibitor', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // mTOR inhibitor Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '845509', display: 'N/A'} as Coding; // Any code in 'Treatment-mTOR_Inhibtor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test mTOR inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("MTOR_INHIBITOR");
  });
});

describe('checkMedicationStatementFilterLogic-Concurrent Endocrine Therapy ', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // Concurrent Endocrine Therapy  Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A'} as Coding; // Any code in 'Treatment-Endocrine_Therapy'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Concurrent Endocrine Therapy  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("CONCURRENT_ENDOCRINE_THERAPY");
  });
});

describe('checkMedicationStatementFilterLogic-Anti-androgen', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // Anti-androgen Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '151495', display: 'N/A'} as Coding; // Any code in 'Treatment-anti-Androgen'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Anti-androgen Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("ANTI_ANDROGEN");
  });
});

describe('checkMedicationStatementFilterLogic-anti-HER2', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // anti-HER2 Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '101306', display: 'N/A'} as Coding; // Any code in 'Treatment-anti-HER2'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test anti-HER2 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("ANTI_HER2");
  });
});

describe('checkMedicationStatementFilterLogic-Tyrosine Kinase Inhibitor', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // Tyrosine Kinase Inhibitor Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1430449', display: 'N/A'} as Coding; // Any code in 'Treatment-Tyrosine_Kinase_Inhib'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Tyrosine Kinase Inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("TYROSINE_KINASE_INHIBITOR");
  });
});

describe('checkMedicationStatementFilterLogic-P13K inhibitor ', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // P13K inhibitor  Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '2169302', display: 'N/A'} as Coding; // Any code in 'Treatment-P13K_Inhibitor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test P13K inhibitor  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("P13K_INHIBITOR");
  });
});

describe('checkMedicationStatementFilterLogic-anti-PD', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // anti-PD Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1792780', display: 'N/A'} as Coding; // Any code in 'Treatment-anti-PD1,PDL1,PDL2'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test anti-PD Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("ANTI_PD");
  });
});

describe('checkMedicationStatementFilterLogic-CDK4/6-mTOR and Endocrine ', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let ms: Coding[] = new Array();

  // CDK4/6-mTOR and Endocrine  Filter Attributes
  ms[0] = {system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A'} as Coding; // Any code in 'Treatment-CDK4_6_Inhibtor'
  ms[1] = {system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A'} as Coding; // Any code in 'Treatment-Endocrine_Therapy'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test CDK4/6-mTOR and Endocrine  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe("CDK4_6_MTOR_AND_ENDOCRINE");
  });
});

/* Tumor Marker Logic Tests */

describe('checkTumorMarkerFilterLogic-HER2+', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2+ Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueQuantity[0] = {value: '3+', comparator: '='} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test HER2+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("HER2_PLUS");
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and ER+', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2+ Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueCodeableConcept[0] = {system: 'http://snomed.info/sct', code: '10828004', display: 'N/A'} as Coding;
  // ER+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.valueQuantity[1] = {value: '10', comparator: '>=', unit: '%'} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test HER2+ and ER+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("HER2+ and ER+");
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and PR+', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2+ Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.interpretation[0] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'POS', display: 'N/A'} as Coding;
  // PR+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.valueQuantity[1] = {value: '10', comparator: '>=', unit: '%'} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test HER2+ and PR+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("HER2_PLUS_AND_PR_PLUS");
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER-+', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueQuantity[0] = {value: '2+', comparator: '='} as mcode.Quantity;
  // ER+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.interpretation[1] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'DET', display: 'N/A'} as Coding;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("ER_PLUS_AND_HER2_MINUS");
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER-', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.interpretation[0] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'NEG', display: 'N/A'} as Coding;
  // PR+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.interpretation[0] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'H', display: 'N/A'} as Coding;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test PR+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("HER2_PLUS_AND_PR_PLUS");
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER2- and FGFR amplifications', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.interpretation[0] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'NEG', display: 'N/A'} as Coding;
  // ER+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.valueCodeableConcept[1] = {system: 'http://snomed.info/sct', code: '10828004', display: 'N/A'} as Coding;
  // FGFR Amplifications Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A'} as Coding; // Any code in 'Biomarker-FGFR'
  tm.valueQuantity[2] = {value: '1', comparator: '>=', unit: '%'} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS");
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER- and FGFR Amplifications', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueCodeableConcept[0] = {system: 'http://snomed.info/sct', code: '260385009', display: 'N/A'} as Coding;
  // PR+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.valueCodeableConcept[1] = {system: 'http://snomed.info/sct', code: '10828004', display: 'N/A'} as Coding;
  // FGFR Amplifications Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A'} as Coding; // Any code in 'Biomarker-FGFR'
  tm.interpretation[2] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'POS', display: 'N/A'} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test PR+ and HER- and FGFR Amplifications Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS");
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and PR+ and HER2-', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueCodeableConcept[0] = {system: 'http://snomed.info/sct', code: '260385009', display: 'N/A'} as Coding;
  // PR+ Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.valueQuantity[1] = {value: '11', comparator: '>=', unit: '%'} as mcode.Quantity;
  // ER+ Filter Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.interpretation[2] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'H', display: 'N/A'} as Coding;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test ER+ and PR+ and HER2- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("ER_PLUS_PR_PLUS_HER2_MINUS");
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueQuantity[0] = {value: '2+', comparator: '='} as mcode.Quantity;
  // PR- Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.interpretation[1] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'ND', display: 'N/A'} as Coding;
  // ER- Filter Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.interpretation[2] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test Triple negative Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("TRIPLE_NEGATIVE");
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative-10', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueQuantity[0] = {value: '1', comparator: '='} as mcode.Quantity;
  // PR- Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.valueQuantity[1] = {value: '9', comparator: '<', unit: '%'} as mcode.Quantity;
  // ER- Filter Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.interpretation[2] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test Triple negative-10 Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("TRIPLE_NEGATIVE_MINUS_10");
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative and RB Positive', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tm: mcode.TumorMarker = {};
  tm.code = new Array();
  tm.interpretation = new Array();
  tm.valueCodeableConcept = new Array();
  tm.valueQuantity = new Array();
  tm.valueRatio = new Array();

  // HER2- Filter Attributes
  tm.code[0] = {system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A'} as Coding; // Any code in 'Biomarker-HER2'
  tm.valueQuantity[0] = {value: '1', comparator: '='} as mcode.Quantity;
  // PR- Filter Attributes
  tm.code[1] = {system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A'} as Coding; // Any code in 'Biomarker-PR'
  tm.interpretation[1] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'ND', display: 'N/A'} as Coding;
  // ER- Filter Attributes
  tm.code[2] = {system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A'} as Coding; // Any code in 'Biomarker-ER'
  tm.interpretation[2] = {system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html', code: 'N', display: 'N/A'} as Coding;
  // RB+ Attributes
  tm.code[3] = {system: 'http://loinc.info/sct', code: '42795-5', display: 'N/A'} as Coding; // Any code in 'Biomarker-RB'
  tm.valueQuantity[3] = {value: '51', comparator: '>', unit: '%'} as mcode.Quantity;

  extractedMCODE.tumorMarker[0] = tm;

  it('Test Triple negative and RB Positive Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe("TRIPLE_NEGATIVE_AND_RB_POSITIVE");
  });
});
