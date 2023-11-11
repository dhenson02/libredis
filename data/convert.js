"use strict";

const {
    isMainThread,
    Worker,
} = require("worker_threads");

const {
    debugLogger,
} = require("../logger");

// const workerThreadMap: Map<number, Worker> = new Map();

function reForkThread () {
    const workerThread = new Worker(__filename);
    const { threadId } = workerThread;
    // workerThreadMap.set(threadId, workerThread);

    workerThread.on('error', function handleError ( error ) {
        console.error(`thread ${threadId} had an error.  exiting`, error.stack);
        workerThread.terminate();
    });

    workerThread.on(`exit`, function ( code ) {
        // workerThreadMap.delete(threadId);
        if ( code === 0 ) {
            debugLogger(`thread ${threadId} exited, restarting`);
            return reForkThread();
        }
        console.error(`thread ${threadId} exited with error code ${code}.  Will not restart`, code);
        workerThread.terminate();
    });

    workerThread.on(`message`, function subHandler ( data ) {

        // for ( const workerThread of workerThreadMap.values() ) {
        //     workerThread.postMessage(data);
        // }
    });
}
// export function init ()
if ( isMainThread ) {
    reForkThread();
}
// else {

    /**
     * @TODO LIST
     *
     * - JSON conversions
     * - Queue data in/out correctly
     *
     */


// }
