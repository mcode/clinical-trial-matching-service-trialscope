import request from 'supertest';

import server from '../src/server';
import * as trialscope from '../src/trialscope';

describe('server', () => {
  // Reset the request generator after each test (currently gets modified only
  // in one test)
  afterEach(() => {
    trialscope.setRequestGenerator();
  });
  it('responds to /', () => {
    return request(server).get('/').set('Accept', 'application/json').expect(200);
  });

  it('responds to / with hello from clinical trial', () => {
    return request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('Hello from Clinical Trial');
      });
  });

  it('responds to /getConditions', () => {
    return request(server).post('/getConditions').set('Accept', 'application/json').expect(200);
  });

  it('responds to /getClinicalTrial with improper patient bundle', () => {

    return request(server)
      .post('/getClinicalTrial')
      .send({ patientData: {} })
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('responds to /getClinicalTrial with no patientBundle param', () => {
    return request(server).post('/getClinicalTrial').send({}).set('Accept', 'application/json').expect(400);
  });

  it('handles request failing', () => {
    trialscope.setRequestGenerator(jasmine.createSpy('https.request').and.throwError('Example request error'));
    return request(server)
      .post('/getClinicalTrial')
      .send({
        patientData: {
          resourceType: 'Bundle',
          type: 'collection',
          entry: []
        }
      })
      .set('Accept', 'application/json')
      .expect(500);
  });

});
