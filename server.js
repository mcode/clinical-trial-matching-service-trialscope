const mapping = require('./mapping'),
  express = require('express'),
  bodyParser = require('body-parser'),
  config = require('./env.js'),
  fetch = require('node-fetch');

const app = express(),
  environment = new config().defaultEnvObject();

app.use(bodyParser.json());

app.use(function (_req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With, WU-Api-Key, WU-Api-Secret');

  next();
});

/* Default call*/
app.get('/', function (_req, res) {
  res.status(200).send('Hello from Clinical Trial');
});

/* get trialscope conditions (str) list from code (str) list */
app.post('/getConditions', function (req, res) {
  let codeList = req.body;
  let conditions = mapping.mapConditions(codeList);
  let result = JSON.stringify(Array.from(conditions));
  res.status(200).send(result);
});

/* The api request will be mainly created in this file

@param bundled_query - the string json object of search parameters with the number of results/page and starting place
  
Call this function in the server

*/
function createRequest(bundled_query) {
  let query = bundled_query.query;
  let first = bundled_query.first;
  let after = bundled_query.after;
  var input =
    `
    {
      baseMatches(first: ${first} after: ${JSON.stringify(after)} ${query})
    {
      totalCount
      edges {
        node {
          nctId title conditions gender description detailedDescription
          criteria sponsor overallContactPhone overallContactEmail
          overallStatus armGroups phase minimumAge studyType
          maximumAge sites {
            facility contactName contactEmail contactPhone latitude longitude
          }
        }
        cursor
      }
      pageInfo { endCursor hasNextPage }
    } }`
  return input;
}


/* get clinical trial results*/
app.post('/getClinicalTrial', function (req, res) {
  const myHeaders = new fetch.Headers;
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', 'Bearer ' + environment.token);

  let input = createRequest(req.body)
  const raw = JSON.stringify({ query: input });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch(environment.trialscope_endpoint, requestOptions)
    .then(response => response.text())
    .then(result => {
      res.status(200).send(result);
    })
    .catch(error => {
      res.status(400).send(error);
    });
});

app.use(express.static('public'));
console.log(`Starting server on port ${environment.port}...`);
app.listen(environment.port);
