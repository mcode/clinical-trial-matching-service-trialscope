/**
 * Module for running queries via TrialScope
 */
import { ClinicalTrialGovService } from 'clinical-trial-matching-service';
import https from 'https';
import http from 'http';
import { mapConditions } from './mapping';
import { IncomingMessage } from 'http';
import { convertTrialScopeToResearchStudy } from './research-study-mapping';
import { RequestError, SearchSet, fhir } from 'clinical-trial-matching-service';
import * as fs from 'fs';
import path from 'path';

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

class TrialScopeServerError extends Error {
  constructor(message: string, public result: IncomingMessage, public body: string) {
    super(message);
  }
}

export interface TrialScopeResponse {
  data: {
    baseMatches: {
      totalCount: number;
      edges: { node: TrialScopeTrial; cursor: string }[];
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
    };
  };
}

export function isTrialScopeResponse(o: unknown): o is TrialScopeResponse {
  if (typeof o !== 'object') {
    return false;
  }
  if ('data' in o && typeof o['data'] === 'object' && o['data'] !== null) {
    const possibleResponse = o as TrialScopeResponse;
    return (
      'baseMatches' in possibleResponse.data &&
      typeof possibleResponse.data['baseMatches'] === 'object' &&
      possibleResponse.data['baseMatches'] !== null
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
  if (typeof o !== 'object') {
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
  armGroups?: ArmGroup[];
  officialTitle?: string;
  criteria?: string;
  sponsor?: string;
  overallOfficialName?: string;
  sites?: Site[];
}

export interface ArmGroup {
  description?: string;
  arm_group_type?: string;
  arm_group_label?: string;
}

export interface Site {
  facility?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
}

function parsePhase(phase: string): string | null {
  if (phase in TRIALSCOPE_PHASES) {
    return TRIALSCOPE_PHASES[phase];
  } else {
    throw new RequestError(`Cannot parse phase: "${phase}"`);
  }
}

function parseRecruitmentStatus(status: string): string | null {
  if (status in TRIALSCOPE_STATUSES) {
    return TRIALSCOPE_STATUSES[status];
  } else {
    throw new RequestError(`Cannot parse recruitment status: "${status}"`);
  }
}

/**
 * Object for storing the various parameters necessary for the TrialScope query
 * based on a patient bundle.
 */
export class TrialScopeQuery {
  conditions = new Set<string>();
  zipCode?: string = null;
  travelRadius?: number = null;
  phase = 'any';
  recruitmentStatus: string | string[] | null = null;
  after?: string = null;
  first = 30;
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
    'armGroups',
    'phase',
    'minimumAge',
    'studyType',
    'countries',
    'maximumAge'
  ];
  constructor(patientBundle: fhir.Bundle) {
    for (const entry of patientBundle.entry) {
      if (!('resource' in entry)) {
        // Skip bad entries
        continue;
      }
      const resource = entry.resource;
      console.log(`Checking resource ${resource.resourceType}`);
      if (resource.resourceType === 'Parameters') {
        for (const parameter of resource.parameter) {
          console.log(` - Setting parameter ${parameter.name} to ${parameter.valueString}`);
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
      if (resource.resourceType === 'Condition') {
        this.addCondition(resource);
      }
    }
  }
  addCondition(condition: fhir.Condition): void {
    // Should have a code
    // TODO: Limit to specific coding systems (maybe)
    for (const code of condition.code.coding) {
      this.conditions.add(code.code);
    }
  }
  getTrialScopeConditions(): Set<string> {
    return mapConditions(Array.from(this.conditions));
  }
  /**
   * Create a TrialScope query.
   * @return {string} the TrialScope GraphQL query
   */
  toQuery(): string {
    let baseMatches =
      'conditions:[' +
      Array.from(this.getTrialScopeConditions()).join(', ') +
      `], baseFilters: { zipCode: "${this.zipCode}"`;
    if (this.travelRadius) {
      // FIXME: Veryify travel radius is a number
      baseMatches += ',travelRadius: ' + this.travelRadius.toString();
    }
    if (this.phase !== 'any') {
      baseMatches += ',phase:' + this.phase;
    }
    if (this.recruitmentStatus !== null) {
      // Recruitment status can conceptually be an array
      if (Array.isArray(this.recruitmentStatus)) {
        baseMatches += `,recruitmentStatus:[${this.recruitmentStatus.join(', ')}]`;
      } else {
        baseMatches += ',recruitmentStatus:' + this.recruitmentStatus;
      }
    }
    baseMatches += ' }';
    if (this.first !== null) {
      baseMatches += ', first: ' + this.first.toString();
    }
    if (this.after !== null) {
      baseMatches += ', after: ' + JSON.stringify(this.after);
    }
    // prettier-ignore
    const query = `{ baseMatches(${baseMatches}) {` +
      'totalCount edges {' +
        'node {' + this.trialFields.join(' ') +
          ' sites { ' +
            'facility contactName contactEmail contactPhone latitude longitude ' +
          '} ' +
        '} ' +
        'cursor ' +
      '} ' +
      'pageInfo { endCursor hasNextPage }' +
    '} }';
    console.log('Generated query:');
    console.log(query);
    return query;
  }
  toString(): string {
    return this.toQuery();
  }
}

type RequestGeneratorFunction = (
  url: string | URL,
  options: https.RequestOptions,
  callback?: (res: IncomingMessage) => void
) => http.ClientRequest;

export class TrialScopeQueryRunner {
  private generateRequest: RequestGeneratorFunction;
  constructor(
    public endpoint: string,
    private token: string,
    requestGenerator: RequestGeneratorFunction = https.request
  ) {
    this.generateRequest = requestGenerator;
  }

  runQuery(patientBundle: fhir.Bundle): Promise<SearchSet> {
    return new Promise<TrialScopeResponse>((resolve, reject) => {
      const query = new TrialScopeQuery(patientBundle);
      this.sendQuery(query.toQuery())
        .then((result) => {
          // Result is a parsed JSON object. See if we need to load more pages.
          const loadNextPage = (previousPage: TrialScopeResponse) => {
            query.after = previousPage.data.baseMatches.pageInfo.endCursor;
            this.sendQuery(query.toQuery())
              .then((nextPage) => {
                // Append results.
                result.data.baseMatches.edges.push(...nextPage.data.baseMatches.edges);
                if (nextPage.data.baseMatches.pageInfo.hasNextPage) {
                  // Keep going
                  loadNextPage(nextPage);
                } else {
                  resolve(result);
                }
              })
              .catch(reject);
          };
          if (!('data' in result)) {
            console.error('Bad response from server. Got:');
            console.error(result);
            reject(new Error(`Missing "data" in results`));
          }
          if (result.data.baseMatches.pageInfo.hasNextPage) {
            // Since this result object is the ultimate result, alter it to
            // pretend it doesn't have a next page
            result.data.baseMatches.pageInfo.hasNextPage = false;
            loadNextPage(result);
          } else {
            resolve(result);
          }
        })
        .catch(reject);
    }).then<SearchSet>((trialscopeResponse) => {
      // Convert to SearchSet
      const studies: fhir.ResearchStudy[] = [];
      let index = 0;
      const backupIds: string[] = [];
      for (const node of trialscopeResponse.data.baseMatches.edges) {
        const trial: TrialScopeTrial = node.node;
        const study = convertTrialScopeToResearchStudy(trial, index);
        if (!study.description || !study.enrollment || !study.phase || !study.category) {
          backupIds.push(trial.nctId);
        }
        studies.push(study);
        index++;
      }
      const filepath = 'src';
      const backupService = new ClinicalTrialGovService(filepath);
      if (backupIds.length == 0) {
        return new SearchSet(studies);
      } else {
        return backupService.downloadTrials(backupIds).then(() => {
          for (let study of studies) {
            // console.log(study.identifier[0].value);
            if (backupIds.includes(study.identifier[0].value)) {
              study = backupService.updateTrial(study);
            }
          }

          // FIXME: This should be handled by the service itself
          fs.unlink('src/backup.zip', (err) => {
            if (err) console.log(err);
          });
          fs.rmdir(path.resolve('src/backups/'), { recursive: true }, (err) => {
            if (err) console.log(err);
          });

          return new SearchSet(studies);
        });
      }
    });
  }

  sendQuery(query: string): Promise<TrialScopeResponse> {
    return new Promise((resolve, reject) => {
      const body = Buffer.from(`{"query":${JSON.stringify(query)}}`, 'utf8');
      console.log('Running raw TrialScope query');
      console.log(query);
      const request = this.generateRequest(
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
            console.log('Complete');
            if (result.statusCode === 200) {
              const json = JSON.parse(responseBody) as unknown;
              if (isTrialScopeResponse(json)) {
                resolve(json);
              } else {
                // Going to have to be rejected.
                if (isTrialScopeErrorResponse(json)) {
                  // TODO: Parse out errors?
                  reject(new TrialScopeServerError('Server indicates invalid query', result, responseBody));
                } else {
                  // Going to have to be rejected.
                  if (isTrialScopeErrorResponse(json)) {
                    // TODO: Parse out errors?
                    reject(new TrialScopeServerError('Server indicates invalid query', result, responseBody));
                  } else {
                    reject(new TrialScopeServerError('Unable to parse response', result, responseBody));
                  }
                }
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

  /**
   * Override the request generator used to generate HTTPS requests. This may be
   * useful in some scenarios where the request needs to be modified. It's
   * primarily intended to be used in tests.
   *
   * @param requestGenerator the request generator to use instead of https.request
   */
  setRequestGenerator(requestGenerator?: RequestGeneratorFunction): void {
    this.generateRequest = requestGenerator ? requestGenerator : https.request;
  }
}

export default TrialScopeQueryRunner;
