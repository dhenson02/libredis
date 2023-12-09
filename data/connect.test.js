"use strict";

const { expect } = require("chai");
// @ts-ignore
const mocha = require("mocha");

const {
    debugLogger,
} = require("../logger");

const {
    RedisCommandError,
} = require("./parser");

const {
    REDIS_DEFAULTS,
    // RedisConnectError,
    Connect,
} = require("./connect");

describe("Main connection testing", async () => {
    const redis = new Connect({
        ...REDIS_DEFAULTS,
        "keyPrefix": `test:a:`,
        "poolMax": 6,
        "debug": process.env.NODE_ENV === `development`,
    });

    // await redis.clientName(`unit-tests`);

    it("sets hashmap data once", async () => {
        const response = await redis.hmset(`def1`, [
            `a`,
            `1`,
            `b`,
            `2`,
            `c`,
            `3`,
            `d`,
            `4`,
        ]);
        debugLogger(response);
        expect(response).to.deep.equal([
            `OK`,
        ]);
    });

    it("sets hashmap data twice", async () => {
        const response1 = await redis.hmset(`def1a`, [
            `e`,
            `5`,
            `f`,
            `6`,
        ]);
        const response2 = await redis.hmset(`def1b`, [
            `g`,
            `7`,
            `h`,
            `8`,
        ]);
        debugLogger(response1);
        debugLogger(response2);
        expect(response1).to.deep.equal([
            `OK`,
        ]);
        expect(response2).to.deep.equal([
            `OK`,
        ]);
    });

    it("fails to set hashmap data incorrectly, gets error", async () => {
        const response = await redis.hmset(`def1`, [
            `a`,
            `1`,
            `b`,
            `2`,
            `c`,
            `3`,
            `d`,
        ]);
        debugLogger(response);
        const [ data ] = response;
        // expect(status).to.equal(`OK`);
        expect(data).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmset' command`);
    });

    it("gets single hashmap full data dump", async () => {
        const flattenedValues = await redis.hgetall(`def1`);
        debugLogger(flattenedValues);
        expect(flattenedValues).to.be.instanceOf(Array);
        const [ data ] = flattenedValues;
        // expect(status).to.equal(`OK`);
        expect(data).to.deep.equal([
            `a`,
            `1`,
            `b`,
            `2`,
            `c`,
            `3`,
            `d`,
            `4`,
        ]);
    });

    it("gets multi hashmap full data dump", async () => {
        const flattenedValues1 = await redis.hgetall(`def1a`);
        const flattenedValues2 = await redis.hgetall(`def1b`);
        debugLogger(`fv1`, flattenedValues1);
        debugLogger(`fv2`, flattenedValues2);
        expect(flattenedValues1).to.be.instanceOf(Array);
        expect(flattenedValues2).to.be.instanceOf(Array);
        const [data1] = flattenedValues1;
        const [data2] = flattenedValues2;
        // expect(status1).to.equal(`OK`);
        // expect(status2).to.equal(`OK`);
        expect(data1).to.deep.equal([
            `e`,
            `5`,
            `f`,
            `6`,
        ]);
        expect(data2).to.deep.equal([
            `g`,
            `7`,
            `h`,
            `8`,
        ]);
    });

    it("gets individual field values from hashmap data", async () => {
        const values = await redis.hmget(`def1`, [
            `a`,
            `b`,
            `c`,
            `d`,
        ]);
        expect(values).to.be.instanceOf(Array);
        const [ data ] = values;
        // expect(status).to.equal(`OK`);
        expect(data).to.deep.equal([
            `1`,
            `2`,
            `3`,
            `4`,
        ]);
        debugLogger(values);
    });

    it("gets error when missing individual field names for hashmap data", async () => {
        const values = await redis.hmget(`def1`, []);
        debugLogger(values);
        expect(values).to.be.instanceOf(Array);
        const [ data ] = values;
        // expect(status).to.equal(`OK`);
        expect(data).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmget' command`);
    });

    // it("destroys the server with 1000 hits", async () => {
    /*setTimeout(async () => {
        const redis = new Connect({
            "keyPrefix": `test:a:`,
            "poolMax": 6,
        });

        for ( let i = 0; i < 1000; i++ ) {
            redis.hmset(`def${i}`, [
                `a`,
                `1`,
                `b`,
                `2`,
                `c`,
                `3`,
                `d`,
                `4`,
            ]);
            redis.hmget(`def${i}`, [
                `a`,
                `b`,
                `c`,
                `d`,
            ]);
        }

    }, 800);*/
    // });

    setTimeout(async () => {
        const redis = new Connect({
            ...REDIS_DEFAULTS,
            "keyPrefix": `test:b:`,
        });

        const current = await redis.hgetall(`def2`);
        debugLogger(current);
    }, 200);

    it("drops these stupid connections", async () => {
        const total = await redis.drop();
        debugLogger(`Conns dropped: ${total}`);
    });

});
