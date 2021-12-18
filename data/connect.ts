"use strict";

import net from "net";

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
    "poolMax": 1,
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

export const types = {
    "+": `string`,
    "$": `bulkString`,
    "*": `array`,
    ":": `number`,
    "-": `error`,
};

export const coerceTypes = {
    "+": function getString ( subStr ) {
        let i = 1;
        while ( subStr.charAt(i) !== `\\` && subStr.charAt(i + 1) !== `r` ) {
            i += 1;
        }
        return [
            subStr.slice(1, i),
            subStr.slice(i + 4),
        ];
    },

    "$": function getString ( subStr ) {
        // $-1 is null value inside array
        if ( subStr.charAt(1) === `-` ) {
            return [
                null,
                subStr.slice(7),
            ];
        }

        let i = 1;
        let charCount = ``;
        while ( subStr.charAt(i) !== `\\` && subStr.charAt(i + 1) !== `r` ) {
            charCount += subStr.charAt(i);
            i += 1;
        }
        return [
            subStr.slice(i + 4, i + 4 + ~~charCount),
            subStr.slice(i + 4 + ~~charCount + 4),
        ];
    },

    "*": function getString ( subStr ) {
        let i = 1;
        let char = ``;
        while ( subStr.charAt(i) !== `\\` && subStr.charAt(i + 1) !== `r` ) {
            char += subStr.charAt(i);
            i += 1;
        }
        return [
            new Array(~~char),
            subStr.slice(i + 4),
        ];
    },

    ":": function getString ( subStr ) {
        let i = 1;
        let char = ``;
        while ( subStr.charAt(i) !== `\\` && subStr.charAt(i + 1) !== `r` ) {
            char += subStr.charAt(i);
            i += 1;
        }
        return [
            ~~char,
            subStr.slice(i + 4),
        ];
    },

    "-": function getError ( subStr ) {
        let i = 1;
        while ( subStr.charAt(i) !== `\\` && subStr.charAt(i + 1) !== `r` ) {
            i += 1;
        }
        return [
            new Error(subStr.slice(1, i)),
            subStr.slice(i + 4),
        ];
    },
};

export function extractValue ( subStr ) {
    const type = subStr.charAt(0);
    const getter = coerceTypes[ type ];

    const [
        result,
        nextStr,
    ] = getter(subStr);

    if ( nextStr ) {
        if ( type === `*` ) {
            return result.reduce(( fullArray, item, i ) => {
                const lastValue = fullArray[ fullArray.length - 1 ];
                fullArray[ i ] = extractValue(lastValue ?? nextStr);
                return fullArray;
            }, result);
        }

        return extractValue(nextStr);
    }

    return result;
}

export function connect ( config ) {
    const options = makeOptions(config);
    const baseArray = [ ...new Array(options.poolMax) ];
    let connections = baseArray.map(() => {
        let conn = net.createConnection(options.path);

        return conn
        // Pretty sure both of these event handlers are not necessary
        //     .on(`end`, () => {
        //         connections = connections.filter(conn1 => conn1 !== conn);
        //         conn = null;
        //     })
            // .on(`error`, ( err ) => {
            //     conn.end();
            //     throw err;
            // });
    });

    let inUse = 0;
    let nextUp = 0;
    return async function* getPrefix ( prefix = `app` ) {
        const index = nextUp % connections.length;
        const conn = connections[ index ];
        inUse = index;
        nextUp = inUse + 1;

        conn.write(`HMGET ${prefix}:map a b c d\r\n`);

        try {
            for await ( const data of conn ) {
                console.log(data.toString());
                yield extractValue(data.toString());
            }
        }
        catch ( error ) {
            console.error(error);
        }

        nextUp = index;
        inUse = index - 1;
        return conn;
    }
}


