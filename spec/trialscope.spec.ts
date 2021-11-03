import {
  isTrialScopeResponse,
  isTrialScopeErrorResponse,
  TrialScopeQuery,
  TrialScopeQueryRunner,
  TrialScopeServerError,
  TrialScopeTrial
} from '../src/trialscope';
import { fhir, ClinicalTrialsGovService, ResearchStudy } from 'clinical-trial-matching-service';
// For spying purposes:
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

  it('toString() calls toQuery()', () => {
    // This test is sort of pointless but might as well be inclusive
    const query = new TrialScopeQuery({ resourceType: 'Bundle', type: 'collection', entry: [] });
    expect(query.toString()).toEqual(query.toQuery());
  });

  it('generates a query', () => {
    // TypeScript assumes extra fields are an error, although in this case the
    // FHIR types supplies are somewhat intentionally sparse as they're not a
    // full definition
    const condition: fhir.Resource = {
      resourceType: 'Condition',
      meta: {
        profile: [
          'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-primary-cancer-condition',
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition'
        ],
        lastUpdated: ""
      },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '64572001',
              display: 'Disease (disorder)'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '254837009'
          }
        ]
      },
      extension: [
        {
          url: 'http://hl7.org/fhir/us/mcode/ValueSet/mcode-histology-morphology-behavior-vs',
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '367651003'
              }
            ]
          }
        }
      ]
    } as fhir.Resource;
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
              { name: 'recruitmentStatus', valueString: 'active' }
            ]
          }
        },
        {
          resource: condition
        }
      ]
    });
    // For now, just check to make sure the parameters and MCode values made
    // it out
    const graphQL = query.toQuery();
    // It's important to note that the regexps only work assuming neither the
    // mcode or baseFilters sections ever include child objects, which is
    // currently the case
    let m = /mcode:\s*{(.*?)}/.exec(graphQL);
    expect(m).toBeTruthy();
    const mcodeFilters = m[1];
    expect(mcodeFilters).toMatch(/primaryCancer:\s*BREAST_CANCER/);
    m = /baseFilters:\s*{(.*?)}/.exec(graphQL);
    expect(m).toBeTruthy();
    const baseFilters = m[1];
    expect(baseFilters).toMatch(/zipCode:\s*"01234"/);
    expect(baseFilters).toMatch(/travelRadius:\s*15\b/);
    expect(baseFilters).toMatch(/phase:\s*PHASE_1\b/);
    expect(baseFilters).toMatch(/recruitmentStatus:\s*RECRUITING\b/);
  });

  it("excludes parameters that weren't included", () => {
    // The only required parameter is the zipcode
    const query = new TrialScopeQuery({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Parameters',
            parameter: [{ name: 'zipCode', valueString: '98765' }]
          }
        }
      ]
    });
    // Also blank out first - not sure why this is allowed but apparently it is?
    // Fairly certain this is never used.
    query.first = null;
    const graphQL = query.toQuery();
    const m = /baseFilters:\s*{(.*?)}/.exec(graphQL);
    expect(m).toBeTruthy();
    const baseFilters = m[1];
    expect(baseFilters).toMatch(/zipCode:\s*"98765"/);
    expect(baseFilters).not.toMatch('travelRadius');
    expect(baseFilters).not.toMatch('phase');
    expect(baseFilters).not.toMatch('recruitmentStatus');
  });
});

describe('TrialScopeQueryRunner', () => {
  let queryRunner: TrialScopeQueryRunner;
  let backupService: ClinicalTrialsGovService;
  let scope: nock.Scope;
  let interceptor: nock.Interceptor;

  beforeEach(() => {
    backupService = new ClinicalTrialsGovService('tmp');
    queryRunner = new TrialScopeQueryRunner('https://example.com/trialscope', 'token', backupService);
    scope = nock('https://example.com');
    interceptor = scope.post('/trialscope');
  });
  afterEach(() => {
    expect(scope.isDone()).toBeTrue();
    interceptor = null;
    scope = null;
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
    interceptor.reply(200, {
      errors: [
        {
          message: '"unimportant" is not a valid query',
          locations: { line: 1, column: 1 },
          path: [],
          extensions: {}
        }
      ]
    });
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

  describe('runQuery', () => {
    let patientBundle: fhir.Bundle;
    beforeEach(() => {
      // This is basically the minimum bundle required to run a query
      patientBundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Parameters',
              parameter: [{ name: 'zipCode', valueString: '01234' }]
            }
          }
        ]
      };
    });

    it('resolves results on success', () => {
      interceptor.reply(200, {
        data: {
          advancedMatches: {
            totalCount: 2,
            edges: [],
            pageInfo: {
              endCursor: 'A',
              hasNextPage: false
            }
          }
        }
      });
      return expectAsync(queryRunner.runQuery(patientBundle)).toBeResolved();
    });

    it('loads multiple pages', () => {
      interceptor
        .reply(200, {
          data: {
            advancedMatches: {
              totalCount: 3,
              edges: [],
              pageInfo: {
                endCursor: 'A',
                hasNextPage: true
              }
            }
          }
        })
        .post('/trialscope')
        .reply(200, {
          data: {
            advancedMatches: {
              totalCount: 3,
              edges: [],
              pageInfo: {
                endCursor: 'B',
                hasNextPage: true
              }
            }
          }
        })
        .post('/trialscope')
        .reply(200, {
          data: {
            advancedMatches: {
              totalCount: 3,
              edges: [],
              pageInfo: {
                endCursor: 'C',
                hasNextPage: false
              }
            }
          }
        });
      return expectAsync(queryRunner.runQuery(patientBundle)).toBeResolved();
    });
  });

  describe('convertToSearchSet', () => {
    let backupServiceSpy: jasmine.Spy;
    beforeEach(() => {
      backupServiceSpy = spyOn(backupService, 'updateResearchStudies').and.callFake((studies) => {
        return Promise.resolve(studies);
      });
    });
    afterEach(() => {
      // As of now it's always callled even if nothing needs to be done
      expect(backupServiceSpy).toHaveBeenCalled();
    });

    it('converts a response to a SearchSet', () => {
      // Miminum trial that won't trigger the backup service
      const minimalTrial: TrialScopeTrial = {
        detailedDescription: 'Detailed description',
        criteria: 'Trial Criteria',
        phase: 'Phase 2',
        studyType: 'Type'
      };
      return expectAsync(
        queryRunner
          .convertToSearchSet({
            data: {
              advancedMatches: {
                totalCount: 3,
                edges: [
                  {
                    node: minimalTrial,
                    cursor: 'A',
                    matchQuality: 'HIGH_LIKELIHOOD'
                  },
                  {
                    node: minimalTrial,
                    cursor: 'B',
                    matchQuality: 'POSSIBLE'
                  },
                  {
                    node: minimalTrial,
                    cursor: 'C',
                    matchQuality: 'POSSIBLE_NON_MATCH'
                  }
                ],
                pageInfo: { endCursor: 'D', hasNextPage: false }
              }
            }
          })
          .then((actual) => {
            expect(backupServiceSpy).toHaveBeenCalled();
            expect(actual.total).toEqual(3);
            expect(actual.entry.length).toEqual(3);
            for (let i = 0; i < 3; i++) {
              const expected = new ResearchStudy(i);
              expected.phase = {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/research-study-phase',
                    code: 'phase-2',
                    display: 'Phase 2'
                  }
                ],
                text: 'Phase 2'
              };
              expected.category = [{ text: 'Study Type: Type' }];
              expected.description = 'Detailed description';
              const reference = expected.addContainedResource({
                resourceType: 'Group',
                id: 'group-' + expected.id,
                type: 'person',
                actual: false
              });
              reference.display = 'Trial Criteria';
              expected.enrollment = [reference];
              // For the sake of this test, kill the createResourceId functions
              // (it shouldn't be enumerable anyway)
              expected.createReferenceId = null;
              (actual.entry[i].resource as ResearchStudy).createReferenceId = null;
              expect(actual.entry[i].resource).toEqual(expected);
            }
            expect(actual.entry[0].search.score).toEqual(1);
            expect(actual.entry[1].search.score).toEqual(0.5);
            expect(actual.entry[2].search.score).toEqual(0);
          })
      ).toBeResolved();
    });

    it('converts an empty response to an empty SearchSet', () => {
      return expectAsync(
        queryRunner
          .convertToSearchSet({
            data: {
              advancedMatches: {
                totalCount: 0,
                edges: [],
                pageInfo: { endCursor: 'A', hasNextPage: false }
              }
            }
          })
          .then((actual) => {
            expect(actual.total).toEqual(0);
            expect(actual.entry).toEqual([]);
          })
      ).toBeResolved();
    });
  });
});
