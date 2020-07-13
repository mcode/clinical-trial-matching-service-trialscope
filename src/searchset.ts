import { ResearchStudy } from './research-study';
import { TrialScopeResponse, TrialScopeTrial } from './trialscope';

export interface SearchResult {
  mode: string;
  score: number;
}

export interface SearchBundleEntry {
  resource: ResearchStudy;
  search?: SearchResult;
}

export class SearchSet {
  // static attributes
  resourceType = 'Bundle';
  type = 'searchset';
  total: number;
  entry: SearchBundleEntry[] = [];

  constructor(trials: TrialScopeResponse) {

    this.total = trials.data.baseMatches.totalCount;
    let index = 0;

    for (const node of trials.data.baseMatches.edges) {
      const trial: TrialScopeTrial = node.node;
      const study = new ResearchStudy(trial, index)
      this.entry.push({resource: study, search: {mode: "match", score: 1}});
      index++;
    }

  }

}
