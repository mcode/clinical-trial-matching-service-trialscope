import express from 'express';
import { runTrialScopeQuery } from './trialscope';
import * as mapping from './mapping';

import { Bundle, ClinicalTrialMatchingService } from 'clinical-trial-matching-service';

class TrialScopeService extends ClinicalTrialMatchingService {
  constructor() {
    super((patientBundle: Bundle) => {
      return runTrialScopeQuery(patientBundle);
    });

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

export const server = new TrialScopeService();
export default server;

if (module.parent === null) {
  server.listen();
}
