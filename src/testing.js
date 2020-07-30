"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.getRemoteBackupTrial = void 0;
var got_1 = require("got");
var parser = require("xml2json");
function getRemoteBackupTrial(nctId) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, json;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true';
                    return [4 /*yield*/, got_1["default"](url)];
                case 1:
                    response = _a.sent();
                    json = JSON.parse(parser.toJson(response.body));
                    console.log(json);
                    return [2 /*return*/];
            }
        });
    });
}
exports.getRemoteBackupTrial = getRemoteBackupTrial;
getRemoteBackupTrial("");
/*const json =JSON.parse(parser.toJson(response.body));
return json;
got(url).then(response => {
   // console.log(response.body);
   console.log(JSON.parse(parser.toJson(response.body)));
    const $ = cheerio.load(response.body, {xmlMode: true});
    //console.log($('clinical_study')[0]);
  }).catch(err => {
    console.log(err);
  });
  */
//$.ajax({ url: 'your-url', success: function(data) { alert(data); } });
//let req = new XMLHttpRequest();
//req.open('GET', 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true',false)
