"use strict";

import { expect } from "chai";
// @ts-ignore
import * as mocha from "mocha";

import {
    RedisCommandError,
} from "./parser.js";

import {
    REDIS_DEFAULTS,
    // RedisConnectError,
    Connect,
} from "./connect.js";

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
        redis.debugLogger(response);
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
        redis.debugLogger(response);
        const [ status, ] = response;
        expect(status).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmset' command`);
    });

    it("gets hashmap full data dump", async () => {
        const flattenedValues = await redis.hgetall(`def1`);
        redis.debugLogger(flattenedValues);
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
        redis.debugLogger(values);
    });

    it("gets error when missing individual field names for hashmap data", async () => {
        const values = await redis.hmget(`def1`, []);
        redis.debugLogger(values);
        const [ status, ] = values;
        expect(status).to.be.instanceOf(RedisCommandError);
        // expect(status.message).to.equal(`ERR wrong number of arguments for 'hmget' command`);
    });

    setTimeout(async () => {
        const redis = new Connect({
            ...REDIS_DEFAULTS,
            "keyPrefix": `test:b:`,
        });

        const current = await redis.hgetall(`def2`);
        redis.debugLogger(current);
    }, 1000);

    it("drops these stupid connections", async () => {
        const total = await redis.drop();
        redis.debugLogger(`Conns dropped: ${total}`);
    });

});
