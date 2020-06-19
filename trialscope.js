/**
 * Module for dealing with TrialScope
 */
const https = require('https'),
  mapConditions = require('./mapping').mapConditions;

const environment = new (require('./env'))().defaultEnvObject();

if (typeof environment.TRIALSCOPE_TOKEN !== 'string' || environment.TRIALSCOPE_TOKEN === '') {
  throw new Error('TrialScope token is not set in environment.');
}

class TrialScopeError extends Error {
  constructor(message, result, body) {
    super(message);
    this.result = result;
    this.body = body;
  }
}

/**
 * Object for storing the various parameters necessary for the TrialScope query
 * based on a patient bundle.
 */
class TrialScopeQuery {
  constructor(patientBundle) {
    this.conditions = new Set();
    this.zipCode = null;
    this.travelRadius = null;
    this.phase = 'any';
    this.recruitmentStatus = 'all';
    this.after = null;
    this.first = 30;
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
  addCondition(condition) {
    // Should have a code
    // TODO: Limit to specific coding systems (maybe)
    for (const code of condition.code.coding) {
      this.conditions.add(code.code);
    }
  }
  getTrialScopeConditions() {
    return mapConditions(Array.from(this.conditions));
  }
  /**
   * Create a TrialScope query.
   * @return {string} the TrialScope GraphQL query
   */
  toQuery() {
    let baseMatches = `conditions:[${Array.from(this.getTrialScopeConditions()).join(', ')}], baseFilters: { zipCode: "${this.zipCode}"`;
    if (this.travelRadius) {
      // FIXME: Veryify travel radius is a number
      baseMatches += ',travelRadius: ' + this.travelRadius;
    }
    if (this.phase !== 'any') {
      baseMatches += ',phase:' + this.phase;
    }
    if (this.recruitmentStatus !== 'all') {
      baseMatches += ',recruitmentStatus:' + this.recruitmentStatus;
    }
    baseMatches += ' }';
    if (this.first !== null) {
      baseMatches += ', first: ' + this.first;
    }
    if (this.after !== null) {
      baseMatches += ', after: ' + JSON.stringify(this.after);
    }
    let query = `{ baseMatches(${baseMatches}) {` +
      'totalCount edges {' +
        'node {' +
          'nctId title conditions gender description detailedDescription ' +
          'criteria sponsor overallContactPhone overallContactEmail ' +
          'overallStatus armGroups phase minimumAge studyType ' +
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
  toString() {
    return this.toQuery();
  }
}

function runTrialScopeQuery(patientBundle) {
  console.log('Creating TrialScope query...');
  return runQuery(new TrialScopeQuery(patientBundle));
}

/**
 * Runs a TrialScope query.
 *
 * @param {TrialScopeQuery|string} query the query to run
 */
function runQuery(query) {
  if (typeof query === 'object' && typeof query.toQuery === 'function') {
    // If given an object, assume we're going to need to paginate and load everything
    return new Promise((resolve, reject) => {
      sendQuery(query.toQuery()).then(result => {
        // Result is a parsed JSON object. See if we need to load more pages.
        const loadNextPage = (previousPage) => {
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

function sendQuery(query) {
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

module.exports = {
  runTrialScopeQuery: runTrialScopeQuery,
  runRawTrialScopeQuery: runQuery,
  TrialScopeQuery: TrialScopeQuery
};
