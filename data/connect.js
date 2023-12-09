"use strict";

const sleep = ( timer ) =>
    new Promise(( res ) => {
        setTimeout(() => res(), timer);
    });

const assert = require("node:assert");
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

    #usingMap = {};
    #connections = new Map();

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
            // "noDelay": true,
        };

        for ( let i = 0; i < this.#options.poolMax; i++ ) {
            const connectionName = this.#options.connectionName + `-${i}`;
            const conn = net.createConnection(this.#connOpts);
            this.#connections.set(connectionName, conn);
        }
    }

    async drop () {
        let count = 0;
        for ( const [name, conn] of this.#connections ) {
            conn.write(`QUIT\r\n`);
            await conn.destroy();
            this.#connections.delete(name);
            count += 1;
        }
        return count;
    }

    async* #run ( command = `` ) {
        const index = this.#nextUp % this.#connections.size;

        this.#nextUp = index + 1;
        this.#usingMap[ index ] = true;
        const connectionName = this.#options.connectionName + `-${index}`;
        const conn = this.#connections.get(connectionName);

        conn.setKeepAlive(true);

        // Run/send full command to Redis
        conn.cork();
        conn.write(command);
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

        if ( conn.destroyed ) {
            try {
                conn.connect(this.#connOpts);
                await once(conn, `connect`);
            }
            catch ( e ) {
                debugLogger(e.stack);
                throw new RedisConnectError(e.message);
            }
        }

        delete this.#usingMap[index];
        return conn; // no point
    }

    // async* createResult ( cmd ) {
    //     try {
    //         yield* await this.#run(cmd);
    //     }
    //     catch ( e ) {
    //         debugLogger(e.stack);
    //         console.error(e.message);
    //     }
    // }

    // async getFinal ( cmd ) {
    //     const final = [];
    //     for await ( const response of this.createResult(cmd) ) {
    //         final.push(response);
    //     }
    //     return final;
    // }

    async getFinal ( cmd ) {
        const final = [];
        for await ( const response of this.#run(cmd) ) {
            final.push(response);
        }
        return final;
    }

    async hmset ( keySuffix, data ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const dataStr = data.join(` `);
        const cmd = `HMSET ${key} ${dataStr}\r\n`;
        return await this.getFinal(cmd);
    }

    async hgetall ( keySuffix ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const cmd = `HGETALL ${key}\r\n`;
        return await this.getFinal(cmd);
    }

    async hmget ( keySuffix, fields ) {
        const key = `${this.#options.keyPrefix}${keySuffix}`;
        const fieldsStr = fields.join(` `);
        const cmd = `HMGET ${key} ${fieldsStr}\r\n`;
        return await this.getFinal(cmd);
    }

    async quit () {
        const cmd = `QUIT\r\n`;
        return await this.getFinal(cmd);
    }

    async clientName ( name ) {
        const results = [];
        for ( const [ connectionName, ] of this.#connections ) {
            const cmd = `CLIENT SETNAME ${name}-${connectionName}\r\n`;
            results.push(await this.getFinal(cmd));
        }
        return results;
    }
}

module.exports = {
    REDIS_DEFAULTS,
    makeOptions,
    RedisConnectError,
    Connect,
};
