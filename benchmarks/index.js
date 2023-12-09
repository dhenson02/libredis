"use strict";

const { Connect, } = require("libredis");
const { convertBytesToString, } = require("./util");

const redis = new Connect({
    "keyPrefix": `test:aa:`,
    // "poolMax": 16,
});

setTimeout(async () => {
    await redis.clientName(`perf-test`);

    const mem1 = process.memoryUsage();
    const start1 = performance.now();

    const promises = Array.from({
        "length": 10000,
    }, ( _, i ) => {
        return redis.hmset(`def2`, [
            `z${i}`,
            String(i + i),
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

    await Promise.all(promises);

    const end1 = performance.now();

    const start2 = performance.now();

    const promises2 = Array.from({
        "length": 10000,
    }, ( _, i ) => {
        return redis.hmget(`def2`, [
            `z${i}`,
            `a`,
            `b`,
            `c`,
            `d`,
        ]);
    });

    await Promise.all(promises2);

    const end2 = performance.now();

    const mem2 = process.memoryUsage();
    for ( const key of Object.keys(mem1) ) {
        console.log(key + `: ` + convertBytesToString(mem2[ key ] - mem1[ key ]));
    }

    console.log(`1: `, ((end1 - start1) / 1000).toFixed(3));
    console.log(`2: `, ((end2 - start2) / 1000).toFixed(3));
    await redis.drop();
}, 10);
