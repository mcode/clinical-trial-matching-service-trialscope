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
    expect(extractedData.birthDate).toBe('1966-08-03');
    expect(extractedData.tumorMarker.length).toBe(3);
    expect(extractedData.cancerRelatedRadiationProcedure.length).toBe(2);
    expect(extractedData.cancerRelatedSurgicalProcedure.length).toBe(2);
    expect(extractedData.cancerRelatedMedicationStatement.length).toBe(1);
  });

  it('checkExtractedPrimaryCancerCondition', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.primaryCancerCondition[0].clinicalStatus[0].code).toBe('active');
    expect(extractedData.primaryCancerCondition[0].coding[0].code).toBe('254837009');
    expect(extractedData.primaryCancerCondition[0].histologyMorphologyBehavior[0].code).toBe('367651003');
  });

  it('checkExtractedTNMClinicalStageGroup', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.TNMClinicalStageGroup[0].code).toBe('261638004');
    expect(extractedData.TNMClinicalStageGroup[1].code).toBe('c3A');
  });

  it('checkExtractedTNMPathologicalStageGroup', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.TNMPathologicalStageGroup[0].code).toBe('261638004');
    expect(extractedData.TNMPathologicalStageGroup[1].code).toBe('c3A');
  });

  it('checkExtractedSecondaryCancerCondition', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.secondaryCancerCondition[0].clinicalStatus[0].code).toBe('active');
    expect(extractedData.secondaryCancerCondition[0].coding[0].code).toBe('128462008');
    expect(extractedData.secondaryCancerCondition[0].bodySite[0].code).toBe('8935007');
  });

  it('checkExtractedTumorMarker', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    //console.log(util.inspect(extractedData.tumorMarker, false, null, true));
    expect(
      extractedData.tumorMarker.some(
        (marker) =>
          marker.valueCodeableConcept[0].code == '10828004' &&
          marker.valueQuantity[0].value == 3 &&
          marker.valueRatio.length == 0 &&
          marker.code[0].code == '48676-1' &&
          marker.code[1].code == '85319-2' &&
          marker.interpretation[0].code == 'POS'
      )
    ).toBeTrue();
    expect(
      extractedData.tumorMarker.some(
        (marker) =>
          marker.valueCodeableConcept[0].code == '10828004' &&
          marker.valueQuantity.length == 0 &&
          marker.valueRatio[0].numerator.value == 1 &&
          marker.valueRatio[0].numerator.comparator == '>=' &&
          marker.valueRatio[0].denominator.value == 100 &&
          marker.code[0].code == '48676-1' &&
          marker.code[1].code == '85318-4' &&
          marker.interpretation.length == 0
      )
    ).toBeTrue();
    expect(
      extractedData.tumorMarker.some(
        (marker) =>
          marker.valueCodeableConcept[0].code == '10828004' &&
          marker.valueQuantity.length > 0 &&
          marker.valueQuantity[0].value == 10 &&
          marker.valueQuantity[0].comparator == '>=' &&
          marker.valueQuantity[0].unit == '%' &&
          marker.valueRatio.length == 0 &&
          marker.code[0].code == '16112-5' &&
          marker.code[1].code == '85337-4' &&
          marker.interpretation.length == 0
      )
    ).toBeTrue();
  });

  it('checkExtractedCancerRelatedRadiationProcedure', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(
      extractedData.cancerRelatedRadiationProcedure.some(
        (procedure) => procedure.coding[0].code == '448385000' && procedure.bodySite.length == 0
      )
    ).toBeTrue();
    expect(
      extractedData.cancerRelatedRadiationProcedure.some(
        (procedure) =>
          procedure.coding[0].code == '448385000' &&
          procedure.bodySite.length != 0 &&
          procedure.bodySite[0].code == '12738006'
      )
    ).toBeTrue();
  });

  it('checkExtractedCancerRelatedSurgicalProcedure', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.cancerRelatedSurgicalProcedure.some((procedure) => procedure.code == '396487001')).toBeTrue();
    expect(extractedData.cancerRelatedSurgicalProcedure.some((procedure) => procedure.code == '443497002')).toBeTrue();
  });

  it('checkExtractedCancerRelatedMedicationStatement', function () {
    const extractedData = new mcode.extractedMCODE(sampleData);
    expect(extractedData.cancerRelatedMedicationStatement[0].code).toBe('583214');
  });
});

/* Primary Cancer Condition Logic Tests */

describe('checkPrimaryCancerFilterLogic-BreastCancer', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Breast Cancer Filter Attributes
  pcc.clinicalStatus.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
  pcc.histologyMorphologyBehavior.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Breast Cancer Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('BREAST_CANCER');
  });
});

describe('checkPrimaryCancerFilterLogic-ConcomitantInvasiveMalignancies', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];
  const tnmClinical: Coding[] = [] as Coding[];
  const tnmPathological: Coding[] = [] as Coding[];

  // Concomitant invasive malignancies Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
  pcc.clinicalStatus.push({ system: 'N/A', code: 'current', display: 'N/A' } as Coding);
  tnmClinical.push({ system: 'AJCC', code: 'II', display: 'N/A' } as Coding); // Any code in 'Stage-2'

  extractedMCODE.primaryCancerCondition.push(pcc);
  extractedMCODE.TNMClinicalStageGroup = tnmClinical;
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Concomitant invasive malignancies Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('CONCOMITANT_INVASIVE_MALIGNANCIES');
  });
});

describe('checkPrimaryCancerFilterLogic-InvasiveBreastCancerandRecurrent', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Invasive Breast Cancer and Recurrent Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior.push({
    system: 'http://snomed.info/sct',
    code: '734075007',
    display: 'N/A'
  } as Coding); // Any code in 'Morphology-Invasive'
  pcc.clinicalStatus.push({ system: 'N/A', code: 'recurrent', display: 'N/A' } as Coding);

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Invasive Breast Cancer and Recurrent Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('INVASIVE_BREAST_CANCER_AND_RECURRENT');
  });
});

describe('checkPrimaryCancerFilterLogic-LocallyRecurrent', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Locally Recurrent Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding);
  pcc.clinicalStatus.push({ system: 'N/A', code: 'recurrent', display: 'N/A' } as Coding);

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Locally Recurrent Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('LOCALLY_RECURRENT');
  });
});

describe('checkPrimaryCancerFilterLogic-OtherMalignancyExceptSkinOrCervical ', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Other malignancy - except skin or cervical  Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code not in 'Cancer-Breast'
  pcc.clinicalStatus.push({ system: 'N/A', code: 'current', display: 'N/A' } as Coding);

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Other malignancy - except skin or cervical  Filter', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL');
  });
});

/* Secondary Cancer Condition Logic Tests */

describe('checkSecondaryCancerFilterLogic-BrainMetastasis', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = [] as Coding[];
  scc.coding = [] as Coding[];
  scc.bodySite = [] as Coding[];

  // Brain Metastasis Filter Attributes
  scc.coding.push({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code in 'Metastasis-Brain'
  scc.clinicalStatus.push({ system: 'N/A', code: 'active', display: 'N/A' } as Coding);

  extractedMCODE.secondaryCancerCondition.push(scc);

  it('Test Brain Metastasis Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('BRAIN_METASTASIS');
  });
});

describe('checkSecondaryCancerFilterLogic-InvasiveBreastCancerAndMetastatic', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = [] as Coding[];
  scc.coding = [] as Coding[];
  scc.bodySite = [] as Coding[];
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Invasive Breast Cancer and Metastatic  Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior.push({
    system: 'http://snomed.info/sct',
    code: '734075007',
    display: 'N/A'
  } as Coding); // Any code in 'Morphology-Invasive'
  scc.coding.push({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code

  extractedMCODE.primaryCancerCondition.push(pcc);
  extractedMCODE.secondaryCancerCondition.push(scc);

  it('Test Invasive Breast Cancer and Metastatic Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('INVASIVE_BREAST_CANCER_AND_METASTATIC');
  });
});

describe('checkSecondaryCancerFilterLogic-LeptomeningealMetastaticDisease', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = [] as Coding[];
  scc.coding = [] as Coding[];
  scc.bodySite = [] as Coding[];

  // Leptomeningeal metastatic disease Filter Attributes
  scc.bodySite.push({ system: 'http://snomed.info/sct', code: '8935007', display: 'N/A' } as Coding);

  extractedMCODE.secondaryCancerCondition.push(scc);

  it('Test Leptomeningeal metastatic disease Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('LEPTOMENINGEAL_METASTATIC_DISEASE');
  });
});

describe('checkSecondaryCancerFilterLogic-Metastatic', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const scc: SecondaryCancerCondition = {};
  scc.clinicalStatus = [] as Coding[];
  scc.coding = [] as Coding[];
  scc.bodySite = [] as Coding[];
  const tnmPathological: Coding[] = [] as Coding[];

  // Metastatic Filter Attributes
  tnmPathological.push({ system: 'snomed', code: '313046007', display: 'N/A' } as Coding); // Any code in 'Stage-4'
  scc.coding.push({ system: 'http://snomed.info/sct', code: '285641009', display: 'N/A' } as Coding); // Any code

  extractedMCODE.secondaryCancerCondition.push(scc);
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Metastatic Filter', () => {
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('METASTATIC');
  });
});

/* Histology Morphology Logic Tests */

describe('checkHistologyMorphologyFilterLogic-InvasiveCarcinoma', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Invasive Carcinoma Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior.push({
    system: 'http://snomed.info/sct',
    code: '734075007',
    display: 'N/A'
  } as Coding); // Any code in 'Morphology-Invasive_Carcinoma'

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Invasive Carcinoma Filter', () => {
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe('INVASIVE_CARCINOMA');
  });
});

describe('checkHistologyMorphologyFilterLogic-InvasiveBreastCancer', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];

  // Invasive Breast Cancer Filter Attributes
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '783541009', display: 'N/A' } as Coding); // Any Code in 'Cancer-Breast'
  pcc.histologyMorphologyBehavior.push({
    system: 'http://snomed.info/sct',
    code: '446688004',
    display: 'N/A'
  } as Coding); // Any code in 'Morphology-Invasive'

  extractedMCODE.primaryCancerCondition.push(pcc);

  it('Test Invasive Breast Cancer Filter', () => {
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe('INVASIVE_BREAST_CANCER');
  });
});

/* Stage Logic Tests */

describe('checkStageFilterLogic-Invasive Breast Cancer and Locally Advanced', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const pcc: PrimaryCancerCondition = {};
  pcc.clinicalStatus = [] as Coding[];
  pcc.coding = [] as Coding[];
  pcc.histologyMorphologyBehavior = [] as Coding[];
  const tnmPathological: Coding[] = [] as Coding[];

  // Invasive Breast Cancer and Locally Advanced Filter Attributes
  pcc.clinicalStatus.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
  pcc.coding.push({ system: 'http://snomed.info/sct', code: '722524005', display: 'N/A' } as Coding); // Any Code in 'Cancer-Invasive-Breast'
  pcc.histologyMorphologyBehavior.push({ system: 'N/A', code: 'N/A', display: 'N/A' } as Coding);
  tnmPathological.push({ system: 'snomed', code: '261640009', display: 'N/A' } as Coding); // Any code in 'Stage-3'

  extractedMCODE.primaryCancerCondition.push(pcc);
  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Invasive Breast Cancer and Locally Advanced Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED');
  });
});

describe('checkStageFilterLogic-Stage 0', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tnmPathological: Coding[] = [] as Coding[];

  // Stage 0 Filter Attributes
  tnmPathological.push({ system: 'snomed', code: '261645004', display: 'N/A' } as Coding); // Any code in 'Stage-0'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 0 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('ZERO');
  });
});

describe('checkStageFilterLogic-Stage 1', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tnmPathological: Coding[] = [] as Coding[];

  // Stage 1 Filter Attributes
  tnmPathological.push({ system: 'snomed', code: '313112008', display: 'N/A' } as Coding); // Any code in 'Stage-1'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 1 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('ONE');
  });
});

describe('checkStageFilterLogic-Stage 2', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tnmPathological: Coding[] = [] as Coding[];

  // Stage 2 Filter Attributes
  tnmPathological.push({ system: 'snomed', code: 'Stage 2B (qualifier value)', display: 'N/A' } as Coding); // Any code in 'Stage-2

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 2 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('TWO');
  });
});

describe('checkStageFilterLogic-Stage 3', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tnmPathological: Coding[] = [] as Coding[];

  // Stage 3 Filter Attributes
  tnmPathological.push({ system: 'snomed', code: '261640009', display: 'N/A' } as Coding); // Any code in 'Stage-3'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 3 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('THREE');
  });
});

describe('checkStageFilterLogic-Stage 4', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tnmPathological: Coding[] = [] as Coding[];

  // Stage 4 Filter Attributes
  tnmPathological.push({ system: 'snomed', code: '261643006', display: 'N/A' } as Coding); // Any code in 'Stage-4'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Stage 4 Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe('FOUR');
  });
});

/* Radiation Procedure Logic Tests */

describe('checkRadiationProcedureFilterLogic-SRS', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = [] as Coding[];
  crrp.coding = [] as Coding[];

  // SRS Filter Attributes
  crrp.coding.push({ system: 'http://snomed.info/sct', code: '473237008', display: 'N/A' } as Coding); // Any code in 'Treatment-SRS-Brain'

  extractedMCODE.cancerRelatedRadiationProcedure.push(crrp);

  it('Test SRS Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe('SRS');
  });
});

describe('checkRadiationProcedureFilterLogic-WBRT', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = [] as Coding[];
  crrp.coding = [] as Coding[];

  // WBRT Filter Attributes
  crrp.coding.push({ system: 'http://snomed.info/sct', code: '108290001', display: 'N/A' } as Coding);
  crrp.bodySite.push({ system: 'http://snomed.info/sct', code: '12738006', display: 'N/A' } as Coding);

  extractedMCODE.cancerRelatedRadiationProcedure.push(crrp);

  it('Test WBRT Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe('WBRT');
  });
});

describe('checkRadiationProcedureFilterLogic-Radiation Therapy', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const crrp: mcode.CancerRelatedRadiationProcedure = {};
  crrp.bodySite = [] as Coding[];
  crrp.coding = [] as Coding[];

  // Radiation Therapy Filter Attributes
  crrp.coding.push({ system: 'http://snomed.info/sct', code: '108290001', display: 'N/A' } as Coding); // Any code

  extractedMCODE.cancerRelatedRadiationProcedure.push(crrp);

  it('Test Radiation Therapy Filter', () => {
    expect(extractedMCODE.getRadiationProcedureValue()).toBe('RADIATION_THERAPY');
  });
});

/* Surgical Procedure Logic Tests */

describe('checkSurgicalProcedureFilterLogic-Resection', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const sp: Coding[] = [] as Coding[];

  // Resection Filter Attributes
  sp.push({ system: 'http://snomed.info/sct', code: '446103006', display: 'N/A' } as Coding); // Any code in 'Treatment-Resection-Brain'
  extractedMCODE.cancerRelatedSurgicalProcedure = sp;

  it('Test Resection Filter', () => {
    expect(extractedMCODE.getSurgicalProcedureValue()).toBe('RESECTION');
  });
});

describe('checkSurgicalProcedureFilterLogic-Splenectomy', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const sp: Coding[] = [] as Coding[];

  // Splenectomy Filter Attributes
  sp.push({ system: 'http://snomed.info/sct', code: '67097003', display: 'N/A' } as Coding); // Any code in 'Treatment-Splenectomy'
  extractedMCODE.cancerRelatedSurgicalProcedure = sp;

  it('Test Splenectomy Filter', () => {
    expect(extractedMCODE.getSurgicalProcedureValue()).toBe('SPLENECTOMY');
  });
});

/* Medication Statement Logic Tests */

describe('checkMedicationStatementFilterLogic-T-DM1', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // T-DM1 Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A' } as Coding); // Any code in 'Treatment-T-DM1'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test T-DM1 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('T_DM1');
  });
});

describe('checkMedicationStatementFilterLogic-CDK4/6 inhibitor', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // CDK4/6 inhibitor Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A' } as Coding); // Any code in 'Treatment-CDK4_6_Inhibtor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test CDK4/6 inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('CDK4_6_INHIBITOR');
  });
});

describe('checkMedicationStatementFilterLogic-Poly ICLC ', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // Poly ICLC  Filter Attributes
  ms.push({ system: 'NIH', code: '#C1198', display: 'N/A' } as Coding);
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Poly ICLC Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('POLY_ICLC');
  });
});

describe('checkMedicationStatementFilterLogic-DrugCombo-1', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // DrugCombo-1 Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1371046', display: 'N/A' } as Coding); // Any code in 'Treatment-Trastuzamab'  and 'Treatment-T-DM1'
  ms.push({ system: 'http://rxnorm.info/sct', code: '1298949', display: 'N/A' } as Coding); // Any code in 'Treatment-Pertuzumab'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test DrugCombo-1 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('DRUGCOMBO_1');
  });
});

describe('checkMedicationStatementFilterLogic-Pembrolizumab', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // Pembrolizumab Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1547545', display: 'N/A' } as Coding); // Any code in 'Treatment-Pembrolizumab'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Pembrolizumab Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('PEMBROLIZUMAB');
  });
});

describe('checkMedicationStatementFilterLogic-mTOR inhibitor', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // mTOR inhibitor Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '845509', display: 'N/A' } as Coding); // Any code in 'Treatment-mTOR_Inhibtor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test mTOR inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('MTOR_INHIBITOR');
  });
});

describe('checkMedicationStatementFilterLogic-Concurrent Endocrine Therapy ', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // Concurrent Endocrine Therapy  Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A' } as Coding); // Any code in 'Treatment-Endocrine_Therapy'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Concurrent Endocrine Therapy  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('CONCURRENT_ENDOCRINE_THERAPY');
  });
});

describe('checkMedicationStatementFilterLogic-Anti-androgen', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // Anti-androgen Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '151495', display: 'N/A' } as Coding); // Any code in 'Treatment-anti-Androgen'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Anti-androgen Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('ANTI_ANDROGEN');
  });
});

describe('checkMedicationStatementFilterLogic-anti-HER2', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // anti-HER2 Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '101306', display: 'N/A' } as Coding); // Any code in 'Treatment-anti-HER2'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test anti-HER2 Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('ANTI_HER2');
  });
});

describe('checkMedicationStatementFilterLogic-Tyrosine Kinase Inhibitor', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // Tyrosine Kinase Inhibitor Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1430449', display: 'N/A' } as Coding); // Any code in 'Treatment-Tyrosine_Kinase_Inhib'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test Tyrosine Kinase Inhibitor Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('TYROSINE_KINASE_INHIBITOR');
  });
});

describe('checkMedicationStatementFilterLogic-P13K inhibitor ', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // P13K inhibitor  Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '2169302', display: 'N/A' } as Coding); // Any code in 'Treatment-P13K_Inhibitor'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test P13K inhibitor  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('P13K_INHIBITOR');
  });
});

describe('checkMedicationStatementFilterLogic-anti-PD', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // anti-PD Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1792780', display: 'N/A' } as Coding); // Any code in 'Treatment-anti-PD1,PDL1,PDL2'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test anti-PD Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('ANTI_PD');
  });
});

describe('checkMedicationStatementFilterLogic-CDK4/6-mTOR and Endocrine ', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const ms: Coding[] = [] as Coding[];

  // CDK4/6-mTOR and Endocrine  Filter Attributes
  ms.push({ system: 'http://rxnorm.info/sct', code: '1873984', display: 'N/A' } as Coding); // Any code in 'Treatment-CDK4_6_Inhibtor'
  ms.push({ system: 'http://rxnorm.info/sct', code: '262485', display: 'N/A' } as Coding); // Any code in 'Treatment-Endocrine_Therapy'
  extractedMCODE.cancerRelatedMedicationStatement = ms;

  it('Test CDK4/6-mTOR and Endocrine  Filter', () => {
    expect(extractedMCODE.getMedicationStatementValue()).toBe('CDK4_6_MTOR_AND_ENDOCRINE');
  });
});

/* Tumor Marker Logic Tests */

describe('checkTumorMarkerFilterLogic-HER2+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm: mcode.TumorMarker = {};
  tm.code = [] as Coding[];
  tm.interpretation = [] as Coding[];
  tm.valueCodeableConcept = [] as Coding[];
  tm.valueQuantity = [] as mcode.Quantity[];
  tm.valueRatio = [] as mcode.Ratio[];

  // HER2+ Filter Attributes
  tm.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm.valueQuantity.push({ value: '3+', comparator: '=' } as mcode.Quantity);

  extractedMCODE.tumorMarker.push(tm);

  it('Test HER2+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and ER+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];

  // HER2+ Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
  // ER+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm2.valueQuantity.push({ value: '11', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);

  it('Test HER2+ and ER+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS_AND_ER_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-HER2+ and PR+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  extractedMCODE.tumorMarker = [] as mcode.TumorMarker[];
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];

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
    numerator: { value: '30', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity,
    denominator: { value: '2', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity
  } as mcode.Ratio);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);

  it('Test HER2+ and PR+ Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('HER2_PLUS_AND_PR_PLUS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER-+', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '2+', comparator: '=' } as mcode.Quantity);
  // ER+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm2.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'DET',
    display: 'N/A'
  } as Coding);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_AND_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];

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

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);

  it('Test PR+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('PR_PLUS_AND_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and HER2- and FGFR amplifications', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];
  const tm3: mcode.TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as mcode.Quantity[];
  tm3.valueRatio = [] as mcode.Ratio[];

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
  tm3.valueQuantity.push({ value: '1', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);
  extractedMCODE.tumorMarker.push(tm3);

  it('Test ER+ and HER- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });
});

describe('checkTumorMarkerFilterLogic-PR+ and HER- and FGFR Amplifications', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm: mcode.TumorMarker = {};
  tm.code = [] as Coding[];
  tm.interpretation = [] as Coding[];
  tm.valueCodeableConcept = [] as Coding[];
  tm.valueQuantity = [] as mcode.Quantity[];
  tm.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
  // PR+ Filter Attributes
  tm.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '10828004', display: 'N/A' } as Coding);
  // FGFR Amplifications Attributes
  tm.code.push({ system: 'http://loinc.info/sct', code: '42785-6', display: 'N/A' } as Coding); // Any code in 'Biomarker-FGFR'
  tm.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'POS',
    display: 'N/A'
  } as mcode.Quantity);

  extractedMCODE.tumorMarker.push(tm);

  it('Test PR+ and HER- and FGFR Amplifications Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS');
  });
});

describe('checkTumorMarkerFilterLogic-ER+ and PR+ and HER2-', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];
  const tm3: mcode.TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as mcode.Quantity[];
  tm3.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueCodeableConcept.push({ system: 'http://snomed.info/sct', code: '260385009', display: 'N/A' } as Coding);
  // PR+ Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueRatio.push({
    numerator: { value: '100', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity,
    denominator: { value: '3', comparator: '>=', unit: '%', code: '%' } as mcode.Quantity
  } as mcode.Ratio);
  // ER+ Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'H',
    display: 'N/A'
  } as Coding);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);
  extractedMCODE.tumorMarker.push(tm3);

  it('Test ER+ and PR+ and HER2- Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('ER_PLUS_PR_PLUS_HER2_MINUS');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];
  const tm3: mcode.TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as mcode.Quantity[];
  tm3.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '2+', comparator: '=' } as mcode.Quantity);
  // PR- Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueRatio.push({
    numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as mcode.Quantity,
    denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as mcode.Quantity
  } as mcode.Ratio);
  // ER- Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'N',
    display: 'N/A'
  } as Coding);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);
  extractedMCODE.tumorMarker.push(tm3);

  it('Test Triple negative Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative-10', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];
  const tm3: mcode.TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as mcode.Quantity[];
  tm3.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '1', comparator: '=' } as mcode.Quantity);
  // PR- Filter Attributes
  tm2.code.push({ system: 'http://loinc.info/sct', code: '85339-0', display: 'N/A' } as Coding); // Any code in 'Biomarker-PR'
  tm2.valueQuantity.push({ value: '9', comparator: '<', unit: '%', code: '%' } as mcode.Quantity);
  // ER- Filter Attributes
  tm3.code.push({ system: 'http://loinc.info/sct', code: '85337-4', display: 'N/A' } as Coding); // Any code in 'Biomarker-ER'
  tm3.interpretation.push({
    system: 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html',
    code: 'N',
    display: 'N/A'
  } as Coding);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);
  extractedMCODE.tumorMarker.push(tm3);

  it('Test Triple negative-10 Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE_MINUS_10');
  });
});

describe('checkTumorMarkerFilterLogic-Triple negative and RB Positive', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];
  const tm2: mcode.TumorMarker = {};
  tm2.code = [] as Coding[];
  tm2.interpretation = [] as Coding[];
  tm2.valueCodeableConcept = [] as Coding[];
  tm2.valueQuantity = [] as mcode.Quantity[];
  tm2.valueRatio = [] as mcode.Ratio[];
  const tm3: mcode.TumorMarker = {};
  tm3.code = [] as Coding[];
  tm3.interpretation = [] as Coding[];
  tm3.valueCodeableConcept = [] as Coding[];
  tm3.valueQuantity = [] as mcode.Quantity[];
  tm3.valueRatio = [] as mcode.Ratio[];
  const tm4: mcode.TumorMarker = {};
  tm4.code = [] as Coding[];
  tm4.interpretation = [] as Coding[];
  tm4.valueCodeableConcept = [] as Coding[];
  tm4.valueQuantity = [] as mcode.Quantity[];
  tm4.valueRatio = [] as mcode.Ratio[];

  // HER2- Filter Attributes
  tm1.code.push({ system: 'http://loinc.info/sct', code: '32996-1', display: 'N/A' } as Coding); // Any code in 'Biomarker-HER2'
  tm1.valueQuantity.push({ value: '1', comparator: '=' } as mcode.Quantity);
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
  tm4.valueQuantity.push({ value: '51', comparator: '>', unit: '%', code: '%' } as mcode.Quantity);

  extractedMCODE.tumorMarker.push(tm1);
  extractedMCODE.tumorMarker.push(tm2);
  extractedMCODE.tumorMarker.push(tm3);
  extractedMCODE.tumorMarker.push(tm4);

  it('Test Triple negative and RB Positive Filter', () => {
    expect(extractedMCODE.getTumorMarkerValue()).toBe('TRIPLE_NEGATIVE_AND_RB_POSITIVE');
  });
});

describe('Ratio and Quantity Error Tests', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);
  const tm1: mcode.TumorMarker = {};
  tm1.code = [] as Coding[];
  tm1.interpretation = [] as Coding[];
  tm1.valueCodeableConcept = [] as Coding[];
  tm1.valueQuantity = [] as mcode.Quantity[];
  tm1.valueRatio = [] as mcode.Ratio[];

  // Invalid Operator
  tm1.valueQuantity.push({ value: '51', comparator: '!=', unit: '%', code: '%' } as mcode.Quantity);
  // Invalid Operator
  tm1.valueRatio.push({
    numerator: { value: '1', comparator: '<', unit: '%', code: '%' } as mcode.Quantity,
    denominator: { value: '110', comparator: '<', unit: '%', code: '%' } as mcode.Quantity
  } as mcode.Ratio);

  it('Test Quantity Error', () => {
    expect(extractedMCODE.quantityMatch(3, '%', [10], '<')).toBe(false);
  });

  it('Test Ratio Error', () => {
    expect(
      extractedMCODE.ratioMatch(
        { value: '1', comparator: '<', unit: '%', code: '%' } as mcode.Quantity,
        { value: '1', comparator: '<', unit: '%', code: '%' } as mcode.Quantity,
        10,
        '<'
      )
    ).toBe(false);
  });
});

describe('checkAgeFilterLogic', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);

  it('Test Age is over 18 Filter', () => {
    extractedMCODE.birthDate = '2000-06-11';
    expect(extractedMCODE.getAgeValue()).toBe('18_OR_OVER');
  });

  it('Test Age is under 18 Filter', () => {
    extractedMCODE.birthDate = '2020-06-11';
    expect(extractedMCODE.getAgeValue()).toBe('UNDER_18');
  });
});

describe('NotSureTests', () => {
  // Initialize
  const patientBundle = null;
  const extractedMCODE = new mcode.extractedMCODE(patientBundle);

  it('Test NOT_SURE returns for null inputs', () => {
    expect(extractedMCODE.getPrimaryCancerValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getSecondaryCancerValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getHistologyMorphologyValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getMedicationStatementValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getRadiationProcedureValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getSurgicalProcedureValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getStageValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getTumorMarkerValue()).toBe('NOT_SURE');
    expect(extractedMCODE.getAgeValue()).toBe('NOT_SURE');
  });
});
