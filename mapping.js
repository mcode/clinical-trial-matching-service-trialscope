const jsonMapping = require('./condition_snomed.json');

/**
 * Takes (str) list of snomed codes and returns (str)
 * list of related trialscope conditions for all codes
 * @param {string[]} codeList the list of codes
 * @return {Set<string>} a set of codes
 */
exports.mapConditions = function(codeList) {
  let conditions = new Set();
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
function codeToConditions(code) {
  let conditions = new Set();
  for (let term in jsonMapping) {
    if (jsonMapping[term].includes(code)) {
      conditions.add(term);
    }
  }
  return conditions;
}

/* Set union function - returns new set */
function union(setA, setB) {
  let _union = new Set(setA);
  for (let elem of setB) {
    _union.add(elem);
  }
  return _union;
}
