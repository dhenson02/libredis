"use strict";

import * as chai from "chai";
import "mocha";

const { assert } = chai;

import {
    // extractArray,
    // extractValue,
    // getBulkString,
    // getError,
    // getNumber,
    // getSimpleString,
    isCarriageReturn,
} from "./parser.js";

// getSimpleString
// getBulkString
// getNumber
// getError
// extractArray
// extractValue

describe(`Checking parser functions`, () => {
    it(`should have a function to check for carriage return character`, () => {
        assert.typeOf(isCarriageReturn, `function`, `isCarriageReturn expected to be function`);
    });

    it(`should only return true when \\r is passed in`, () => {
        assert.isNotTrue(isCarriageReturn(`\n`), `Expected LF character not to match CR character`);
        assert.isNotTrue(isCarriageReturn(` `), `Expected " " not to match CR character`);
        assert.isTrue(isCarriageReturn(`\r`), `Expected CR character (\\r) to match CR character`);
    });
});
