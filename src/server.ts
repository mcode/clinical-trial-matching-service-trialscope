import express from 'express';
import TrialScopeQueryRunner from './trialscope';
import * as mapping from './mapping';

import { Bundle, ClinicalTrialMatchingService, configFromEnv } from 'clinical-trial-matching-service';
import * as dotenv from 'dotenv-flow';

export class TrialScopeService extends ClinicalTrialMatchingService {
  queryRunner: TrialScopeQueryRunner;
  constructor(config: Record<string, string | number>) {
    super((patientBundle: Bundle) => {
      return this.queryRunner.runQuery(patientBundle);
    }, config);

    // Create the query runner if possible
    if (!config.endpoint) throw new Error('Missing configuration value for TRIALSCOPE_ENDPOINT');
    if (!config.token) throw new Error('Missing configuration value for TRIALSCOPE_TOKEN');

    this.queryRunner = new TrialScopeQueryRunner(config.endpoint.toString(), config.token.toString());

    // Add our customizations

    /* get trialscope conditions (str) list from code (str) list */
    this.app.post('/getConditions', function (req, res) {
      const codeList = req.body as string[];
      const conditions = mapping.mapConditions(codeList);
      const result = JSON.stringify(Array.from(conditions));
      res.status(200).send(result);
    });

    this.app.use(express.static('public'));
  }
}

if (module.parent === null) {
  // Use dotenv-flow to load local configuration from .env files
  dotenv.config({
    // The environment variable to use to set the environment
    node_env: process.env.NODE_ENV,
    // The default environment to use if none is set
    default_node_env: 'development'
  });
  new TrialScopeService(configFromEnv('TRIALSCOPE_')).listen();
}
