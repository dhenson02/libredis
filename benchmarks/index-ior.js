"use strict";

const Redis = require("ioredis");

const redis = new Redis({
    "keyPrefix": `test:cc:`,
    "prefix": `test:cc:`,
    "db": 0,
    "host": `127.0.0.1`,
    "port": 6379,
});

redis.on(`ready`, async () => {

setTimeout(async () => {
    const mem1 = process.memoryUsage();
    const start1 = performance.now();

    const promises = Array.from({
        "length": 1000,
    }, ( _, i ) => {
        return redis.hmset(`def8`, [
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
        "length": 1000,
    }, ( _, i ) => {
        return redis.hmget(`def8`, [
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
        console.log(key + ` - ` + (mem2[ key ] - mem1[ key ]));
    }

    console.log(`1: `, ((end1 - start1) / 1000).toFixed(3));
    console.log(`2: `, ((end2 - start2) / 1000).toFixed(3));

    await redis.quit();
}, 10);
});
