
import profile_system_codes_json from '../data/profile-system-codes.json';
import { CancerGeneticVariant, CodeMapper, CodeSystemEnum, MappingLogic, Quantity, TumorMarker } from 'clinical-trial-matching-service';

const profile_system_codes = profile_system_codes_json;

export type FHIRPath = string;

export class TrialscopeMappingLogic extends MappingLogic {

  /**
   * The code mapping object that maps profiles to codes.
   */
     static codeMapper = new CodeMapper(profile_system_codes)

  // Primary Cancer Value
  getPrimaryCancerValues(): string {

    const extractedPrimaryCancerConditions = this.getExtractedPrimaryCancerConditions();
    const extractedTNMclinicalStageGroup = this.getExtractedTNMclinicalStageGroup();
    const extractedTNMpathologicalStageGroup = this.getExtractedTNMpathologicalStageGroup();

    if (extractedPrimaryCancerConditions.length == 0) {
      return 'NOT_SURE';
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerConditions = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyMorphologyBehaviors = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      // 3. Invasive Breast Cancer and Recurrent
      if (
        (histologyMorphologyBehaviors.includes('Morphology-Invasive')
        ) ||
        primaryCancerConditions.includes('Cancer-Invasive-Breast') &&
        primaryCancerConditions.includes('Cancer-Breast') &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'recurrence')
      ) {
        return 'INVASIVE_BREAST_CANCER_AND_RECURRENT';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerConditions = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      // 4. Locally Recurrent
      if (
        primaryCancerConditions.includes('Cancer-Breast') &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'recurrence')
      ) {
        return 'LOCALLY_RECURRENT';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerConditions = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      // 1. Breast Cancer
      if (primaryCancerConditions.includes('Cancer-Breast')) {
        return 'BREAST_CANCER';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerConditions = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      let tnmStageGroups = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMclinicalStageGroup);
      tnmStageGroups = tnmStageGroups.concat(TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMpathologicalStageGroup));
      // 2. Concomitant invasive malignancies
      if (
        (!primaryCancerConditions.includes('Cancer-Breast')) &&
        primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active') &&
        this.listIncludesCodes(tnmStageGroups, 'Stage-1', 'Stage-2', 'Stage-3', 'Stage-4')
      ) {
        return 'CONCOMITANT_INVASIVE_MALIGNANCIES';
      }
    }
    // Cycle through each of the primary cancer objects and check that they satisfy this priority requirement.
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerConditions = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      let tnmStageGroups = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMclinicalStageGroup);
      tnmStageGroups = tnmStageGroups.concat(TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMpathologicalStageGroup));
      // 5. Other malignancy - except skin or cervical
      if (
        ((!primaryCancerConditions.includes('Cancer-Breast')) &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')) ||
        ((!primaryCancerConditions.includes('Cancer-Cervical')) &&
          primaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active') &&
          (!tnmStageGroups.includes('Stage-0')))
      ) {
        return 'OTHER_MALIGNANCY_EXCEPT_SKIN_OR_CERVICAL';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  // Secondary Cancer Value
  getSecondaryCancerValues(): string {

    const extractedPrimaryCancerConditions = this.getExtractedPrimaryCancerConditions();
    const primaryCancerConditionCodings = TrialscopeMappingLogic.codeMapper.extractCodeMappings([].concat(...extractedPrimaryCancerConditions.map(pcc => pcc.coding)));
    const histologyMorphologyBehaviors = TrialscopeMappingLogic.codeMapper.extractCodeMappings([].concat(...extractedPrimaryCancerConditions.map(pcc => pcc.histologyMorphologyBehavior)));
    const extractedSecondaryCancerConditions = this.getExtractedSecondaryCancerConditions();
    const extractedTNMclinicalStageGroup = this.getExtractedTNMclinicalStageGroup();
    const extractedTNMpathologicalStageGroup = this.getExtractedTNMpathologicalStageGroup();
    let tnmStageGroups = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMclinicalStageGroup);
    tnmStageGroups = tnmStageGroups.concat(TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMpathologicalStageGroup));

    if (extractedSecondaryCancerConditions.length == 0) {
      return 'NOT_SURE';
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of extractedSecondaryCancerConditions) {
      // 2. Invasive Breast Cancer and Metastatics
      if (
        (histologyMorphologyBehaviors.includes('Morphology-Invasive')
        ) && (
          primaryCancerConditionCodings.includes('Cancer-Breast') ||
          primaryCancerConditionCodings.includes('Cancer-Invasive-Breast')
          ) &&
        (secondaryCancerCondition.coding.length != 0 ||
          tnmStageGroups.includes('Stage-4'))
      ) {
        return 'INVASIVE_BREAST_CANCER_AND_METASTATIC';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of extractedSecondaryCancerConditions) {
      const secondaryCancerConditionValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(secondaryCancerCondition.coding);
      // 1. Brain Metastasis
      if (
        secondaryCancerConditionValues.includes('Metastasis-Brain') &&
        secondaryCancerCondition.clinicalStatus.some((clinStat) => clinStat.code == 'active')
      ) {
        return 'BRAIN_METASTASIS';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of extractedSecondaryCancerConditions) {
      // Leptomeningeal metastatic disease
      if (
        secondaryCancerCondition.bodySite.some(
          (bodySite) => (CodeMapper.codesEqual(bodySite, CodeSystemEnum.SNOMED, '8935007'))
        )
      ) {
        return 'LEPTOMENINGEAL_METASTATIC_DISEASE';
      }
    }
    // Cycle through each of the secondary cancer objects and check that they satisfy different requirements.
    for (const secondaryCancerCondition of extractedSecondaryCancerConditions) {
      // Metastatic
      if (
        secondaryCancerCondition.coding.length != 0 ||
        tnmStageGroups.includes('Stage-4')
      ) {
        return 'METASTATIC';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  // Histology Morphology Value
  getHistologyMorphologyValue(): string {

    const extractedPrimaryCancerConditions = this.getExtractedPrimaryCancerConditions();
    const extractedTNMclinicalStageGroup = this.getExtractedTNMclinicalStageGroup();
    const extractedTNMpathologicalStageGroup = this.getExtractedTNMpathologicalStageGroup();

    const tnmStageMappings = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMclinicalStageGroup);
    tnmStageMappings.push(... TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMpathologicalStageGroup));

    if (
      extractedPrimaryCancerConditions.length < 1 &&
      extractedTNMclinicalStageGroup.length < 1 &&
      extractedTNMpathologicalStageGroup.length < 1
    ) {
      return 'NOT_SURE';
    }
    // Invasive Mammory Carcinoma
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        (primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Invas_Carc_Mix')) ||
        (primaryCancerCondition.coding.some((coding) => (CodeMapper.codesEqual(coding, CodeSystemEnum.SNOMED, '444604002'))) &&
        !tnmStageMappings.includes('Stage-0'))
      ) {
        return 'INVASIVE_MAMMORY_CARCINOMA';
      }
    }
    // Invasive Ductal Carcinoma
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        (primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Invas_Duct_Carc')) ||
        primaryCancerValues.includes('Cancer-Invas_Duct_Carc')
      ) {
        return 'INVASIVE_DUCTAL_CARCINOMA';
      }
    }
    // Invasive Lobular Carcinoma
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      if (
        (primaryCancerValues.includes('Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some(
            (histMorphBehav) => (CodeMapper.codesEqual(histMorphBehav, CodeSystemEnum.SNOMED, '443757001'))) ||
            primaryCancerValues.includes('Cancer-Invas_Lob_Carc'))
      {
        return 'INVASIVE_LOBULAR_CARCINOMA';
      }
    }
    // Ductual Carcinoma in Situ
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Duct_Car_In_Situ')) {
        return 'DUCTAL_CARCINOMA_IN_SITU';
      }
    }
    // Non-Inflammatory, Invasive
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        ((primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Invasive')) ||
          primaryCancerValues.includes('Cancer-Invasive-Breast')) &&
        ((primaryCancerValues.includes('Cancer-Breast') &&
        (histologyValues.includes('Morphology-Inflammatory')
          )) ||
          primaryCancerValues.includes('Cancer-Inflammatory'))) {
        return 'NON-INFLAMMATORY_INVASIVE';
      }
    }
    // Invasive Carcinoma
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        (primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Invasive-Carcinoma')) ||
        primaryCancerValues.includes('Cancer-Invasive-Carcinoma')) {
        return 'INVASIVE_CARCINOMA';
      }
    }
    // Invasive Breast Cancer
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        (primaryCancerValues.includes('Cancer-Breast') &&
        histologyValues.includes('Morphology-Invasive')
          ) ||
          primaryCancerValues.includes('Cancer-Invasive-Breast')) {
        return 'INVASIVE_BREAST_CANCER';
      }
    }
    // Inflammatory
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      if (
        (primaryCancerValues.includes('Cancer-Breast')) &&
          primaryCancerCondition.histologyMorphologyBehavior.some(
            (histMorphBehav) => (CodeMapper.codesEqual(histMorphBehav, CodeSystemEnum.SNOMED, '32968003'))
          ) ||
          primaryCancerValues.includes('Cancer-Inflammatory')) {
        return 'INFLAMMATORY';
      }
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  getStageValues(): string[] {

    const extractedPrimaryCancerConditions = this.getExtractedPrimaryCancerConditions();
    const extractedTNMclinicalStageGroup = this.getExtractedTNMclinicalStageGroup();
    const extractedTNMpathologicalStageGroup = this.getExtractedTNMpathologicalStageGroup();

    const tnmStageMappings = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMclinicalStageGroup);
    tnmStageMappings.push(... TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedTNMpathologicalStageGroup));

    const stageValues:string[] = [];
    if (
      extractedPrimaryCancerConditions.length == 0 &&
      tnmStageMappings.length == 0
    ) {
      return ['NOT_SURE', 'NOT_SURE'];
    }
    // Invasive Breast Cancer and Locally Advanced
    for (const primaryCancerCondition of extractedPrimaryCancerConditions) {
      const primaryCancerValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.coding);
      const histologyValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(primaryCancerCondition.histologyMorphologyBehavior);
      if (
        ((histologyValues.includes('Morphology-Invasive') &&
        primaryCancerValues.includes('Cancer-Breast')) ||
        primaryCancerValues.includes('Cancer-Invasive-Breast')) &&
        (this.listIncludesCodes(tnmStageMappings, 'Stage-3', 'Stage-4'))) {
        stageValues.push('INVASIVE_BREAST_CANCER_AND_LOCALLY_ADVANCED');
      }
    }
    // Stage 0
    if (tnmStageMappings.includes('Stage-0')) {
      // This also meets requirements for NON_INVASIVE.
      stageValues.push('ZERO');
    }
    // Stage 1
    if (tnmStageMappings.includes('Stage-1')) {
      stageValues.push('ONE');
    }
    // Stage 2
    if (tnmStageMappings.includes('Stage-2')) {
      stageValues.push('TWO');
    }
    // Stage 3
    if (tnmStageMappings.includes('Stage-3')) {
      // This also meets requirements for LOCALLY_ADVANCED.
      stageValues.push('THREE');
    }
    // Stage 4
    if (tnmStageMappings.includes('Stage-4')) {
      stageValues.push('FOUR');
    }

    // Make sure the array has at least 2 values in it. If it does not, fill with NOT_SURE values.
    if (stageValues.length < 2) {
      for (let i = stageValues.length; i <= 2; i++) {
        stageValues.push('NOT_SURE');
      }
    }
    return stageValues;
  }
  // Age (18 or younger/older)
  getAgeValue(): string {

    const extractedBirthDate = this.getExtractedBirthDate();
    const checkDate: Date = new Date(extractedBirthDate);

    if (extractedBirthDate == 'NA' || extractedBirthDate == null || extractedBirthDate == undefined || extractedBirthDate == 'N/A' || checkDate.getFullYear() < 1) {
      return 'NOT_SURE';
    }
    // Birthdate is in format: '1966-08-03'
    const today: Date = new Date();
    // Time Difference (Milliseconds)
    const millisecondsAge = today.getTime() - checkDate.getTime();
    const milliseconds18Years = 1000 * 60 * 60 * 24 * 365 * 18;
    return millisecondsAge > milliseconds18Years ? '18_OR_OVER' : 'UNDER_18';
  }
  
  getTumorMarkerValues(): string {

    const extractedTumorMarkers = this.getExtractedTumorMarkers();
    const extractedCancerGeneticVariants = this.getExtractedCancerGeneticVariants();

    if (extractedTumorMarkers.length == 0 && extractedCancerGeneticVariants.length == 0) {
      return 'NOT_SURE';
    }

    // TRIPLE_NEGATIVE_AND_RB_POSITIVE
    if (
      this.isHER2Negative(extractedTumorMarkers[0], ['0', '1', '2', '1+', '2+']) &&
      extractedTumorMarkers.some((tm) => this.isPRNegative(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isERNegative(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isRBPositive(tm, 50))
    ) {
      return 'TRIPLE_NEGATIVE_AND_RB_POSITIVE';
    }
    // Triple Negative
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isPRNegative(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isERNegative(tm, 1))
    ) {
      return 'TRIPLE_NEGATIVE';
    }
    // Triple Negative-10
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '1+'])) &&
      extractedTumorMarkers.some((tm) => this.isPRNegative(tm, 10)) &&
      extractedTumorMarkers.some((tm) => this.isERNegative(tm, 10))
    ) {
      return 'TRIPLE_NEGATIVE_MINUS_10';
    }
    // ER+ PR+ HER2-
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isPRPositive(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isERPositive(tm, 1))
    ) {
      return 'ER_PLUS_PR_PLUS_HER2_MINUS';
    }
    // PR+ and HER2- and FGFR amplifications
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isPRPositive(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isFGFRAmplification(tm, 1))
    ) {
      return 'PR_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS';
    }
    // ER+ and HER2- and FGFR amplifications
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isERPositive(tm, 1)) &&
      extractedTumorMarkers.some((tm) => this.isFGFRAmplification(tm, 1))
    ) {
      return 'ER_PLUS_AND_HER2_MINUS_AND_FGFR_AMPLIFICATIONS';
    }
    // PR+ and HER2-
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isPRPositive(tm, 1))
    ) {
      return 'PR_PLUS_AND_HER2_MINUS';
    }
    // ER+ and HER2-
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+'])) &&
      extractedTumorMarkers.some((tm) => this.isERPositive(tm, 1))
    ) {
      return 'ER_PLUS_AND_HER2_MINUS';
    }
    // HER2+ and PR+
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Positive(tm)) &&
      extractedTumorMarkers.some((tm) => this.isPRPositive(tm, 10))
    ) {
      return 'HER2_PLUS_AND_PR_PLUS';
    }
    // HER2+ and ER+
    if (
      extractedTumorMarkers.some((tm) => this.isHER2Positive(tm)) &&
      extractedTumorMarkers.some((tm) => this.isERPositive(tm, 10))
    ) {
      return 'HER2_PLUS_AND_ER_PLUS';
    }
    // HER2+
    if (extractedTumorMarkers.some((tm) => this.isHER2Positive(tm))) {
      return 'HER2_PLUS';
    }
    // PR+
    if (extractedTumorMarkers.some((tm) => this.isPRPositive(tm, 10))) {
      return 'PR_PLUS';
    }
    // ER+
    if (extractedTumorMarkers.some((tm) => this.isERPositive(tm, 10))) {
      return 'ER_PLUS';
    }
    // HER2-
    if (extractedTumorMarkers.some((tm) => this.isHER2Negative(tm, ['0', '1', '2', '1+', '2+']))) {
      return 'HER2_MINUS';
    }
    // BRCA1-Germline
    if (
      extractedCancerGeneticVariants.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1100') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.LOINC, 'LA6683-2'))))
      )
    ) {
      return 'BRCA1-GERMLINE';
    }
    // BRCA2-Germline
    if (
      extractedCancerGeneticVariants.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1101') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.LOINC, 'LA6683-2'))))
      )
    ) {
      return 'BRCA2-GERMLINE';
    }
    // BRCA1-somatic
    if (
      extractedCancerGeneticVariants.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1100') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.LOINC, 'LA6684-0'))
            )
          )
      )
    ) {
      return 'BRCA1-SOMATIC';
    }
    // BRCA2-somatic
    if (
      extractedCancerGeneticVariants.some(
        (cancGenVar) =>
          this.isBRCA(cancGenVar, '1101') &&
          cancGenVar.component.genomicsSourceClass.some((genSourceClass) =>
            genSourceClass.valueCodeableConcept.coding.some(
              (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.LOINC, 'LA6684-0'))
            )
          )
      )
    ) {
      return 'BRCA2-SOMATIC';
    }
    // BRCA1
    if (extractedCancerGeneticVariants.some((cancGenVar) => this.isBRCA(cancGenVar, '1100'))) {
      return 'BRCA1';
    }
    // BRCA2
    if (extractedCancerGeneticVariants.some((cancGenVar) => this.isBRCA(cancGenVar, '1101'))) {
      return 'BRCA2';
    }
    // None of the conditions are satisfied.
    return 'NOT_SURE';
  }
  isBRCA(cancGenVar: CancerGeneticVariant, brcaCode: string): boolean {
    return (
      cancGenVar.component.geneStudied.some((geneStudied) =>
        geneStudied.valueCodeableConcept.coding.some(
          (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HGNC, brcaCode))
        )
      ) &&
      (cancGenVar.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.LOINC, 'LA9633-4')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'POS'))
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
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-HER2') &&
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'POS'))
      ) ||
        tumorMarker.interpretation.some((interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html') ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, ['3', '3+'], '=')
        )
    ));
  }
  isHER2Negative(tumorMarker: TumorMarker, quantities: string[]): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueCodeableConcept.some((valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '260385009')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'NEG'))
      ) ||
        tumorMarker.interpretation.some((interp) =>
            (interp.code == 'L' || interp.code == 'N' || interp.code == 'NEG' || interp.code == 'ND') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) || // Information on Interpretation values can be found at: http://hl7.org/fhir/R4/valueset-observation-interpretation.html
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, quantities, '='))) &&
          TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-HER2')
          );
  }
  isPRPositive(tumorMarker: TumorMarker, metric: number): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'POS'))
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
        TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-PR')
    );
  }
  isPRNegative(tumorMarker: TumorMarker, metric: number): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '260385009')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'NEG'))
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
        TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-PR')
    );
  }
  isERPositive(tumorMarker: TumorMarker, metric: number): boolean {
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'POS'))
      ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>=')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, [metric], '>=', '%'))) &&
        TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-ER')
    );
  }
  isERNegative(tumorMarker: TumorMarker, metric: number): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) =>
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '260385009')) ||
          (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'NEG'))
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
            this.quantityMatch(valQuant.value, valQuant.code, [0], '='))) &&
            TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-ER')
    );
  }
  isFGFRAmplification(tumorMarker: TumorMarker, metric: number): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueCodeableConcept.some(
        (valCodeCon) => (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004'))
      ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>=')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        ) ||
        tumorMarker.valueQuantity.some((valQuant) =>
          this.quantityMatch(valQuant.value, valQuant.code, [metric], '>=', '%'))) &&
          TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-FGFR')
    );
  }
  isRBPositive(tumorMarker: TumorMarker, metric: number): boolean {
    if(tumorMarker == undefined) {
      // There is no tumor marker to check, return false.
      return false;
    }
    return (
      (tumorMarker.valueQuantity.some((valQuant) =>
        this.quantityMatch(valQuant.value, valQuant.code, [metric], '>', '%')
      ) ||
        tumorMarker.valueCodeableConcept.some(
          (valCodeCon) =>
            (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.SNOMED, '10828004')) ||
            (CodeMapper.codesEqual(valCodeCon, CodeSystemEnum.HL7, 'POS'))
        ) ||
        tumorMarker.valueRatio.some((valRat) => this.ratioMatch(valRat.numerator, valRat.denominator, metric, '>')) ||
        tumorMarker.interpretation.some(
          (interp) =>
            (interp.code == 'POS' || interp.code == 'DET' || interp.code == 'H') &&
            interp.system == 'http://hl7.org/fhir/R4/valueset-observation-interpretation.html'
        )) &&
        TrialscopeMappingLogic.codeMapper.extractCodeMappings(tumorMarker.coding).includes('Biomarker-RB')
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
      return metricValues.some((value: string | number) => quantValue == value);
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
  getRadiationProcedureValues(): string {

    const extractedRadiationProcedures = this.getExtractedCancerRelatedRadiationProcedures();

    if (extractedRadiationProcedures.length == 0) {
      return 'NOT_SURE';
    }
    for (const cancerRelatedRadiationProcedure of extractedRadiationProcedures) {
      const radiationProcedureValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(cancerRelatedRadiationProcedure.coding);
      if (radiationProcedureValues.includes('Treatment-SRS-Brain')) {
        return 'SRS';
      }
    }
    for (const cancerRelatedRadiationProcedure of extractedRadiationProcedures) {
      if (
        cancerRelatedRadiationProcedure.coding.some(
          (coding) => (CodeMapper.codesEqual(coding, CodeSystemEnum.SNOMED, '108290001'))
        ) &&
        cancerRelatedRadiationProcedure.bodySite.some(
          (coding) =>
            (CodeMapper.codesEqual(coding, CodeSystemEnum.SNOMED, '12738006')) ||
            (CodeMapper.codesEqual(coding, CodeSystemEnum.SNOMED, '119235005'))
        )
      ) {
        return 'WBRT';
      }
    }
    return 'RADIATION_THERAPY';
  }
  getSurgicalProcedureValues(): string {

    const extractedSurgicalProcedures = this.getExtractedCancerRelatedSurgicalProcedures();
    const surgicalProcedureValeus = TrialscopeMappingLogic.codeMapper.extractCodeMappings([].concat(...extractedSurgicalProcedures.map(sp => sp.coding)));

    if (extractedSurgicalProcedures.length == 0) {
      return 'NOT_SURE';
    }
    if (surgicalProcedureValeus.includes('Treatment-Resection-Brain')) {
      return 'RESECTION';
    } else if (surgicalProcedureValeus.includes('Treatment-Splenectomy')) {
      return 'SPLENECTOMY';
    } else if (extractedSurgicalProcedures.some(
        (surgicalProcedures) => surgicalProcedures.coding.some(coding => (CodeMapper.codesEqual(coding, CodeSystemEnum.SNOMED, '58390007'))))) {
      return 'BONE_MARROW_TRANSPLANT';
    } else if (surgicalProcedureValeus.includes('Treatment-Organ_Transplant')) {
      return 'ORGAN_TRANSPLANT';
    } else {
      return 'NOT_SURE';
    }
  }
  getMedicationStatementValues(): string[] {

    const extractedMedications = this.getExtractedCancerRelatedMedicationStatements();
    const mappedMedicationValues = TrialscopeMappingLogic.codeMapper.extractCodeMappings(extractedMedications);

    const medicationValues:string[] = [];

    if (mappedMedicationValues.length == 0) {
      return ['NOT_SURE', 'NOT_SURE', 'NOT_SURE'];
    }
    if (
      mappedMedicationValues.includes('Treatment-Trastuzumab') &&
      mappedMedicationValues.includes('Treatment-Pertuzumab') &&
      mappedMedicationValues.includes('Treatment-T-DM1')
    ) {
      medicationValues.push('DRUGCOMBO_1');
    } if (
      (mappedMedicationValues.includes('Treatment-CDK4_6_Inhibtor') ||
      mappedMedicationValues.includes('Treatment-mTOR_Inhibitor')) &&
      mappedMedicationValues.includes('Treatment-Endocrine_Therapy')
    ) {
      medicationValues.push('CDK4_6_MTOR_AND_ENDOCRINE');
    } if (mappedMedicationValues.includes('Treatment-T-DM1')) {
      medicationValues.push('T_DM1');
    } if (mappedMedicationValues.includes('Treatment-CDK4_6_Inhibtor')) {
      medicationValues.push('CDK4_6_INHIBITOR');
    } if (mappedMedicationValues.includes('Treatment-Pembrolizumab')) {
      medicationValues.push('PEMBROLIZUMAB');
    } if (mappedMedicationValues.includes('POLY_ICLC')) {
      medicationValues.push('POLY_ICLC');
    } if (mappedMedicationValues.includes('Treatment-mTOR_Inhibitor')){
      medicationValues.push('MTOR_INHIBITOR');
    } if (mappedMedicationValues.includes('Treatment-Endocrine_Therapy')){
      medicationValues.push('CONCURRENT_ENDOCRINE_THERAPY');
    } if (mappedMedicationValues.includes('Treatment-anti-Androgen')){
      medicationValues.push('ANTI_ANDROGEN');
    } if (mappedMedicationValues.includes('Treatment-anti-HER2')){
      medicationValues.push('ANTI_HER2');
    } if (mappedMedicationValues.includes('Treatment-Tyrosine_Kinase_Inhib')){
      medicationValues.push('TYROSINE_KINASE_INHIBITOR');
    } if (mappedMedicationValues.includes('Treatment-P13K_Inhibitor')){
      medicationValues.push('P13K_INHIBITOR');
    } if (mappedMedicationValues.includes('Treatment-anti-PD1,PDL1,PDL2')){
      medicationValues.push('ANTI_PD');
    } if (mappedMedicationValues.includes('Treatment-anti-PARP')){
      medicationValues.push('ANTI_PARP');
    } if (mappedMedicationValues.includes('Treatment-SG')){
      medicationValues.push('SG');
    } if (mappedMedicationValues.includes('Treatment-anti-topoisomerase-1')){
      medicationValues.push('ANTI-TOPOISOMERASE-1');
    } if (mappedMedicationValues.includes('Treatment-anti-CTLA4')){
      medicationValues.push('ANTI-CTLA4');
    } if (mappedMedicationValues.includes('Treatment-anti-CD40')){
      medicationValues.push('ANTI-CD40');
    } if (mappedMedicationValues.includes('Treatment-Trastuz_and_Pertuz')){
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

    const extractedEcog = this.getExtractedEcogPerformaceStatus();

    if(extractedEcog == -1) {
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

    return ecogScoreMap.get(extractedEcog);
  }

  // Get Karnofsky Score
  getKarnofskyScore(): string {

    const extractedKarnofsky = this.getExtractedKarnofskyPerformanceStatus();

    if(extractedKarnofsky == -1) {
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

    return karnofskyScoreMap.get(extractedKarnofsky);
  }

  listIncludesCodes(inputList: string[], ...checkValues: string[]): boolean {
    return checkValues.some(currentValue => inputList.includes(currentValue));
  }
}
