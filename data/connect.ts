"use strict";

import net from "net";

import {
    extractValue,
} from "./parser";

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
};

export const REDIS_DEFAULTS: IRedisOptions = {
    "poolMax": 6,
    "db": 0,
    "prefix": ``,
    "path": ``,
    "host": ``,
    "port": 0,
    "keyPrefix": ``,
    "connectionName": ``,
}

export function makeOptions ( redisConfig ) {
    const options: IRedisOptions = {
        ...REDIS_DEFAULTS,
        ...redisConfig,
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
    const baseArray = [ ...new Array(options.poolMax) ];
    let connections = baseArray.map(() => {
        return net.createConnection(options.path);
    });

    const usingMap = new Map();
    let inUse = 0;
    let nextUp = 0;
    return async function* getPrefix ( prefix = `app` ) {
        const index = nextUp % connections.length;

        if ( usingMap.has(index) ) {
            let timer = setTimeout(async () => {
                clearTimeout(timer);
                await getPrefix(prefix);
            }, 500); // @TODO - exponential backoff
            return timer;
        }

        usingMap.set(index, true);
        const conn = connections[ index ];

        inUse = index;
        nextUp = inUse + 1;

        conn.write(`EXISTS ${prefix}:map\r\n`);
        conn.write(`HMGET ${prefix}:map a b c d\r\n`);

        try {
            for await ( const data of conn ) {
                const dataStr = data.toString();
                let result;
                let nextStr = dataStr;
                do {
                    [ result, nextStr ] = extractValue(nextStr);
                    yield result;
                }
                while ( nextStr );
            }
        }
        catch ( error ) {
            console.error(error);
        }

        nextUp = index;
        inUse = index - 1;
        usingMap.delete(index);
        return conn;
    }
}


