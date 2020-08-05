"use strict";
exports.__esModule = true;
exports.downloadRemoteBackups = void 0;
var https = require("https");
var fs = require("fs");
//import { downloadRemoteBackups, TrialBackup } from './trialbackup';
var child_process_1 = require("child_process");
var parser = require("xml2json");
function downloadRemoteBackups(ids) {
    var url = 'https://clinicaltrials.gov/ct2/download_studies?term=';
    for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
        var id = ids_1[_i];
        url += id + "+OR+";
    }
    //remove trailing +OR+
    url = url.slice(0, -4);
    console.log(url);
    var file = fs.createWriteStream("backup.zip");
    return new Promise(function (resolve, reject) {
        try {
            var request = https.get(url, function (response) {
                console.log('begin');
                response.pipe(file).on('close', function () {
                    child_process_1.exec('unzip ./backup -d ./backups/', function (error, stdout, stderr) {
                        console.log('no');
                        resolve();
                    });
                });
            });
        }
        catch (err) {
            reject(err);
        }
        console.log('yes');
    });
}
exports.downloadRemoteBackups = downloadRemoteBackups;
/* exec(`curl ${url} --output spec/data/backup.zip && unzip spec/data/backup.zip`, function () {
   
 }); */
downloadRemoteBackups(['NCT03587740', 'NCT02513394']).then(function () {
    //   console.log(res);
    var filePath = "./backups/NCT02513394.xml";
    var data = fs.readFileSync(filePath, { encoding: 'utf8' });
    var json = JSON.parse(parser.toJson(data));
    console.log(json);
});
