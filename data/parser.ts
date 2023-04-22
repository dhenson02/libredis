"use strict";

import {
    parentPort,
    threadId,
} from "worker_threads";

export type extractedValueType = (
    string | number | Error | null
);

/**
 * CONSTANTS FOR COMPARISONS
 */
export const NULL_JSON = JSON.stringify(null);
export const ZERO_JSON = JSON.stringify(0);
export const EMPTY_STRING_JSON = JSON.stringify(``);
export const EMPTY_ARRAY_JSON = JSON.stringify([]);
export const EMPTY_OBJECT_JSON = JSON.stringify({});

export const OBJECT = `object`;
export const STRING = `string`;
export const NUMBER = `number`;

/**
 * Check for carriage return (Mac new line char): "\r"
 * 
 * @param {string} char 
 * @returns {boolean}
 */
export function isCarriageReturn ( char: string ): boolean {
    return char === `\r`;
}

/**
 * getSimpleString(subStr)
 * 
 * Extracts a simple string from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract a simple string from.
 * @returns {[string, string]} The extracted simple string and the remaining RESP string.
 */
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

/**
 * getBulkString(subStr)
 * 
 * Extracts a bulk string from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract a bulk string from. 
 * @returns {[string|null, string]} The extracted bulk string or null and the remaining RESP string.
 */
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

/**
 * getNumber(subStr) 
 * 
 * Extracts a number from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract a number from.
 * @returns {[number, string]} The extracted number and the remaining RESP string.
 */
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

/**
 * getError(subStr)
 * 
 * Extracts an error from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract an error from.
 * @returns {[Error, string]} The extracted error and the remaining RESP string.
 */
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

/**
 * extractArray(subStr)
 * 
 * Extracts an array from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract an array from.
 * @returns {[extractedValueType[], string]} The extracted array and the remaining RESP string.
 */
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

/**
 * extractValue(subStr) 
 * 
 * Extracts a value from a Redis RESP string.
 * 
 * @param {string} subStr The RESP string to extract a value from.
 * @returns {[extractedValueType | extractedValueType[], string]} The extracted value and the remaining RESP string. The extracted value can be:
 *     - null
 *     - Array<string|number|Error|null|extractedValueType> 
 *     - string
 *     - number 
 *     - Error
 */
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

/**
 * parseFromJSON(string)
 * 
 * Parses a JSON string into JavaScript object.
 * 
 * @param {string} string The JSON string to parse.
 * @returns {*} The parsed JavaScript object if the string is valid JSON, otherwise null.
 */
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

/**
 * stringifyToJSON(data)
 * 
 * Converts data to JSON string.
 * 
 * @param {*} data The data to convert to JSON. Can be: 
 *     - null: Returns "null" JSON string.
 *     - NaN: Returns "null" JSON string.
 *     - Array: Returns JSON string of the array in the format [value1, value2, ...].  
 *     - Other: Passes to JSON.stringify() and returns result.
 * @returns {string} JSON string representation of data.
 */
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
