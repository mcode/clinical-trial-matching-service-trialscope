"use strict";
exports.__esModule = true;
var got_1 = require("got");
var cheerio = require("cheerio");
var parser = require("xml2json");
var url = 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true';
got_1["default"](url).then(function (response) {
    // console.log(response.body);
    console.log(JSON.parse(parser.toJson(response.body)));
    var $ = cheerio.load(response.body, { xmlMode: true });
    //console.log($('clinical_study')[0]);
})["catch"](function (err) {
    console.log(err);
});
//$.ajax({ url: 'your-url', success: function(data) { alert(data); } });
//let req = new XMLHttpRequest();
//req.open('GET', 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true',false)
