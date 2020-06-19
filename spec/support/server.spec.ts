
import "jasmine";
const request = require("supertest");
let server = require("../../src/server");



describe("server tests", () => {


    it("responds to /", (done) => {
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect(200, done);

    });
});










