import jsonMapping from '../data/condition_snomed.json';

/**
 * Takes (str) list of snomed codes and returns (str)
 * list of related trialscope conditions for all codes
 * @param {string[]} codeList the list of codes
 * @return {Set<string>} a set of codes
 */
export function mapConditions(codeList: string[]): Set<string> {
  let conditions = new Set<string>();
  for (let index = 0; index < codeList.length; index++) {
    conditions = union(conditions, codeToConditions(codeList[index]));
  }
  return conditions;
}

/**
 * Takes snomed code (str) and returns (str) list
 * of related trialscope conditions
 * @param {string} code the code to look up
 * @return {Set<string>} a set of codes
 */
function codeToConditions(code: string): Set<string> {
  const conditions = new Set<string>();
  // This is necessary for eslint-typescript, NOT TypeScript - TypeScript
  // synthesizes types for the JSON file, but eslint-typescript doesn't
  // understand that and thinks (incorrectly) jsonMapping is any.
  const mapping = jsonMapping as Record<string, string[]>;
  for (const term in mapping) {
    if (mapping[term].includes(code)) {
      conditions.add(term);
    }
  }
  return conditions;
}

/* Set union function - returns new set */
function union<T>(setA: Set<T>, setB: Set<T>) {
  const _union = new Set<T>(setA);
  for (const elem of setB) {
    _union.add(elem);
  }
  return _union;
}
