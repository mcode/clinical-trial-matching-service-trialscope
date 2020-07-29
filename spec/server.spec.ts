import request from 'supertest';

import { TrialScopeService } from '../src/server';
import * as trialscope from '../src/trialscope';
import http from 'http';

describe('server', () => {
  let service: TrialScopeService;
  let server: http.Server;
  beforeAll(() => {
    service = new TrialScopeService({ port: 0 });
    server = service.listen();
  });
  // Reset the request generator after each test (currently gets modified only
  // in one test)
  afterEach(() => {
    trialscope.setRequestGenerator();
  });
  it('responds to /', () => {
    return request(server).get('/').set('Accept', 'application/json').expect(200);
  });

  it('responds to /getConditions', () => {
    return request(server).post('/getConditions').set('Accept', 'application/json').expect(200);
  });
});
