"use strict";

import net from "net";

import {
    extractValue,
} from "./parser.js";

export interface IRedisOptions {
    /**
     * Keep this many connections alive and iterate between them as usage increases
     */
    "poolMax": 1|2|3|4|5|6|7|8;
    "db": number;
    "prefix": string;
    "path": string;
    "host": string;
    "port": number|string;
    "keyPrefix": string;
    "connectionName": string;
    "debug": boolean;
};

export const REDIS_DEFAULTS: IRedisOptions = {
    "poolMax": 1,
    "db": 0,
    "prefix": ``,
    "path": ``,
    "host": ``,
    // "host": `127.0.0.1`,
    "port": 6379,
    "keyPrefix": ``,
    "connectionName": ``,
    "debug": false,
};

export function makeOptions ( redisConfig ) {
    const options: IRedisOptions = {
        ...REDIS_DEFAULTS,
        ...redisConfig,
        "connectionName": `libredis-${process.pid}-${Date.now()}`,
    };

    if ( !redisConfig ) {
        return options;
    }

    if ( redisConfig.path ) {
        options.path = redisConfig.path;
    }
    else {
        if ( redisConfig.host ) {
            options.host = redisConfig.host;
        }
        if ( redisConfig.port > 0 ) {
            options.port = redisConfig.port;
        }
    }

    return options;
}

export function connect ( config ) {
    const options = makeOptions(config);

    const connections = Array.from(
        { "length": options.poolMax },
        () => {
            const conn = net.createConnection(options.path);
            // conn.allowHalfOpen = true;
            conn.write(`CLIENT SETNAME ${options.connectionName}\r\n`);
            return conn;
        }
    );

    const usingMap = new Map();
    let inUse = 0;
    let nextUp = 0;
    return async function* run ( prefix = `app` ) {
        const index = nextUp % connections.length;

        if ( usingMap.has(index) ) {
            const recursive = new Promise(resolve => {
                let timer = setTimeout(() => {
                    clearTimeout(timer);
                    resolve(run(prefix));
                }, 100) // @TODO - exponential backoff
            });
            return await recursive;
        }

        usingMap.set(index, true);
        const conn = await connections[ index ];

        inUse = index;
        nextUp = inUse + 1;


        try {

            if ( conn.isPaused() ) {
                await conn.resume();
            }
            await conn.cork();

            conn.write(`EXISTS ${prefix}:map\r\n`);
            conn.write(`HKEYS ${prefix}:map\r\n`);
            conn.write(`HMGET ${prefix}:map a b c d1\r\n`);
            conn.write(`HGETALL ${prefix}:map\r\n`);
            conn.write(`HGETALL ${prefix}:map\r\n`);
            conn.write(`INFO keys\r\n`);

            console.log(`Connection ${options.connectionName} prefix ${prefix}`);
            console.log(conn.isPaused(), conn.destroyed, conn.connecting, conn.readable, conn.writable);

            await conn.uncork();

            for await ( const data of conn ) {
                const dataStr = data.toString();
                let result;
                let nextStr = dataStr;
                do {
                    [ result, nextStr ] = extractValue(nextStr);
                    yield result;
                }
                while ( nextStr );
                await conn.destroy();
            }
        }
        catch ( error ) {
            console.error(error);
        }

        if ( options.debug === true ) {
            console.log(`Connection ${conn.destroyed ? 'destroyed' : conn.connecting ? 'connecting' : conn.isPaused() ? 'isPaused' : '...is something...'} ${options.connectionName} prefix ${prefix}`);
        }

        if ( conn.destroyed ) {
            await conn.connect(options.path);
        }

        nextUp = index;
        inUse = index - 1;
        usingMap.delete(index);
        return conn;
    }
}
