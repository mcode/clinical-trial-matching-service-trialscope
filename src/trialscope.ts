/**
 * Module for running queries via TrialScope
 */

import https from 'https';
import { mapConditions } from './mapping';
import { Bundle, Condition } from './bundle';
import { IncomingMessage } from 'http';
import Configuration from './env';

const environment = new Configuration().defaultEnvObject();

if (typeof environment.TRIALSCOPE_TOKEN !== 'string' || environment.TRIALSCOPE_TOKEN === '') {
  throw new Error('TrialScope token is not set in environment. Please set TRIALSCOPE_TOKEN to the TrialScope API token.');
}

class TrialScopeError extends Error {
  constructor(message: string, public result: IncomingMessage, public body: string) {
    super(message);
  }
}

export interface TrialScopeResponse {
  data: {
    baseMatches: {
      totalCount: number;
      edges: { node: Record<string, unknown>, cursor: string }[];
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      }
    }
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
  recruitmentStatus = 'all';
  after?: string = null;
  first = 30;
  constructor(patientBundle: Bundle) {
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
            this.phase = parameter.valueString;
          } else if (parameter.name === 'recruitmentStatus') {
            this.recruitmentStatus = parameter.valueString;
          }
        }
      }
      if (resource.resourceType === 'Condition') {
        this.addCondition(resource);
      }
    }
  }
  addCondition(condition: Condition): void {
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
    let baseMatches = `conditions:[${Array.from(this.getTrialScopeConditions()).join(', ')}], baseFilters: { zipCode: "${this.zipCode}"`;
    if (this.travelRadius) {
      // FIXME: Veryify travel radius is a number
      baseMatches += ',travelRadius: ' + this.travelRadius.toString();
    }
    if (this.phase !== 'any') {
      baseMatches += ',phase:' + this.phase;
    }
    if (this.recruitmentStatus !== 'all') {
      baseMatches += ',recruitmentStatus:' + this.recruitmentStatus;
    }
    baseMatches += ' }';
    if (this.first !== null) {
      baseMatches += ', first: ' + this.first.toString();
    }
    if (this.after !== null) {
      baseMatches += ', after: ' + JSON.stringify(this.after);
    }
    const query = `{ baseMatches(${baseMatches}) {` +
      'totalCount edges {' +
        'node {' +
          'nctId title conditions keywords gender description detailedDescription ' +
          'criteria sponsor overallContactName overallContactPhone overallContactEmail ' +
          'overallStatus armGroups phase minimumAge studyType countries ' +
          'maximumAge sites { ' +
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

export function runTrialScopeQuery(patientBundle: Bundle): Promise<TrialScopeResponse> {
  console.log('Creating TrialScope query...');
  return runRawTrialScopeQuery(new TrialScopeQuery(patientBundle));
}

export default runTrialScopeQuery;

/**
 * Runs a TrialScope query.
 *
 * @param {TrialScopeQuery|string} query the query to run
 */
export function runRawTrialScopeQuery(query: TrialScopeQuery|string): Promise<TrialScopeResponse> {
  if (typeof query === 'object' && typeof query.toQuery === 'function') {
    // If given an object, assume we're going to need to paginate and load everything
    return new Promise((resolve, reject) => {
      sendQuery(query.toQuery()).then(result => {
        // Result is a parsed JSON object. See if we need to load more pages.
        const loadNextPage = (previousPage: TrialScopeResponse) => {
          query.after = previousPage.data.baseMatches.pageInfo.endCursor;
          sendQuery(query.toQuery()).then(nextPage => {
            // Append results.
            result.data.baseMatches.edges.push(...nextPage.data.baseMatches.edges);
            if (nextPage.data.baseMatches.pageInfo.hasNextPage) {
              // Keep going
              loadNextPage(nextPage);
            } else {
              resolve(result);
            }
          }).catch(reject);
        };
        if (result.data.baseMatches.pageInfo.hasNextPage) {
          // Since this result object is the ultimate result, alter it to
          // pretend it doesn't have a next page
          result.data.baseMatches.pageInfo.hasNextPage = false;
          loadNextPage(result);
        } else {
          resolve(result);
        }
      }).catch(reject);
    });
  } else if (typeof query === 'string') {
    // Run directly
    return sendQuery(query);
  }
}

function sendQuery(query: string): Promise<TrialScopeResponse> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(`{"query":${JSON.stringify(query)}}`, 'utf8');
    console.log('Running raw TrialScope query');
    console.log(query);
    const request = https.request(environment.trialscope_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': body.byteLength.toString(),
        'Authorization': 'Bearer ' + environment.TRIALSCOPE_TOKEN
      }
    }, result => {
      let responseBody = '';
      result.on('data', chunk => {
        responseBody += chunk;
      });
      result.on('end', () => {
        console.log('Complete');
        if (result.statusCode === 200) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new TrialScopeError(`Server returned ${result.statusCode} ${result.statusMessage}`, result, responseBody));
        }
      });
    });

    request.on('error', error => reject(error));

    request.write(body);
    request.end();
  });
}
