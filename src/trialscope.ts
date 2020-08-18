/**
 * Module for running queries via TrialScope
 */

import https from 'https';
import http from 'http';
import { mapConditions } from './mapping';
import { Bundle, Condition } from './bundle';
import { IncomingMessage } from 'http';
import Configuration from './env';
import RequestError from './request-error';

import { fhirclient } from 'fhirclient/lib/types';
import * as fhirpath from 'fhirpath';

import * as profile_system_codes from '../data/profile-system-codes.json';
import * as profile_system_logic from '../data/profile-system-logic.json';

export type FHIRPath = string;
import * as mcode from './mcode';

const environment = new Configuration().defaultEnvObject();

if (typeof environment.TRIALSCOPE_TOKEN !== 'string' || environment.TRIALSCOPE_TOKEN === '') {
  throw new Error(
    'TrialScope token is not set in environment. Please set TRIALSCOPE_TOKEN to the TrialScope API token.'
  );
}

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
  mcode?: {
    primaryCancer?: string;
    secondaryCancer?: string;
    histologyMorphology?: string;
    stage?: string;
    age?: string;
    tumorMarker?: string;
    radiationProcedure?: string;
    surgicalProcedure?: string;
    medicationStatement?: string;
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
    'armGroups',
    'phase',
    'minimumAge',
    'studyType',
    'countries',
    'maximumAge'
  ];
  constructor(patientBundle: Bundle) {
    const extractedMCODE = new mcode.extractedMCODE(patientBundle);
    console.log(extractedMCODE);
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
    var primaryCancerString:string = this.getFilterType('Primary Cancer', extractedMCODE);
    console.log("Filter Result:");
    console.log(primaryCancerString);
  }
  // Return the filter type based on the input profile string.
  getFilterType(filter:string, extractedMCODE:mcode.extractedMCODE): string {
    // Parse through the logic JSON and check if certain conditions are met to return the corresponding string.
    var typesList:String[] = profile_system_logic[filter].types;
    for (var profileType of typesList) {
      if (this.parseOperation(profileType['operation'], extractedMCODE)) {
        // If the conditions associated with this type are all true, return this type.
        return profileType['type']
      }
    }
    return 'LOGIC ERROR'
  }
  // Parse an operation and return whether it returns TRUE or FALSE.
  parseOperation(operation:String, extractedMCODE:mcode.extractedMCODE): boolean{

    console.log(operation['operatorType']);

    // If there are no more operations within this operation, then we've reached a leaf condition
    if(operation['operations'] == null){

      if(operation['operatorType'] == "AND"){
        for(var condition of operation['conditions']){
          // Cycle through the conditions and check if they meet the AND requirements.
          if(!this.checkConditionValidity(condition, extractedMCODE)){
            return false;
          }
        }
        // If they're all true, then we reach here.
        return true;
      }
      else if(operation['operatorType'] == "OR") {
        for(var condition of operation['conditions']){
          // Cycle through the conditions and check if they meet the OR requirements.
          if(this.checkConditionValidity(condition, extractedMCODE)){
            return true;
          }
        }
        // If they're all false, then we reach here.
        return false;
      }
      else if(operation['operatorType'] == "NONE"){
        // There will be one condition, check if it is satisfied.
        return this.checkConditionValidity(operation['conditions'], extractedMCODE);
      }
    } else {

      if(operation['operatorType'] == "AND"){
        // We need to parse through the operations and find their values.
        for(var subOperation of operation['operations']){
          if(!this.parseOperation(subOperation, extractedMCODE)){
            return false
          }
        }
        // If they're all true, then we reach here.
        return true;
      }
      else if(operation['operatorType'] == "OR"){
        // We need to parse through the operations and find their values.
        for(var subOperation of operation['operations']){
          if(this.parseOperation(subOperation, extractedMCODE)){
            return true
          }
        }
        // If they're all false, then we reach here.
        return false;
      }
    }
    console.log('LOGIC ERROR');
    return false;
  }
  // Check whether the current condition is TRUE or FALSE
  checkConditionValidity(condition:String, extractedMCODE:mcode.extractedMCODE): boolean{
    
    console.log(condition);
    var tempConditionString:String = new String(condition[0]['condition']);
    var splitConditions = tempConditionString.split(" ");
    var operator = splitConditions[1];

    // Each of these operator types are based on a code being in a profile.
    if (operator == 'is-in' || operator == 'is-any-code' || operator == 'any-code-not-in') {


      var neededCode:string = splitConditions[0];
      var codesToCheck:string[] = new Array();
      var systemsToCheck:string[] = new Array();
      
      console.log("jojo");

      // Pull the correct code and code system from the extractedMCODE 
      var codeType:string = neededCode.split("-code")[0];
      for (var i in extractedMCODE[codeType]) {
        codesToCheck[i] = extractedMCODE[codeType][i]['coding'][0].code;
        systemsToCheck[i] = extractedMCODE[codeType][i]['coding'][0].system;
      }
      // Make sure it was a valid code.
      if (neededCode != 'primaryCancerCondition-code' && neededCode != 'secondaryCancerCondition-code'
          && neededCode != 'cancerRelatedRadiationProcedure-code' && neededCode != 'tumorMarker-code') {
        console.log("CONDITION ERROR: INVALID CODE TYPE");
        return false;
      }
      console.log("jojo");

      // Cycle through the list of codes and check

      for(var currentIndex in codesToCheck){
        var currentCode:string = codesToCheck[currentIndex];
        var currentCodeSystem:string = systemsToCheck[currentIndex];

        // Normalize the code system. NEED TO ADD MORE CODE SYSTEMS STILL.
        if(currentCodeSystem.includes("snomed")){
          currentCodeSystem = "SNOMED";
        } else if(currentCodeSystem.includes("rxnorm")){
          currentCodeSystem = "RXNORM";
        } else if(currentCodeSystem.includes("icd-10")){
          currentCodeSystem = "ICD-10";
        } else if(currentCodeSystem.includes("ajcc")){
          currentCodeSystem = "AJCC";
        } else if(currentCodeSystem.includes("loinc")){
          currentCodeSystem = "LOINC";
        }else {
          console.log("INVALID CODE SYSTEM ERROR");
          console.log(currentCodeSystem);
        }

        console.log(splitConditions);
        console.log(currentCode);

        //This condition is based on whether a code is in a certain code system.
        var profileList:string[];
        var skipProfileList:string[];
        if(operator == 'is-in'){
          // Just pull the standard list of profiles to check in.
          profileList = splitConditions[2].split("*");
        }
        else if(operator == 'is-any-code'){
          // Pull the full list of profiles to check in.
          profileList = Object.keys(profile_system_codes);
        }
        else if(operator == 'any-code-not-in'){
          // Pull the full list of profiles to check in, list of profiles to NOT check in.
          profileList = Object.keys(profile_system_codes);
          skipProfileList = splitConditions[2].split("*");
        }

        console.log(profileList);

        // Cycle through the list of profiles to check the conditions for all.
        for(var profile of profileList){
          // If the current profile is in the list of skipProfiles, skip it.
          if(skipProfileList != undefined && skipProfileList.includes(profile)){
            // THERE COULD BE SOME ISSUES HERE
            continue;
          }
          // Check if the current profile contains the current code.
          var codeSet = profile_system_codes[profile][currentCodeSystem];
          for(var checkCode of codeSet){
            console.log(checkCode);
            if(checkCode['code'] == currentCode){
              console.log("MATCH FOUND");
              return true;
            }
          }
        }
      }
    }
    else if (operator == '='){

      // Simple equality logic

      var neededRequirement:string = splitConditions[0];
      var currentRequirement:string;

      if(neededRequirement == 'valueCodeableConcept'){
        // PULL OUT VALUE CODABLE CONCEPT?
      }
      else if(neededRequirement == 'valueQuantity/valueRatio'){
        // PULL OUT VALUEQUANTITY/VALUERATION?
      }
      else if(neededRequirement == 'interpretaion'){
        // PULL OUT Interpretation?
      }
      else if(neededRequirement == 'interpretaion'){
        // PULL OUT Interpretation?
      }
      else if(neededRequirement == 'clinicalstatus'){
        currentRequirement = extractedMCODE['secondaryCancerCondition'][0]['clinicalstatus'][0].code;
      }
      else if(neededRequirement == 'SecondaryCancerCondition-bodySite'){
        // PULL OUT SecondaryCancerCondition-bodySite?
        currentRequirement = extractedMCODE['secondaryCancerCondition'][0]['clinicalstatus'][0].code;
      }
      else if(neededRequirement == 'CancerRelatedMedicationStatement-medication[x]'){
        currentRequirement = extractedMCODE['cancerRelatedMedicationStatement'][0].code;
      }
      else if(neededRequirement == 'cancerRelatedRadiationProcedure-code-medication[x]'){
        currentRequirement = extractedMCODE['cancerRelatedRadiationProcedure'][0].code;
      }
      else if(neededRequirement == 'bodySite'){
        // Pull out bodysite?
      }
    }
    else {
      console.log("CONDITION ERROR: INVALID CONDITION TYPE");
      return false;
    }
    // If we reach here, no conditions were satisfied, thus it is false.
    return false;
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

export function runTrialScopeQuery(patientBundle: Bundle): Promise<TrialScopeResponse> {
  return runRawTrialScopeQuery(new TrialScopeQuery(patientBundle));
}

export default runTrialScopeQuery;

/**
 * Runs a TrialScope query.
 *
 * @deprecated Will be merged in with #runTrialScopeQuery
 * @param {TrialScopeQuery|string} query the query to run
 */
export function runRawTrialScopeQuery(query: TrialScopeQuery | string): Promise<TrialScopeResponse> {
  if (typeof query === 'object' && typeof query.toQuery === 'function') {
    // If given an object, assume we're going to need to paginate and load everything
    return new Promise((resolve, reject) => {
      sendQuery(query.toQuery())
        .then((result) => {
          // Result is a parsed JSON object. See if we need to load more pages.
          const loadNextPage = (previousPage: TrialScopeResponse) => {
            query.after = previousPage.data.baseMatches.pageInfo.endCursor;
            sendQuery(query.toQuery())
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
    });
  } else if (typeof query === 'string') {
    // Run directly
    return sendQuery(query);
  }
}

type RequestGeneratorFunction = (
  url: string | URL,
  options: https.RequestOptions,
  callback?: (res: IncomingMessage) => void
) => http.ClientRequest;

let generateRequest: RequestGeneratorFunction = https.request;

/**
 * Override the request generator used to generate HTTPS requests. This may be
 * useful in some scenarios where the request needs to be modified. It's
 * primarily intended to be used in tests.
 *
 * @param requestGenerator the request generator to use instead of https.request
 */
export function setRequestGenerator(requestGenerator?: RequestGeneratorFunction): void {
  generateRequest = requestGenerator ? requestGenerator : https.request;
}

function sendQuery(query: string): Promise<TrialScopeResponse> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(`{"query":${JSON.stringify(query)}}`, 'utf8');
    console.log('Running raw TrialScope query');
    console.log(query);
    const request = generateRequest(
      environment.trialscope_endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Content-Length': body.byteLength.toString(),
          'Authorization': 'Bearer ' + environment.TRIALSCOPE_TOKEN
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
