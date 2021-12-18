import {
    parentPort,
    // threadId,
} from "worker_threads";

export const NULL_JSON = JSON.stringify(null);
export const ZERO_JSON = JSON.stringify(0);
export const EMPTY_STRING_JSON = JSON.stringify(``);
export const EMPTY_ARRAY_JSON = JSON.stringify([]);
export const EMPTY_OBJECT_JSON = JSON.stringify({});

export const OBJECT = `object`;
export const STRING = `string`;
export const NUMBER = `number`;

export function parseFromJSON ( string ) {
    if ( typeof string !== STRING ) {
        return null;
    }

    try {
        return JSON.parse(string);
    }
    catch (e) {
        console.log(`Invalid JSON provided - returning null`, string);
    }

    return null;
}

export function stringifyToJSON ( data ) {
    if (( data ?? null ) === null ||
        (typeof data === NUMBER && isNaN(data))
    ) {
        return NULL_JSON;
    }

    if ( Array.isArray(data) ) {
        return `[${data.map(stringifyToJSON).join()}]`;
    }

    return JSON.stringify(data);
}

export function queue ( data, type ) {

    parentPort?.postMessage(`stringified`, [ Buffer.from(data, `utf8`) ]);
}


// parentPort?.on(`message`, function subscriptionHandler ( data ) {
//     server.publish(`draw`, data, true);
// });
