"use strict";

const {
    parentPort,
    threadId,
} = require("worker_threads");

const {
    debugLogger,
} = require("../logger");

class RedisCommandError extends Error {
    name = `RedisCommandError`;

    constructor ( msg ) {
        super(msg);
    }
}

class RedisResponseError extends Error {
    name = `RedisResponseError`;

    constructor ( msg ) {
        super(msg);
    }
}

/**
 * CONSTANTS FOR COMPARISONS
 */
const NULL_JSON = JSON.stringify(null);
const ZERO_JSON = JSON.stringify(0);
const EMPTY_STRING_JSON = JSON.stringify(``);
const EMPTY_ARRAY_JSON = JSON.stringify([]);
const EMPTY_OBJECT_JSON = JSON.stringify({});

const ASTERISK_CODE = `*`.charCodeAt(0);
const PLUS_CODE = `+`.charCodeAt(0);
const DOLLAR_CODE = `$`.charCodeAt(0);
const DASH_CODE = `-`.charCodeAt(0);
const COLON_CODE = `:`.charCodeAt(0);
const CARR_RETURN_CODE = `\r`.charCodeAt(0);

/**
 * Check for carriage return (Mac new line char): "\r"
 *
 * @param {number} charCode
 * @returns {boolean}
 */
function isCarriageReturn ( charCode ) {
    return charCode === CARR_RETURN_CODE;
}

/**
 * getSimpleString(bufferData)
 *
 * Extracts a simple string from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract a simple string from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[string, number]} The extracted simple string and the remaining RESP string.
 */
function getSimpleString ( bufferData, currentIndex ) {
    let i = currentIndex + 1;
    while ( !isCarriageReturn(bufferData.at(i)) ) {
        i += 1;
    }

    return [
        bufferData.toString(`utf8`, currentIndex + 1, i),
        i + 2,
    ];
}

/**
 * getBulkString(bufferData)
 *
 * Extracts a bulk string from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract a bulk string from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[string|null, string]} The extracted bulk string or null and the remaining RESP string.
 */
function getBulkString ( bufferData, currentIndex ) {
    let i = currentIndex + 1;

    // $-1 is null value inside array
    if ( bufferData.at(i) === DASH_CODE ) {
        return [
            null,
            currentIndex + 5,
        ];
    }

    let current = bufferData.at(i);
    do {
        i += 1;
        current = bufferData.at(i);
    }
    while ( !isCarriageReturn(current) );

    const charCount = ~~bufferData.subarray(currentIndex + 1, i);

    return [
        bufferData.toString(`utf8`, i + 2, i + 2 + charCount),
        // go past char count + \r\n + all the chars in the string + \r\n
        i + 2 + charCount + 2,
    ];
}

/**
 * getNumber(bufferData)
 *
 * Extracts a number from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract a number from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[number, number]} The extracted number and the remaining RESP string.
 */
function getNumber ( bufferData, currentIndex ) {
    let i = currentIndex + 1;
    let current = bufferData.at(i);
    do {
        i += 1;
        current = bufferData.at(i);
    }
    while ( !isCarriageReturn(current) );

    return [
        ~~bufferData.subarray(currentIndex + 1, i),
        i + 2,
    ];
}

/**
 * getError(bufferData)
 *
 * Extracts an error from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract an error from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[RedisCommandError, number]} The extracted error and the remaining RESP string.
 */
function getError ( bufferData, currentIndex ) {
    let i = currentIndex + 1;
    while ( !isCarriageReturn(bufferData.at(i)) ) {
        i += 1;
    }

    return [
        new RedisCommandError(bufferData.toString(`utf8`, currentIndex + 1, i)),
        i + 2,
    ];
}

/**
 * extractArray(bufferData)
 *
 * Extracts an array from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract an array from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[extractedValueType[], number]} The extracted array and the remaining RESP string.
 */
function extractArray ( bufferData, currentIndex ) {
    let i = currentIndex + 1;
    let current = bufferData.at(i);

    do {
        i += 1;
        current = bufferData.at(i);
    }
    while ( !isCarriageReturn(current) );

    let nextIndex = i + 2;
    const arraySize = ~~bufferData.subarray(currentIndex + 1, i);
    const newArray = new Array(arraySize);
    if ( arraySize === 0 ) {
        return [
            newArray,
            nextIndex,
        ];
    }

    for ( let a = 0; a < arraySize; a++ ) {
        let result;
        [ result, nextIndex ] = extractValue(bufferData, nextIndex);
        newArray[ a ] = result;
    }

    return [
        newArray,
        nextIndex,
    ];
}


/**
 * extractValue(bufferData)
 *
 * Extracts a value from a Redis RESP string.
 *
 * @param {Buffer} bufferData The RESP string to extract a value from.
 * @param {number} currentIndex Where our data begins inside dataBuffer
 * @returns {[extractedValueType | extractedValueType[], number]}
 *     The extracted value and the remaining RESP string. The extracted value can be:
 *     - null
 *     - Array<extractedValueType>
 *     - string
 *     - number
 *     - RedisCommandError
 */
function extractValue ( bufferData, currentIndex ) {
    /**
     * start at beginning of next chunk
     */
    const type = bufferData.at(currentIndex);

    switch ( type ) {
        case ASTERISK_CODE: // "*"
            if ( bufferData.at(currentIndex + 1) === DASH_CODE ) {
                return [
                    null,
                    currentIndex + 5,
                ];
            }
            return extractArray(bufferData, currentIndex);

        case PLUS_CODE:     // "+"
            return getSimpleString(bufferData, currentIndex);

        case DOLLAR_CODE:   // "$"
            return getBulkString(bufferData, currentIndex);

        case DASH_CODE:     // "-"
            return getError(bufferData, currentIndex);

        case COLON_CODE:    // ":"
            return getNumber(bufferData, currentIndex);

        default:
            throw new RedisResponseError(`Tried to parse invalid RESP string (type ${type}): ${bufferData.toString("utf8", currentIndex)}`);
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
function parseFromJSON ( string ) {
    if ( typeof string !== `string` ) {
        return null;
    }

    try {
        return JSON.parse(string);
    }
    catch (e) {
        debugLogger(`Invalid JSON provided - returning null`, string);
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
function stringifyToJSON ( data ) {
    if ( ( data ?? null ) === null ) {
        return NULL_JSON;
    }

    if ( typeof data === `number` && isNaN(data) ) {
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

module.exports = {
    RedisCommandError,
    RedisResponseError,
    NULL_JSON,
    ZERO_JSON,
    EMPTY_STRING_JSON,
    EMPTY_ARRAY_JSON,
    EMPTY_OBJECT_JSON,
    isCarriageReturn,
    getSimpleString,
    getBulkString,
    getNumber,
    getError,
    extractArray,
    extractValue,
    parseFromJSON,
    stringifyToJSON,
};
