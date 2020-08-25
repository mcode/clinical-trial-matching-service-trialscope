import express from 'express';
import TrialScopeQueryRunner from './trialscope';
import * as mapping from './mapping';

import {
  fhir,
  ClinicalTrialGovService,
  ClinicalTrialMatchingService,
  configFromEnv
} from 'clinical-trial-matching-service';
import * as dotenv from 'dotenv-flow';

export class TrialScopeService extends ClinicalTrialMatchingService {
  queryRunner: TrialScopeQueryRunner;
  backupService: ClinicalTrialGovService;

  constructor(config: Record<string, string | number>) {
    super((patientBundle: fhir.Bundle) => {
      return this.queryRunner.runQuery(patientBundle);
    }, config);

    // Create the query runner if possible
    if (!config.endpoint) throw new Error('Missing configuration value for TRIALSCOPE_ENDPOINT');
    if (!config.token) throw new Error('Missing configuration value for TRIALSCOPE_TOKEN');

    // TODO: Make this configurable
    this.backupService = new ClinicalTrialGovService('clinicaltrial-backup-cache');
    this.queryRunner = new TrialScopeQueryRunner(
      config.endpoint.toString(),
      config.token.toString(),
      this.backupService
    );

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

  init(): Promise<this> {
    return new Promise<this>((resolve, reject) => {
      this.backupService.init().then(() => {
        resolve(this);
      }, reject);
    });
  }
}

export function start(): Promise<TrialScopeService> {
  return new Promise((resolve, reject) => {
    // Use dotenv-flow to load local configuration from .env files
    dotenv.config({
      // The environment variable to use to set the environment
      node_env: process.env.NODE_ENV,
      // The default environment to use if none is set
      default_node_env: 'development'
    });
    const service = new TrialScopeService(configFromEnv('TRIALSCOPE_'));
    service.init().then(() => {
      service.listen();
      resolve(service);
    }, reject);
  });
}

/* istanbul ignore next: can't exactly load this directly via test case */
if (module.parent === null) {
  start().catch((error) => {
    console.error('Could not start service:');
    console.error(error);
  });
}
