"use strict";

import {
    parentPort,
    threadId,
} from "worker_threads";

export type extractedValueType = (
    string | number | Error | null
);

export const NULL_JSON = JSON.stringify(null);
export const ZERO_JSON = JSON.stringify(0);
export const EMPTY_STRING_JSON = JSON.stringify(``);
export const EMPTY_ARRAY_JSON = JSON.stringify([]);
export const EMPTY_OBJECT_JSON = JSON.stringify({});

export const OBJECT = `object`;
export const STRING = `string`;
export const NUMBER = `number`;

export function isCarriageReturn ( char: string ): boolean {
    return char === `\r`;
}

export function getSimpleString ( subStr: string ): [ extractedValueType, string ] {
    let i = 1;
    while ( !isCarriageReturn(subStr.charAt(i)) ) {
        i += 1;
    }

    return [
        subStr.slice(1, i),
        subStr.slice(i + 2),
    ];
}

export function getBulkString ( subStr: string ): [ extractedValueType, string ] {
    // $-1 is null value inside array
    if ( subStr.charAt(1) === `-` ) {
        return [
            null,
            subStr.slice(5),
        ];
    }

    let i = 1;
    let charCount = ``;
    let current = subStr.charAt(i);
    do {
        charCount += current;
        i += 1;
        current = subStr.charAt(i);
    }
    while ( !isCarriageReturn(current) );

    return [
        subStr.slice(i + 2, i + 2 + ~~charCount),
        subStr.slice(i + 2 + ~~charCount + 2),
    ];
}

export function getNumber ( subStr: string ): [ extractedValueType, string ] {
    let i = 1;
    let char = ``;
    let current = subStr.charAt(i);
    do {
        char += current;
        i += 1;
        current = subStr.charAt(i);
    }
    while ( !isCarriageReturn(current) );

    return [
        ~~char,
        subStr.slice(i + 2),
    ];
}

export function getError ( subStr: string ): [ extractedValueType, string ] {
    let i = 1;
    while ( !isCarriageReturn(subStr.charAt(i)) ) {
        i += 1;
    }

    return [
        new Error(subStr.slice(1, i)),
        subStr.slice(i + 2),
    ];
}

export function extractArray ( subStr: string ): [ extractedValueType[], string ] {
    let numChar = ``;
    let i = 1;
    let current = subStr.charAt(i);

    do {
        numChar += current;
        i += 1;
        current = subStr.charAt(i);
    }
    while ( !isCarriageReturn(current) );

    let nextStr = subStr.slice(i + 2);
    const total = ~~numChar;
    const newArray = new Array(total);
    if ( total === 0 ) {
        return [
            newArray,
            nextStr,
        ];
    }

    for ( let a = 0; a < total; a++ ) {
        let result;
        [ result, nextStr ] = extractValue(nextStr);
        newArray[ a ] = result;
    }

    return [
        newArray,
        nextStr,
    ];
}

export function extractValue ( subStr: string ): [ extractedValueType | extractedValueType[], string ] {
    const type = subStr.charAt(0);

    switch ( type ) {
        case `*`:
            if ( subStr.charAt(1) === `-` ) {
                return [
                    null,
                    subStr.slice(5),
                ];
            }
            return extractArray(subStr);

        case `+`:
            return getSimpleString(subStr);

        case `$`:
            return getBulkString(subStr);

        case `-`:
            return getError(subStr);

        case `:`:
            return getNumber(subStr);

        default:
            throw new Error(`Tried to parse invalid RESP string (type ${type}): ${subStr}`);
    }
}

export function parseFromJSON ( string: string ) {
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
    if (
        ( data ?? null ) === null ||
        ( typeof data === NUMBER && isNaN(data) )
    ) {
        return NULL_JSON;
    }

    if ( Array.isArray(data) ) {
        return `[${data.map(stringifyToJSON).join()}]`;
    }

    return JSON.stringify(data);
}

// export function queue ( data, type ) {
//     parentPort?.postMessage(`stringified`, [ Buffer.from(data, `utf8`) ]);
// }


parentPort?.on(`message-${threadId}`, function subscriptionHandler ( data ) {

});
