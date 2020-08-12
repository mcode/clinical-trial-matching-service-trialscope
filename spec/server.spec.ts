import request from 'supertest';

import { TrialScopeService } from '../src/server';
import http from 'http';

describe('server', () => {
  let service: TrialScopeService;
  let server: http.Server;
  beforeAll(() => {
    service = new TrialScopeService({ endpoint: 'http://localhost/', token: 'ignored', port: 0 });
    server = service.listen();
  });
  afterAll(() => {
    service.close();
  });
  it('responds to /', () => {
    return request(server).get('/').set('Accept', 'application/json').expect(200);
  });

  it('responds to /getConditions', () => {
    return request(server).post('/getConditions').set('Accept', 'application/json').expect(200);
  });
});
