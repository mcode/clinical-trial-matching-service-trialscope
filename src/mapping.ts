const jsonMapping = require('../data/condition_snomed.json');

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
};

/**
 * Takes snomed code (str) and returns (str) list
 * of related trialscope conditions
 * @param {string} code the code to look up
 * @return {Set<string>} a set of codes
 */
function codeToConditions(code: string): Set<string> {
  let conditions = new Set<string>();
  for (let term in jsonMapping) {
    if (jsonMapping[term].includes(code)) {
      conditions.add(term);
    }
  }
  return conditions;
}

/* Set union function - returns new set */
function union<T>(setA: Set<T>, setB: Set<T>) {
  let _union = new Set<T>(setA);
  for (let elem of setB) {
    _union.add(elem);
  }
  return _union;
}
