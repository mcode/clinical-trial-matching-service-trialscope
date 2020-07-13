"use strict";
exports.__esModule = true;
var fs = require("fs");
var parser = require("xml2json");
function addSummary() {
    //let nctId :string = this.identifier[0].value; 
    var nctId = 'NCT04150146';
    var filePath = "./AllPublicXML/" + nctId.substr(0, 7) + "xxxx/" + nctId + ".xml";
    var summary;
    fs.readFile(filePath, function (err, data) {
        var json = JSON.parse(parser.toJson(data));
        summary = json.clinical_study.brief_summary.textblock;
        console.log(summary);
    });
}
function addPhase() {
    //let nctId :string = this.identifier[0].value; 
    var nctId = 'NCT04150146';
    var filePath = "./AllPublicXML/" + nctId.substr(0, 7) + "xxxx/" + nctId + ".xml";
    var phase;
    fs.readFile(filePath, function (err, data) {
        var json = JSON.parse(parser.toJson(data));
        phase = json.clinical_study.phase;
        console.log(phase);
    });
}
function addStudyType() {
    //let nctId :string = this.identifier[0].value; 
    var nctId = 'NCT04150146';
    var filePath = "./AllPublicXML/" + nctId.substr(0, 7) + "xxxx/" + nctId + ".xml";
    var studytype;
    fs.readFile(filePath, function (err, data) {
        var json = JSON.parse(parser.toJson(data));
        studytype = json.clinical_study.study_type;
        console.log(studytype);
    });
}
addSummary();
addPhase();
addStudyType();
