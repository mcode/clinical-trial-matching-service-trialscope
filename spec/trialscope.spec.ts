import { isTrialScopeResponse, isTrialScopeErrorResponse } from '../src/trialscope';

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
