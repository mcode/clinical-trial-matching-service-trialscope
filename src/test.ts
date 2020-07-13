import * as fs from 'fs';
import * as parser from 'xml2json';
function addSummary() {
    //let nctId :string = this.identifier[0].value; 
    let nctId = 'NCT04150146';
    let filePath :string = `./AllPublicXML/${nctId.substr(0, 7)}xxxx/${nctId}.xml`;
    let summary : string;
    fs.readFile(filePath, function (err, data) {
      let json = JSON.parse(parser.toJson(data));
      summary = json.clinical_study.brief_summary.textblock;
      console.log(summary);
    });

}

function addPhase() {
    //let nctId :string = this.identifier[0].value; 
    let nctId = 'NCT04150146';
    let filePath :string = `./AllPublicXML/${nctId.substr(0, 7)}xxxx/${nctId}.xml`;
    let phase : string;
    fs.readFile(filePath, function (err, data) {
      let json = JSON.parse(parser.toJson(data));
      phase = json.clinical_study.phase;
      console.log(phase);
    });
}

function addStudyType() {
    //let nctId :string = this.identifier[0].value; 
    let nctId = 'NCT04150146';
    let filePath :string = `./AllPublicXML/${nctId.substr(0, 7)}xxxx/${nctId}.xml`;
    let studytype : string; 
    fs.readFile(filePath, function (err, data) {
      let json = JSON.parse(parser.toJson(data));
      studytype = json.clinical_study.study_type;
      console.log(studytype);
    });

}
addSummary();
addPhase();
addStudyType();