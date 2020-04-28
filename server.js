const mapping = require('./mapping'),
  express = require('express'),
  bodyParser = require('body-parser'),
  config = require('./env.js'),
  fetch = require('node-fetch');

const app = express(),
  enviroment = new config().defaultEnvObject();

app.use(bodyParser.json());

app.use(function(_req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With, WU-Api-Key, WU-Api-Secret');

  next();
});

/* Default call*/
app.get('/', function(_req, res) {
  res.status(200).send('Hello from Clinical Trial');
});

/* get trialscope conditions (str) list from code (str) list */
app.post('/getConditions', function(req, res) {
  let codeList = req.body;
  let conditions = mapping.mapConditions(codeList);
  let result = JSON.stringify(Array.from(conditions));
  res.status(200).send(result);
});

/* get clinical trial results*/
app.post('/getClinicalTrial', function(req, res) {
  const myHeaders = new fetch.Headers;
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', 'Bearer ' + enviroment.token);

  const raw = JSON.stringify({query: req.body.inputParam});

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch(enviroment.trialscope_endpoint, requestOptions)
    .then(response => response.text())
    .then(result => {
      res.status(200).send(result);
    })
    .catch(error =>{
      res.status(400).send(error);
    });
});

app.listen(enviroment.port);
