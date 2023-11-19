"use strict";

const sleep = ( timer ) =>
    new Promise(( res ) => {
        setTimeout(() => res(), timer);
    });

const net  = require("node:net");
const stream = require("node:stream");
const util = require("node:util");
const events = require("node:events");

const finished = util.promisify(stream.finished);
const { once } = events;

const {
    debugLogger,
}  = require("../logger");

const {
    extractValue,
    // RedisCommandError,
}  = require("./parser");

const REDIS_DEFAULTS = {
    "poolMax": 1,
    "db": 0,
    "path": ``,
    "host": `127.0.0.1`,
    "port": 6379,
    "keyPrefix": ``,
    "connectionName": ``,
    "debug": false,
};

function makeOptions ( redisConfig ) {
    const options = {
        ...redisConfig,
        "connectionName": `libredis-${process.pid}`,
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

class RedisConnectError extends Error {
    name = `RedisConnectError`;

    constructor ( msg ) {
        super(msg);
    }
}

class Connect {
    #nextUp = 0;

    #usingMap = new Map();
    #connections = null;

    #options = { ...REDIS_DEFAULTS };
    #connOpts = {};

    constructor ( options ) {
        this.#options = makeOptions({
            ...REDIS_DEFAULTS,
            ...options,
        });

        this.#connOpts = {
            ...(
                this.#options.path
                    ? { "path": this.#options.path }
                    : { "port": this.#options.port, "host": this.#options.host }
            ),
            // "keepAlive": true,
            "noDelay": true,
            // ""
        };

        this.#connections = new Map(Array.from(
            { "length": this.#options.poolMax },
            (_, i) => {
                const conn = net.createConnection(this.#connOpts);
                const connectionName = this.#options.connectionName + `-${i}`;
                // conn.allowHalfOpen = true;
                conn.write(`CLIENT SETNAME ${connectionName}\r\n`);
                return [
                    connectionName,
                    conn,
                ];
            })
        );
    }

    async drop () {
        let count = 0;
        for ( const [name, conn] of this.#connections.entries() ) {
            await conn.destroy();
            this.#connections.delete(name);
            count += 1;
        }
        return count;
    }

    #bufferTime = 1;

    async* #run ( command = `` ) {
        const index = this.#nextUp % this.#connections.size;

        this.#nextUp = index + 1;
        // this.#nextUp = index === this.#options.poolMax - 1
        //     ? 0
        //     : index + 1;

        if ( this.#usingMap.has(index) ) {
            if ( this.#bufferTime < 512 ) {
                this.#bufferTime *= 2;
            }
            await sleep(this.#bufferTime);
            return await this.#run(command);
        }

        this.#bufferTime = 1;
        this.#usingMap.set(index, true);
        const connectionName = this.#options.connectionName + `-${index}`;
        const conn = this.#connections.get(connectionName);
        // await once(conn, 'connect');

        try {

            conn.cork();

            // Run send full command to Redis
            conn.write(command);

            // debugLogger(connectionName, command);

            conn.uncork();

            if ( conn.isPaused() ) {
                conn.resume();
            }

            for await ( const data of conn ) {
                let result;
                let dataSize = data.length;
                let nextIndex = 0;
                do {
                    // await sleep(100);
                    [ result, nextIndex ] = extractValue(data, nextIndex);
                    yield result;
                }
                while ( nextIndex < dataSize );

                conn.end();
                // await finished(conn);
            }
        }
        catch ( error ) {
            debugLogger(error.stack);
            throw new RedisConnectError(error.message);
        }

        if ( conn.destroyed ) {
            conn.connect(this.#connOpts);
            await once(conn, `connect`);
        }

        // this.#nextUp = this.#nextUp - 1;
        this.#usingMap.delete(index);
        // return conn;
    }

    async* createResult ( cmd ) {
        try {
            yield* await this.#run(cmd);
        }
        catch ( e ) {
            debugLogger(e.stack);
            throw new RedisConnectError(e.message);
        }
    }

    async getFinal ( cmd ) {
        const final = [];
        for await ( const response of this.createResult(cmd) ) {
            final.push(response);
        }
        return final;
    }

    async hmset ( keySuffix, data ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const dataStr = data.join(` `);
        const cmd = `HMSET ${key} ${dataStr}\r\n`;
        return this.getFinal(cmd);
    }

    async hgetall ( keySuffix ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const cmd = `HGETALL ${key}\r\n`;
        return this.getFinal(cmd);
    }

    async hmget ( keySuffix, fields ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const fieldsStr = fields.join(` `);
        const cmd = `HMGET ${key} ${fieldsStr}\r\n`;
        return this.getFinal(cmd);
    }
}

module.exports = {
    REDIS_DEFAULTS,
    makeOptions,
    RedisConnectError,
    Connect,
};
