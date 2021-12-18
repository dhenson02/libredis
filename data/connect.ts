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

export type extractedValueType = (
    Array<string|number|Error|null|extractedValueType[]>
);

export const REDIS_DEFAULTS: IRedisOptions = {
    "poolMax": 2,
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

export const coerceTypes = {
    "$": function getBulkString ( subStr ) {
        // $-1 is null value inside array
        if ( subStr.charAt(1) === `-` ) {
            return [
                null,
                subStr.slice(5),
            ];
        }

        let i = 1;
        let charCount = ``;
        while ( subStr.charAt(i) !== `\r` ) {
            charCount += subStr.charAt(i);
            i += 1;
        }
        return [
            subStr.slice(i + 2, i + 2 + ~~charCount),
            subStr.slice(i + 2 + ~~charCount + 2),
        ];
    },

    ":": function getString ( subStr ) {
        let i = 1;
        let char = ``;
        while ( subStr.charAt(i) !== `\r` ) {
            char += subStr.charAt(i);
            i += 1;
        }
        return [
            ~~char,
            subStr.slice(i + 2),
        ];
    },

    "-": function getError ( subStr ) {
        let i = 1;
        while ( subStr.charAt(i) !== `\r` ) {
            i += 1;
        }
        return [
            new Error(subStr.slice(1, i)),
            subStr.slice(i + 2),
        ];
    },
};

export function extractValue ( subStr, currentArray = [] ): extractedValueType {
    const type = subStr.charAt(0);

    switch ( type ) {
        case `+`:
            currentArray.push(subStr.slice(1, -2));
            break;

        case `*`: {
            let i = 1;
            // let char = ``;
            while ( subStr.charAt(i) !== `\r` ) {
                // char += subStr.charAt(i);
                i += 1;
            }

            let nextStr = subStr.slice(i + 2);
            // const total = ~~char;
            const container = [
                // ...new Array(total)
            ];
            // let _nextStr = ``;

            // for ( let a = 0; a < total; a++ ) {
                extractValue(nextStr, container);
            // }

            currentArray.push(container);
            break;

            // return result[ 0 ].reduce(( fullArray, item, i ) => {
            //     const lastValue = i > 0
            //         ? fullArray[ i - 1 ]
            //         : result;
            //
            //     fullArray.push(extractValue(lastValue[ 1 ]));
            //
            //     return fullArray;
            // }, []);
        }

        default:

            const getter = coerceTypes[ type ];

            const [
                result,
                nextStr,
            ] = getter(subStr);

            currentArray.push(result);

            if ( nextStr ) {
                return extractValue(nextStr, currentArray);
            }

            break;
    }

    return currentArray;
}

export function connect ( config ) {
    const options = makeOptions(config);
    const baseArray = [ ...new Array(options.poolMax) ];
    let connections = baseArray.map(() => {
        return net.createConnection(options.path);
    });

    let inUse = 0;
    let nextUp = 0;
    return async function* getPrefix ( prefix = `app` ) {
        const index = nextUp % connections.length;
        const conn = connections[ index ];
        inUse = index;
        nextUp = inUse + 1;

        conn.write(`EXISTS ${prefix}:map\r\n`);
        conn.write(`EXISTS ${prefix}1:map\r\n`);
        conn.write(`HMGET ${prefix}:map a b c d\r\n`);
        // conn.write(`HGETALL ${prefix}:map\r\n`);

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


