"use strict";

import { expect } from "chai";
// @ts-ignore
import * as mocha from "mocha";

import {
    RedisCommandError,
} from "./parser.js";

import {
    // RedisConnectError,
    Connect,
} from "./connect.js";

describe("Main connection testing", async () => {
    const redis = new Connect({
        "keyPrefix": `test:a:`,
        poolMax: 6,
        debug: process.env.NODE_ENV === `development`,
    });

    // it("fails to connect with bad options", async () => {
    //
    //     const redis = new Connect({
    //         "host": "192.168.0.8",
    //         "port": 9999,
    //         "keyPrefix": `test:a:`,
    //         poolMax: 1,
    //         debug: process.env.NODE_ENV === `development`,
    //     });
    //     console.log(redis instanceof RedisConnectError);
    // });

    // it("sets hashmap data", async () => {
    //     for await ( const response of redis.hmset(`def1`, [
    //         `a`,
    //         `1`,
    //         `b`,
    //         `2`,
    //         `c`,
    //         `3`,
    //         `d`,
    //     ]) ) {
    //         console.log(`r: `, response);
    //     }
    // });

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
        console.log(response);
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
        console.log(response);
        const [ status, ] = response;
        expect(status).to.be.instanceOf(RedisCommandError);
        expect(status.message).to.equal(`ERR wrong number of arguments for 'hmset' command`);
    });

    // it("gets hashmap full data dump", async () => {
    //     for await ( const flattenedValues of redis.hgetall(`def1`) ) {
    //         expect(flattenedValues)
    //             .to
    //             .deep
    //             .equal([
    //                 `a`,
    //                 `1`,
    //                 `b`,
    //                 `2`,
    //                 `c`,
    //                 `3`,
    //                 `d`,
    //                 `4`,
    //             ]);
    //         console.log(flattenedValues);
    //     }
    // });

    it("gets hashmap full data dump", async () => {
        const flattenedValues = await redis.hgetall(`def1`);
        console.log(flattenedValues);
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
        console.log(values);
    });

    it("gets error when missing individual field names for hashmap data", async () => {
        const values = await redis.hmget(`def1`, []);
        console.log(values);
        const [ status, ] = values;
        expect(status).to.be.instanceOf(RedisCommandError);
        expect(status.message).to.equal(`ERR wrong number of arguments for 'hmget' command`);
    });

    setTimeout(async () => {
        const redis = new Connect({
            "keyPrefix": `test:b:`,
        });

        const current = await redis.hgetall(`def2`);
        console.log(current);
    }, 1000);

    it("drops these stupid connections", async () => {
        const total = await redis.drop();
        console.log(`Conns dropped: ${total}`);
    });

});
