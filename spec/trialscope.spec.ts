import {
  isTrialScopeResponse,
  isTrialScopeErrorResponse,
  makeSearchSet,
  TrialScopeQuery,
  TrialScopeQueryRunner,
  TrialScopeServerError
} from '../src/trialscope';
import { SearchSet, fhir, ClinicalTrialGovService } from 'clinical-trial-matching-service';
import nock from 'nock';

describe('isTrialScopeResponse', () => {
  it('returns false with a non-object', () => {
    expect(isTrialScopeResponse(null)).toBeFalse();
    expect(isTrialScopeResponse(1.5)).toBeFalse();
    expect(isTrialScopeResponse('this is a string')).toBeFalse();
  });
  it('dreturns false with a null data field', () => {
    expect(isTrialScopeResponse({ data: null })).toBeFalse();
  });
  it('returns false with a null advancedMatches field', () => {
    expect(isTrialScopeResponse({ data: { advancedMatches: null } })).toBeFalse();
  });
});

describe('isTrialScopeErrorResponse', () => {
  it('returns false with a non-object', () => {
    expect(isTrialScopeErrorResponse(null)).toBeFalse();
    expect(isTrialScopeErrorResponse(1.5)).toBeFalse();
    expect(isTrialScopeErrorResponse('this is a string')).toBeFalse();
  });
  it("returns false with an object that doesn't match", () => {
    expect(isTrialScopeErrorResponse({ data: true })).toBeFalse();
  });
  it('returns false with a null error field', () => {
    expect(isTrialScopeErrorResponse({ errors: null })).toBe(false);
  });
  it('requires errors be an array', () => {
    expect(isTrialScopeErrorResponse({ errors: [] })).toBe(true);
    expect(isTrialScopeErrorResponse({ errors: 5 })).toBe(false);
  });
});

describe('TrialScopeQuery', () => {
  it('ignores bad entries', () => {
    // This involves a bit of lying to TypeScript
    const patientBundle: fhir.Bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: []
    };
    patientBundle.entry.push(({ invalid: true } as unknown) as fhir.BundleEntry);
    new TrialScopeQuery(patientBundle);
    // Success is the object being created at all
  });

  it('pulls out parameters embedded in the bundle', () => {
    const query = new TrialScopeQuery({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Parameters',
            parameter: [
              { name: 'zipCode', valueString: '01234' },
              { name: 'travelRadius', valueString: '15' },
              { name: 'phase', valueString: 'phase-1' },
              { name: 'recruitmentStatus', valueString: 'active' },
              // This just makes sure it ignores parameters it doesn't recognize
              { name: 'unknownParameter', valueString: 'test' }
            ]
          }
        }
      ]
    });
    expect(query.zipCode).toEqual('01234');
    expect(query.travelRadius).toEqual(15);
    // These values should have been translated:
    expect(query.phase).toEqual('PHASE_1');
    expect(query.recruitmentStatus).toEqual('RECRUITING');
  });

  it('raises an error on an invalid phase', () => {
    expect(() => {
      new TrialScopeQuery({
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Parameters',
              parameter: [{ name: 'phase', valueString: 'totally invalid' }]
            }
          }
        ]
      });
    }).toThrowError('Cannot parse phase: "totally invalid"');
  });

  it('raises an error on an invalid recruitment status', () => {
    expect(() => {
      new TrialScopeQuery({
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Parameters',
              parameter: [{ name: 'recruitmentStatus', valueString: 'totally invalid' }]
            }
          }
        ]
      });
    }).toThrowError('Cannot parse recruitment status: "totally invalid"');
  });
});

describe('TrialScopeQueryRunner', () => {
  let queryRunner: TrialScopeQueryRunner;
  let backupService: ClinicalTrialGovService;
  let interceptor: nock.Interceptor;
  beforeEach(() => {
    backupService = new ClinicalTrialGovService('tmp');
    queryRunner = new TrialScopeQueryRunner('https://example.com/trialscope', 'token', backupService);
    interceptor = nock('https://example.com').post('/trialscope');
  });

  it('handles an empty response', () => {
    interceptor.reply(200, '');
    return expectAsync(queryRunner.sendQuery('unimportant')).toBeRejectedWithError(
      TrialScopeServerError,
      'Unable to parse response'
    );
  });

  it('handles an invalid response', () => {
    interceptor.reply(200, '"valid JSON, not a valid reply"');
    return expectAsync(queryRunner.sendQuery('unimportant')).toBeRejectedWithError(
      TrialScopeServerError,
      'Unable to parse response'
    );
  });

  it('handles an HTTP error response', () => {
    interceptor.reply(500, 'Server on fire');
    return expectAsync(queryRunner.sendQuery('unimportant')).toBeRejectedWithError(
      TrialScopeServerError,
      /^Server returned 500/
    );
  });

  it('handles a TrialScope error response', () => {
    interceptor.reply(
      200,
      '{"errors":[{"message":"\\"unimportant\\" is not a valid query","locations":{"line":1,"column":1},"path":[],"extensions":{}}]}'
    );
    return expectAsync(queryRunner.sendQuery('unimportant')).toBeRejectedWithError(
      TrialScopeServerError,
      'Server indicates invalid query'
    );
  });

  it('handles stream errors', () => {
    // This triggers the error handler on the stream, it does not generate a server error
    interceptor.replyWithError('oops');
    return expectAsync(queryRunner.sendQuery('unimportant')).toBeRejectedWithError('oops');
  });
});

describe('makeSearchSet', () => {
  let matchScores: number[];
  let studies: fhir.ResearchStudy[];
  let searchSet: SearchSet;
  beforeEach(() => {
    matchScores = [0, 0.5, 1];
    studies = [
      { resourceType: 'ResearchStudy', id: '1' },
      { resourceType: 'ResearchStudy', id: '2' },
      { resourceType: 'ResearchStudy', id: '3' }
    ];
    searchSet = makeSearchSet(studies, matchScores);
  });

  it('creates proper searchet', () => {
    expect(searchSet.resourceType == 'Bundle' && searchSet.type == 'searchset' && searchSet.total == 3).toBe(true);
  });

  it('sets match scores correctly', () => {
    expect(searchSet.entry[0].search.score).toBe(0);
    expect(searchSet.entry[1].search.score).toBe(0.5);
    expect(searchSet.entry[2].search.score).toBe(1);
  });
});
