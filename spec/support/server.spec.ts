import e from "express";

const request = require("supertest");
let server = require("../../src/server");



describe("server tests", () => {


    it("responds to /", (done) => {
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect(200, done);

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
            .send({ patientData: { name: "bet" } })
            .set('Accept', 'application/json')
            .expect(500);

    });
    it("responds to /getClinicalTrial with no patientBundle param  ", () => {
        return request(server)
            .post('/getClinicalTrial')
            .send({})
            .set('Accept', 'application/json')
            .expect(400);

    });

});










