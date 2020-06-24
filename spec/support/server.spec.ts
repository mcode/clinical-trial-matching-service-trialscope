import request from 'supertest';
import server from '../../src/server';

describe("server tests", () => {
  it("responds to /", () => {
    return request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(200);
  });

  it("responds to / with hello from clinical trial ", () => {
    return request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe("Hello from Clinical Trial");
      });
  });

  it("responds to /getConditions ", () => {
    return request(server)
      .post('/getConditions')
      .set('Accept', 'application/json')
      .expect(200);
  });

  it("responds to /getClinicalTrial with improper patient bundle ", () => {
    return request(server)
      .post('/getClinicalTrial')
      .send({ patientData: {} })
      .set('Accept', 'application/json')
      .expect(400);
  });

  it("responds to /getClinicalTrial with no patientBundle param  ", () => {
    return request(server)
      .post('/getClinicalTrial')
      .send({})
      .set('Accept', 'application/json')
      .expect(400);
   });
});


