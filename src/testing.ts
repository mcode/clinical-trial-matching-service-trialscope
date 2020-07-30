import got from 'got';
import * as cheerio from 'cheerio';
import * as parser from 'xml2json';

let url= 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true';

got(url).then(response => {
   // console.log(response.body);
   console.log(JSON.parse(parser.toJson(response.body)));
    const $ = cheerio.load(response.body, {xmlMode: true});
    //console.log($('clinical_study')[0]);
  }).catch(err => {
    console.log(err);
  });
//$.ajax({ url: 'your-url', success: function(data) { alert(data); } });

//let req = new XMLHttpRequest();

//req.open('GET', 'https://clinicaltrials.gov/ct2/show/NCT01230047?displayxml=true',false)
