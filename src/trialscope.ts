/**
 * Module for running queries via TrialScope
 */
import { ClinicalTrialGovService, ServerError } from 'clinical-trial-matching-service';
import https from 'https';
import { IncomingMessage } from 'http';
import { convertTrialScopeToResearchStudy } from './research-study-mapping';
import { ClientError, SearchSet, fhir } from 'clinical-trial-matching-service';
import * as mcode from './mcode';

/**
 * Maps FHIR phases to TrialScope phases.
 */
const TRIALSCOPE_PHASES: Record<string, string | null> = {
  'n-a': null,
  'early-phase-1': null,
  'phase-1': 'PHASE_1',
  // FIXME: Or at least verify this works. GraphQL doesn't allow searching for
  // multiple values in a field natively. Verify this will find phase 1/phase 2
  // trials.
  'phase-1-phase-2': 'PHASE_1',
  'phase-2': 'PHASE_2',
  // FIXME: Or at least verify this works. See phase-1-phase-2: same problem.
  'phase-2-phase-3': 'PHASE_2',
  'phase-3': 'PHASE_3',
  'phase-4': 'PHASE_4'
};

const TRIALSCOPE_STATUSES: Record<string, string | null> = {
  'active': 'RECRUITING',
  'administratively-completed': 'TERMINATED',
  // It's unclear if this mapping is correct
  'approved': 'RECRUITING',
  'closed-to-accrual': 'ACTIVE_NOT_RECRUITING',
  // both 'closed-to-accrual-and-intervention' and 'completed' have the same
  // description in FHIR 4 (shrug)
  'closed-to-accrual-and-intervention': 'COMPLETED',
  'completed': 'COMPLETED',
  // There doesn't appear to be a corresponding mapping, TrialScope may simply
  // not return disapproved clinical trials
  'disapproved': null,
  // Unclear if this is a good mapping
  'in-review': 'NOT_YET_RECRUITING',
  // It's unclear if this mapping is correct
  'temporarily-closed-to-accrual': 'ACTIVE_NOT_RECRUITING',
  'temporarily-closed-to-accrual-and-intervention': 'SUSPENDED',
  'withdrawn': 'WITHDRAWN'
  // NOT MAPPED:
  // ENROLLING_BY_INVITATION
  // TERMINATED
  // UNKNOWN
};

export class TrialScopeServerError extends ServerError {
  constructor(message: string, public result: IncomingMessage, public body: string) {
    super(message);
  }
}

export interface TrialScopeResponse {
  data: {
    advancedMatches: {
      totalCount: number;
      edges: { node: TrialScopeTrial; cursor: string; matchQuality: string }[];
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
    };
  };
}

export function isTrialScopeResponse(o: unknown): o is TrialScopeResponse {
  if (typeof o !== 'object' || o === null) {
    return false;
  }
  if ('data' in o && typeof o['data'] === 'object' && o['data'] !== null) {
    const possibleResponse = o as TrialScopeResponse;
    return (
      'advancedMatches' in possibleResponse.data &&
      typeof possibleResponse.data['advancedMatches'] === 'object' &&
      possibleResponse.data['advancedMatches'] !== null
    );
  } else {
    return false;
  }
}

export interface TrialScopeError {
  message: string;
  locations: {
    line: number;
    column: number;
  }[];
  path: string[];
  extensions: { [key: string]: unknown };
}

export interface TrialScopeErrorResponse {
  errors: TrialScopeError[];
}

export function isTrialScopeErrorResponse(o: unknown): o is TrialScopeErrorResponse {
  if (typeof o !== 'object' || o === null) {
    return false;
  }
  if ('errors' in o) {
    const possibleError = o as TrialScopeErrorResponse;
    if (!Array.isArray(possibleError.errors)) return false;
    // TODO (maybe): peak at the errors
    return true;
  } else {
    return false;
  }
}

export interface TrialScopeTrial {
  nctId?: string;
  title?: string;
  overallStatus?: string;
  phase?: string;
  studyType?: string;
  conditions?: string;
  keywords?: string;
  overallContactName?: string;
  overallContactPhone?: string;
  overallContactEmail?: string;
  countries?: string;
  detailedDescription?: string;
  officialTitle?: string;
  criteria?: string;
  sponsor?: string;
  overallOfficialName?: string;
  sites?: Site[];
}

export interface Site {
  facility?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  zipCode?: string;
}

function parsePhase(phase: string): string | null {
  if (phase in TRIALSCOPE_PHASES) {
    return TRIALSCOPE_PHASES[phase];
  } else {
    throw new ClientError(`Cannot parse phase: "${phase}"`);
  }
}

function parseRecruitmentStatus(status: string): string | null {
  if (status in TRIALSCOPE_STATUSES) {
    return TRIALSCOPE_STATUSES[status];
  } else {
    throw new ClientError(`Cannot parse recruitment status: "${status}"`);
  }
}

function parseMatchQuality(matchQuality: string): number {
  if (matchQuality == 'HIGH_LIKELIHOOD') {
    return 1;
  } else if (matchQuality == 'POSSIBLE') {
    return 0.5;
  } else {
    // matchQuality == 'POSSIBLE_NON_MATCH'
    return 0;
  }
}

/**
 * Object for storing the various parameters necessary for the TrialScope query
 * based on a patient bundle.
 */
export class TrialScopeQuery {
  //conditions = new Set<string>();
  zipCode?: string = null;
  travelRadius?: number = null;
  // Any is a "special" value here meaning "not specified"
  phase = 'any';
  recruitmentStatus: string | null = null;
  after?: string = null;
  first = 30;
  mcode?: {
    [key: string]: string;
    primaryCancer: string;
    secondaryCancer: string;
    histologyMorphology: string;
    stageFilterOne: string;
    stageFilterTwo: string;
    tumorMarker: string;
    radiationProcedure: string;
    surgicalProcedure: string;
    medicationStatementOne: string;
    medicationStatementTwo: string;
    medicationStatementThree: string;
  };
  /**
   * The fields that should be returned within the individual trial object.
   */
  trialFields = [
    'nctId',
    'title',
    'officialTitle',
    'conditions',
    'keywords',
    'gender',
    'description',
    'detailedDescription',
    'criteria',
    'sponsor',
    'overallContactName',
    'overallContactPhone',
    'overallContactEmail',
    'overallOfficialName',
    'overallStatus',
    'phase',
    'minimumAge',
    'studyType',
    'countries',
    'maximumAge'
  ];

  constructor(patientBundle: fhir.Bundle) {
    const extractedMCODE = new mcode.ExtractedMCODE(patientBundle);
    console.log(extractedMCODE);
    let stageValues = extractedMCODE.getStageValues();
    let medicationStatementValues = extractedMCODE.getMedicationStatementValues();
    this.mcode = {
      primaryCancer: extractedMCODE.getPrimaryCancerValue(),
      secondaryCancer: extractedMCODE.getSecondaryCancerValue(),
      histologyMorphology: extractedMCODE.getHistologyMorphologyValue(),
      stageFilterOne: stageValues[0],
      stageFilterTwo: stageValues[1],
      tumorMarker: extractedMCODE.getTumorMarkerValue(),
      radiationProcedure: extractedMCODE.getRadiationProcedureValue(),
      surgicalProcedure: extractedMCODE.getSurgicalProcedureValue(),
      medicationStatementOne: medicationStatementValues[0],
      medicationStatementTwo: medicationStatementValues[1],
      medicationStatementThree: medicationStatementValues[2],
    };
    console.log(this.mcode);
    for (const entry of patientBundle.entry) {
      if (!('resource' in entry)) {
        // Skip bad entries
        continue;
      }
      const resource = entry.resource;
      if (resource.resourceType === 'Parameters') {
        for (const parameter of resource.parameter) {
          if (parameter.name === 'zipCode') {
            this.zipCode = parameter.valueString;
          } else if (parameter.name === 'travelRadius') {
            this.travelRadius = parseFloat(parameter.valueString);
          } else if (parameter.name === 'phase') {
            this.phase = parsePhase(parameter.valueString);
          } else if (parameter.name === 'recruitmentStatus') {
            this.recruitmentStatus = parseRecruitmentStatus(parameter.valueString);
          }
        }
      }
    }
  }
  /**
   * Gets the set of mCode filters as an appropriate GraphQL block, such as
   * "{primaryCancer: BREAST_CANCER}"
   */
  getMCODEFilters(): string {
    const result: string[] = [];
    for (const k in this.mcode) {
      result.push(`${k}: ${this.mcode[k]}`);
    }
    return '{' + result.join(', ') + '}';
  }
  /**
   * Create a TrialScope query.
   * @return {string} the TrialScope GraphQL query
   */
  toQuery(): string {
    // mCODE Filters
    let advancedMatches = `mcode:${this.getMCODEFilters()},`;
    // Start of Base filters
    advancedMatches += `baseFilters: { zipCode: "${this.zipCode}"`;
    // Travel Radius
    if (this.travelRadius) {
      // FIXME: Veryify travel radius is a number
      advancedMatches += ',travelRadius: ' + this.travelRadius.toString();
    }
    // Phase
    if (this.phase !== 'any') {
      advancedMatches += ',phase:' + this.phase;
    }
    // Recruitment Status
    if (this.recruitmentStatus !== null) {
      advancedMatches += ',recruitmentStatus:' + this.recruitmentStatus;
    }
    advancedMatches += ' }';
    // Before and After
    if (this.first !== null) {
      advancedMatches += ', first: ' + this.first.toString();
    }
    if (this.after !== null) {
      advancedMatches += ', after: ' + JSON.stringify(this.after);
    }
    // prettier-ignore
    const query = `{ advancedMatches(${advancedMatches}) {` +
      'totalCount edges {' +
        'matchQuality ' +
        'node {' + this.trialFields.join(' ') +
          ' sites { ' +
            'facility contactName contactEmail contactPhone latitude longitude zipCode ' +
          '} ' +
        '} ' +
        'cursor ' +
      '} ' +
      'pageInfo { endCursor hasNextPage }' +
    '} }';
    return query;
  }
  toString(): string {
    return this.toQuery();
  }
}

export class TrialScopeQueryRunner {
  constructor(public endpoint: string, private token: string, private backupService: ClinicalTrialGovService) {}

  runQuery(patientBundle: fhir.Bundle): Promise<SearchSet> {
    // update for advanced matches query
    return new Promise<TrialScopeResponse>((resolve, reject) => {
      const query = new TrialScopeQuery(patientBundle);
      console.log(query);
      this.sendQuery(query.toQuery())
        .then((result) => {
          // Result is a parsed JSON object. See if we need to load more pages.
          const loadNextPage = (previousPage: TrialScopeResponse) => {
            query.after = previousPage.data.advancedMatches.pageInfo.endCursor;
            this.sendQuery(query.toQuery())
              .then((nextPage) => {
                // Append results.
                result.data.advancedMatches.edges.push(...nextPage.data.advancedMatches.edges);
                if (nextPage.data.advancedMatches.pageInfo.hasNextPage) {
                  // Keep going
                  loadNextPage(nextPage);
                } else {
                  resolve(result);
                }
              })
              .catch(reject);
          };
          if (result.data.advancedMatches.pageInfo.hasNextPage) {
            // Since this result object is the ultimate result, alter it to
            // pretend it doesn't have a next page
            result.data.advancedMatches.pageInfo.hasNextPage = false;
            loadNextPage(result);
          } else {
            resolve(result);
          }
        })
        .catch(reject);
    }).then<SearchSet>((trialscopeResponse) => {
      return this.convertToSearchSet(trialscopeResponse);
    });
  }

  /**
   * Convert a response to a searchset. This also fills in any missing data using the ClinicalTrialsGovService.
   * @param trialscopeResponse the response to convert
   * @returns a promise that will resolve to the converted search set
   *     (asynchronous lookups may be required to complete the search set)
   */
  convertToSearchSet(trialscopeResponse: TrialScopeResponse): Promise<SearchSet> {
    const searchSet = new SearchSet();
    const studies: fhir.ResearchStudy[] = [];
    let index = 0;
    for (const node of trialscopeResponse.data.advancedMatches.edges) {
      const trial: TrialScopeTrial = node.node;
      const study = convertTrialScopeToResearchStudy(trial, index);
      searchSet.addEntry(study, parseMatchQuality(node.matchQuality));
      studies.push(study);
      index++;
    }
    return this.backupService.updateResearchStudies(studies).then(() => {
      return searchSet;
    });
  }

  sendQuery(query: string): Promise<TrialScopeResponse> {
    return new Promise((resolve, reject) => {
      const body = Buffer.from(`{"query":${JSON.stringify(query)}}`, 'utf8');
      console.log(query);
      const request = https.request(
        this.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Content-Length': body.byteLength.toString(),
            'Authorization': 'Bearer ' + this.token
          }
        },
        (result) => {
          let responseBody = '';
          result.on('data', (chunk) => {
            responseBody += chunk;
          });
          result.on('end', () => {
            if (result.statusCode === 200) {
              try {
                const json = JSON.parse(responseBody) as unknown;
                if (isTrialScopeResponse(json)) {
                  resolve(json);
                } else {
                  // Going to have to be rejected.
                  if (isTrialScopeErrorResponse(json)) {
                    // TODO: Parse out errors?
                    reject(new TrialScopeServerError('Server indicates invalid query', result, responseBody));
                  } else {
                    reject(new TrialScopeServerError('Unable to parse response', result, responseBody));
                  }
                }
              } catch (ex) {
                reject(new TrialScopeServerError('Unable to parse response', result, responseBody));
              }
            } else {
              reject(
                new TrialScopeServerError(
                  `Server returned ${result.statusCode} ${result.statusMessage}`,
                  result,
                  responseBody
                )
              );
            }
          });
        }
      );

      request.on('error', (error) => reject(error));

      request.write(body);
      request.end();
    });
  }
}

export default TrialScopeQueryRunner;
