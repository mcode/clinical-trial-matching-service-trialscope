import express from 'express';
import { runTrialScopeQuery, runRawTrialScopeQuery } from './trialscope';

const mapping = require('./mapping'),
  bodyParser = require('body-parser'),
  config = require('../env.js');

const app = express(),
  environment = new config().defaultEnvObject();

app.use(bodyParser.json({
  // Need to increase the payload limit to receive patient bundles
  limit: "10MB"
}));

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
  const codeList = req.body;
  const conditions = mapping.mapConditions(codeList);
  const result = JSON.stringify(Array.from(conditions));
  res.status(200).send(result);
});

/**
 * Get clinical trial results (the "main" API).
 */
app.post('/getClinicalTrial', function (req, res) {
  if ('patientData' in req.body) {
    const patientBundle = typeof req.body.patientData === 'string' ? JSON.parse(req.body.patientData) : req.body.patientData;
    runTrialScopeQuery(patientBundle).then(result => {
      res.status(200).send(JSON.stringify(result));
    }).catch(error => {
      console.error(error);
      res.status(500).send(`"Error from server"`);
    });
  } else {
    // Backwards-compat: if there is no patient body, just run the query directly
    runRawTrialScopeQuery(req.body.inputParam).then(result => {
      res.status(200).send(result);
    }).catch(error => {
      console.error(error);
      res.status(400).send({ error: error.toString() });
    });
    return;
  }
});

app.use(express.static('public'));
console.log(`Starting server on port ${environment.port}...`);
var server = app.listen(environment.port);
module.exports = server;