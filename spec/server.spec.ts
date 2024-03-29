import request from 'supertest';

import { TrialScopeService, start } from '../src/server';
import http from 'http';
import { SearchSet } from 'clinical-trial-matching-service';

describe('TrailScopeService', () => {
  describe('when listening', () => {
    let service: TrialScopeService;
    let server: http.Server;
    beforeAll(async () => {
      service = new TrialScopeService({ endpoint: 'http://localhost/', token: 'ignored', port: 0 });
      await service.init();
      server = await service.listen();
    });
    afterAll(() => {
      return service.close();
    });

    it('responds to /', () => {
      return request(server).get('/').set('Accept', 'application/json').expect(200);
    });

    it('uses the query runner', () => {
      const runQuery = spyOn(service.queryRunner, 'runQuery').and.callFake(() => {
        return Promise.resolve(new SearchSet([]));
      });
      return request(server)
        .post('/getClinicalTrial')
        .send({ resourceType: 'Bundle', type: 'collection', entry: [] })
        .set('Accept', 'application/json')
        .expect(200)
        .then(() => {
          expect(runQuery).toHaveBeenCalled();
        });
    });
  });

  describe('constructor', () => {
    it("raises an error if the endpoint isn't given", () => {
      expect(() => {
        new TrialScopeService({});
      }).toThrowError('Missing configuration value for TRIALSCOPE_ENDPOINT');
    });

    it("raises an error if the token isn't given", () => {
      expect(() => {
        new TrialScopeService({ endpoint: 'http://www.example.com/' });
      }).toThrowError('Missing configuration value for TRIALSCOPE_TOKEN');
    });
  });
});

describe('start()', () => {
  const testedValues = ['NODE_ENV', 'TRIALSCOPE_ENDPOINT', 'TRIALSCOPE_TOKEN', 'TRIALSCOPE_PORT'];
  const initialEnv: Record<string, string | undefined> = {};
  beforeAll(() => {
    // Store the environment variables we're going to clobber in these tests
    for (const key of testedValues) {
      if (key in process.env) initialEnv[key] = process.env[key];
    }
  });
  afterAll(() => {
    // Restore the environment variables we clobbered
    for (const key of testedValues) {
      if (key in initialEnv) {
        process.env[key] = initialEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });
  it('loads configuration via dotenv-flow', () => {
    process.env.NODE_ENV = 'test';
    process.env.TRIALSCOPE_ENDPOINT = 'https://www.example.com/test/endpoint';
    process.env.TRIALSCOPE_PORT = '0';
    process.env.TRIALSCOPE_TOKEN = 'an example token';
    return expectAsync(
      start().then((service) => {
        expect(service.port).toEqual(0);
        expect(service.queryRunner.endpoint).toEqual('https://www.example.com/test/endpoint');
        // Intentially bypass private for testing purposes
        expect(service.queryRunner['token']).toEqual('an example token');
      })
    ).toBeResolved();
  });
});
