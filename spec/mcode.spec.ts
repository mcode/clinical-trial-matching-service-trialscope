import * as mcode from '../src/mcode';
import { Coding } from '../src/mcode';
import { PrimaryCancerCondition } from '../src/mcode';
import { SecondaryCancerCondition } from '../src/mcode';

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

describe('checkStageFilterLogic-Non-invasive', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Non-invasive Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '261645004', display: 'N/A'} as Coding; // Any code in 'Stage-0'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Non-invasive Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("NON_INVASIVE");
  });
});

describe('checkStageFilterLogic-Locally advanced', () => {
  // Initialize
  const patientBundle = null;
  let extractedMCODE = new mcode.extractedMCODE(patientBundle);
  let tnmPathological: Coding[] = new Array();

  // Locally advanced Filter Attributes
  tnmPathological[0] = {system: 'snomed', code: '261640009', display: 'N/A'} as Coding; // Any code in 'Stage-3'

  extractedMCODE.TNMPathologicalStageGroup = tnmPathological;

  it('Test Locally advanced Filter', () => {
    expect(extractedMCODE.getStageValue()).toBe("LOCALLY_ADVANCED");
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