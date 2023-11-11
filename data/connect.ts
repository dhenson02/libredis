"use strict";

import net from "node:net";

import {
    debugLogger,
} from "../logger.js";

import {
    extractValue,
    // RedisCommandError,
} from "./parser.js";

export interface IRedisOptions {
    /**
     * Keep this many connections alive and iterate between them as usage increases
     */
    "poolMax": 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    "db": number;
    "path": string;
    "host": string;
    "port": number;
    "keyPrefix": string;
    "connectionName": string;
    "debug": boolean;
};

export const REDIS_DEFAULTS: IRedisOptions = {
    "poolMax": 1,
    "db": 0,
    "path": ``,
    // "host": ``,
    "host": `127.0.0.1`,
    "port": 6379,
    "keyPrefix": ``,
    "connectionName": ``,
    "debug": false,
};

export function makeOptions ( redisConfig: IRedisOptions ) {
    const options: IRedisOptions = {
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

export class RedisConnectError extends Error {
    name = `RedisConnectError`;

    constructor ( msg: string ) {
        super(msg);
    }
}

export class Connect {
    #inUse = 0;
    #nextUp = 0;

    #usingMap = new Map();
    #connections: net.Socket[] = [];

    #options: IRedisOptions;

    constructor ( options: IRedisOptions ) {
        this.#options = makeOptions({
            ...REDIS_DEFAULTS,
            ...options,
        });

        this.#connections = Array.from(
            { "length": this.#options.poolMax },
            () => {
                const conn = this.#options.path
                    ? net.createConnection(this.#options.path)
                    : net.createConnection(this.#options.port, this.#options.host);
                // conn.allowHalfOpen = true;
                conn.write(`CLIENT SETNAME ${this.#options.connectionName}\r\n`);
                return conn;
            }
        );

        // const client = connect(this.#options);
    }

    async drop () {
        let count = 0;
        for ( const conn of this.#connections ) {
            await conn.destroy();
            count += 1;
        }
        return count;
    }

    async* #run ( command = `` ) {
        const index = this.#nextUp % this.#connections.length;

        if ( this.#usingMap.has(index) ) {
            const recursive = new Promise(resolve => {
                setTimeout(() => {
                    resolve(this.#run(command));
                    // @TODO - exponential backoff maybe (to a certain ceiling)
                    // @TODO - possibly just use fastq for this
                }, 10)
            });
            return await recursive;
        }

        this.#usingMap.set(index, true);
        const conn = await this.#connections[ index ];

        this.#inUse = index;
        this.#nextUp = this.#inUse + 1;

        try {

            if ( conn.isPaused() ) {
                await conn.resume();
            }
            await conn.cork();

            // Run send full command to Redis
            conn.write(command);

            debugLogger(`Connection ${this.#options.connectionName} prefix ${this.#options.keyPrefix}`);
            debugLogger(conn.isPaused(), conn.destroyed, conn.connecting, conn.readable, conn.writable);

            await conn.uncork();

            for await ( const data of conn ) {
                let result;
                // let next = data;
                let dataSize = data.length;
                let nextIndex = 0;
                do {
                    [ result, nextIndex ] = extractValue(data, nextIndex);
                    yield result;
                }
                while ( nextIndex < dataSize );

                // neither of these appears to be closing the connection
                // so use the one without error (.end) for now

                // await conn.destroy();
                await conn.end();
            }
        }
        catch ( error: any ) {
            throw new RedisConnectError(error.message);
            console.error(error);
        }

        debugLogger(`Connection ${conn.destroyed ? 'destroyed' : conn.connecting ? 'connecting' : conn.isPaused() ? 'isPaused' : '...is something...'} ${this.#options.connectionName} prefix ${this.#options.keyPrefix}`);

        if ( conn.destroyed ) {
            await this.#options.path
                ? conn.connect(this.#options.path)
                : conn.connect(this.#options.port, this.#options.host);
        }

        this.#nextUp = index;
        this.#inUse = index - 1;
        this.#usingMap.delete(index);
        // return conn;
    }

    async* createResult ( cmd: string ) {
        try {
            yield* await this.#run(cmd);
        }
        catch ( e: any ) {
            throw new RedisConnectError(e.message);
        }
    }

    async getFinal ( cmd: string ) {
        const final = [];
        for await ( const response of this.createResult(cmd) ) {
            final.push(response);
        }
        return final;
    }

    async hmset ( keySuffix: string, data: string[] ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const dataStr = data.join(` `);
        const cmd = `HMSET ${key} ${dataStr}\r\n`;
        return this.getFinal(cmd);
        // yield* await this.#run(cmd);
    }

    async hgetall ( keySuffix: string ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const cmd = `HGETALL ${key}\r\n`;
        return this.getFinal(cmd);
        // yield* await this.#run(cmd);
    }

    async hmget ( keySuffix: string, fields: string[] ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const fieldsStr = fields.join(` `);
        const cmd = `HMGET ${key} ${fieldsStr}\r\n`;
        return this.getFinal(cmd);
        // yield* await this.#run(cmd);
    }
}
