import { isTrialScopeResponse, isTrialScopeErrorResponse, makeSearchSet } from '../src/trialscope';
import { SearchSet, fhir } from 'clinical-trial-matching-service';

describe('isTrialScopeResponse', () => {
  it('does not fail with a null data field', () => {
    expect(isTrialScopeResponse({ data: null })).toBe(false);
  });
  it('does not fail with a null baseMatches field', () => {
    expect(isTrialScopeResponse({ data: { baseMatches: null } })).toBe(false);
  });
});

describe('isTrialScopeErrorResponse', () => {
  it('does not fail with a null error field', () => {
    expect(isTrialScopeErrorResponse({ errors: null })).toBe(false);
  });
  it('requires errors be an array', () => {
    expect(isTrialScopeErrorResponse({ errors: [] })).toBe(true);
    expect(isTrialScopeErrorResponse({ errors: 5 })).toBe(false);
  });
});

describe('making-searchset-with-matchscores', () => {
  const matchScores: number[] = [0, 0.5, 1];
  const study1: fhir.ResearchStudy = { resourceType: 'ResearchStudy', id: '1' };
  const study2: fhir.ResearchStudy = { resourceType: 'ResearchStudy', id: '2' };
  const study3: fhir.ResearchStudy = { resourceType: 'ResearchStudy', id: '3' };
  const studies: fhir.ResearchStudy[] = [study1, study2, study3];
  const searchSet: SearchSet = makeSearchSet(studies, matchScores);

  it('creates proper searchet', () => {
    expect(searchSet.resourceType == 'Bundle' && searchSet.type == 'searchset' && searchSet.total == 3).toBe(true);
  });

  it('sets match scores correctly', () => {
    expect(searchSet.entry[0].search.score).toBe(0);
    expect(searchSet.entry[1].search.score).toBe(0.5);
    expect(searchSet.entry[2].search.score).toBe(1);
  });
});
