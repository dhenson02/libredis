"use strict";

import {
    isMainThread,
    Worker,
} from "worker_threads";

const workerThreadMap: Map<number, Worker> = new Map();

function reForkThread () {
    const workerThread = new Worker(__filename);
    const { threadId } = workerThread;
    workerThreadMap.set(threadId, workerThread);

    workerThread.on('error', function handleError ( error ) {
        logger.error(`thread ${threadId} had an error.  exiting`, error.stack);
        workerThread.terminate();
    });

    workerThread.on(`exit`, function ( code ) {
        workerThreadMap.delete(threadId);
        if ( code === 0 ) {
            logger.warn(`thread ${threadId} exited, restarting`);
            return reForkThread();
        }
        logger.error(`thread ${threadId} exited with error code ${code}.  Will not restart`, code);
        workerThread.terminate();
    });

    workerThread.on(`message`, function subHandler ( data ) {
        for ( const workerThread of workerThreadMap.values() ) {
            workerThread.postMessage(data);
        }
    });
}

if ( isMainThread ) {
    reForkThread();
}
else {
    const { server } = require('./sockets');
    server.listen(~~HTTP_PORT + 10000, token => {
        if ( !token ) {
            throw new Error(`Socket server failed to start on port ${~~HTTP_PORT + 10000}`);
        }

        // spin up a new thread for each new connection
        server.connect(`*`, reForkThread)
    });
}
