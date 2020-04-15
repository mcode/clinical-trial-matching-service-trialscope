var jsonMapping = require("./condition_snomed.json");

/* Takes (str) list of snomed codes and returns (str)
list of related trialscope conditions for all codes*/
exports.mapConditions = function (codeList) {
    var conditions = new Set();
    for (index = 0; index < codeList.length; index++) {
        conditions = union(conditions, codeToConditions(codeList[index]));
    }
    return conditions;
};

/* Takes snomed code (str) and returns (str) list
of related trialscope conditions */
function codeToConditions(code) {
    conditions = new Set();
    for(var term in jsonMapping){
        if(jsonMapping[term].includes(code)){
            conditions.add(term);
        }
    }
    return conditions;
}

/* Set union function - returns new set */
function union(setA, setB) {
    let _union = new Set(setA)
    for (let elem of setB) {
        _union.add(elem)
    }
    return _union
}