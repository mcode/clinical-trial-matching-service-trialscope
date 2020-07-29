import express from 'express';
import { runTrialScopeQuery } from './trialscope';
import * as mapping from './mapping';

import { Bundle, ClinicalTrialMatchingService } from 'clinical-trial-matching-service';

export class TrialScopeService extends ClinicalTrialMatchingService {
  constructor(config?: Record<string, string | number>) {
    super((patientBundle: Bundle) => {
      return runTrialScopeQuery(patientBundle);
    }, config);

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
  new TrialScopeService().listen();
}
