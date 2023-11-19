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

    it("sets hashmap data", async () => {
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
        const [ status, ] = response;
        expect(status).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmset' command`);
    });

    it("gets hashmap full data dump", async () => {
        const flattenedValues = await redis.hgetall(`def1`);
        debugLogger(flattenedValues);
        expect(flattenedValues)
            .to
            .deep
            .equal([[
                `a`,
                `1`,
                `b`,
                `2`,
                `c`,
                `3`,
                `d`,
                `4`,
            ]]);
    });

    it("gets individual field values from hashmap data", async () => {
        const values = await redis.hmget(`def1`, [
            `a`,
            `b`,
            `c`,
            `d`,
        ]);
        expect(values)
            .to
            .deep
            .equal([
                // `OK`,
                [
                    `1`,
                    `2`,
                    `3`,
                    `4`,
                ]
            ]);
        debugLogger(values);
    });

    it("gets error when missing individual field names for hashmap data", async () => {
        const values = await redis.hmget(`def1`, []);
        debugLogger(values);
        const [ status, ] = values;
        expect(status).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmget' command`);
    });

    // it("destroys the server with 1000 hits", async () => {
    setTimeout(async () => {
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

    }, 800);
    // });

    setTimeout(async () => {
        const redis = new Connect({
            ...REDIS_DEFAULTS,
            "keyPrefix": `test:b:`,
        });

        const current = await redis.hgetall(`def2`);
        debugLogger(current);
    }, 1000);

    it("drops these stupid connections", async () => {
        const total = await redis.drop();
        debugLogger(`Conns dropped: ${total}`);
    });

});
