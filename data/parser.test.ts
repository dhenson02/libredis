"use strict";

import * as chai from "chai";
import "mocha";

const {
    // assert,
    expect,
} = chai;

import {
    getError,
    getNumber,
    getSimpleString,
    getBulkString,
    isCarriageReturn,
    parseFromJSON,
    stringifyToJSON,
    extractArray,
    extractValue,
    NULL_JSON,
    ZERO_JSON,
    EMPTY_STRING_JSON,
    EMPTY_ARRAY_JSON,
    EMPTY_OBJECT_JSON,
} from "./parser.js";

describe('parser defaults', () => {
    it('NULL_JSON is JSON string for null', () => {
        expect(NULL_JSON).to.equal('null');
    });

    it('ZERO_JSON is JSON string for 0', () => {
        expect(ZERO_JSON).to.equal('0');
    });

    it('EMPTY_STRING_JSON is JSON string for ""', () => {
        expect(EMPTY_STRING_JSON).to.equal(`""`);
    });

    it('EMPTY_ARRAY_JSON is JSON string for []', () => {
        expect(EMPTY_ARRAY_JSON).to.equal(`[]`);
    });

    it('EMPTY_OBJECT_JSON is JSON string for {}', () => {
        expect(EMPTY_OBJECT_JSON).to.equal(`{}`);
    });
});

describe('isCarriageReturn', () => {
    it('returns true for \\r (and \\r\\n because 2 chars instead of 1, first char results in pass)', () => {
        expect(isCarriageReturn(Buffer.from('\r').at(0))).to.be.true;
    });

    it('returns false for non-\\r', () => {
        expect(isCarriageReturn(Buffer.from('f').at(0))).to.be.false;
        expect(isCarriageReturn(Buffer.from('\n').at(0))).to.be.false;
        expect(isCarriageReturn(Buffer.from('\s').at(0))).to.be.false;
        expect(isCarriageReturn(Buffer.from('\t').at(0))).to.be.false;
    });
});

describe('getSimpleString', () => {
    it('extracts a simple string', () => {
        const dataBuffer = Buffer.from('+foo\r\n');
        const [
            value,
            remainder,
        ] = getSimpleString(dataBuffer, 0);
        expect(value).to.equal('foo');
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('handles escaped characters', () => {
        const dataBuffer = Buffer.from('+\\r\\nfoo\r\n');
        const [
            value,
            remainder,
        ] = getSimpleString(dataBuffer, 0);
        expect(value).to.equal('\\r\\nfoo');
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('getBulkString', () => {
    it('extracts a null bulk string', () => {
        const dataBuffer = Buffer.from('$-1\r\n');
        const [
            value,
            remainder,
        ] = getBulkString(dataBuffer, 0);
        expect(value).to.be.null;
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts a non-null bulk string', () => {
        const dataBuffer = Buffer.from('$3\r\nfoo\r\n');
        const [
            value,
            remainder,
        ] = getBulkString(dataBuffer, 0);
        expect(value).to.equal('foo');
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('handles escaped characters', () => {
        const dataBuffer = Buffer.from('$7\r\n\\r\\nfoo\r\n');
        const [
            value,
            remainder,
        ] = getBulkString(dataBuffer, 0);
        expect(value).to.equal('\\r\\nfoo');
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('handles multiple values', () => {
        const dataBuffer = Buffer.from('$3\r\nfoo\r\n$3\r\nbar\r\n');
        let [
            value,
            remainder,
        ] = getBulkString(dataBuffer, 0);
        expect(value).to.equal('foo');
        [
            value,
            remainder,
        ] = getBulkString(dataBuffer, remainder);
        expect(value).to.equal('bar');
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('getNumber', () => {
    it('extracts a positive number', () => {
        const dataBuffer = Buffer.from('$3\r\n');
        const [
            value,
            remainder
        ] = getNumber(dataBuffer, 0);
        expect(value).to.equal(3);
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts a negative number', () => {
        const dataBuffer = Buffer.from('$-5\r\n');
        const [
            value,
            remainder,
        ] = getNumber(dataBuffer, 0);
        expect(value).to.equal(-5);
        expect(remainder).to.equal(dataBuffer.length);
    });
    it('handles leading zeros', () => {
        const dataBuffer = Buffer.from('$005\r\n');
        const [
            value,
            remainder,
        ] = getNumber(dataBuffer, 0);
        expect(value).to.equal(5);
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('getError', () => {
    it('extracts an error', () => {
        const dataBuffer = Buffer.from('-ERR Invalid request\r\n');
        const [
            value,
            remainder,
        ] = getError(dataBuffer, 0);
        expect(value).instanceOf(Error);
        if ( value instanceof Error ) {
            expect(value.message).to.equal("ERR Invalid request");
        }
        // expect(value).to.equal(new Error('ERR Invalid request'));
        expect(remainder).to.equal(dataBuffer.length);
    });
    it('handles escaped characters', () => {
        const dataBuffer = Buffer.from('-ERR Invalid \\r\\n request\r\n');
        const [
            value,
            remainder,
        ] = getError(dataBuffer, 0);

        expect(value).instanceOf(Error);
        if ( value instanceof Error ) {
            expect(value.message).to.equal('ERR Invalid \\r\\n request');
        }
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('extractArray', () => {
    it('extracts an empty array', () => {
        const dataBuffer = Buffer.from('*0\r\n');
        const [
            value,
            remainder,
        ] = extractArray(dataBuffer, 0);
        expect(value).to.deep.equal([]);
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts an array with one value', () => {
        const dataBuffer = Buffer.from('*1\r\n$3\r\nfoo\r\n');
        const [
            value,
            remainder,
        ] = extractArray(dataBuffer, 0);
        expect(value).to.deep.equal([ 'foo' ]);
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts an array with multiple values', () => {
        const dataBuffer = Buffer.from('*3\r\n$3\r\nfoo\r\n$3\r\nbar\r\n$5\r\nhello\r\n');
        const [
            value,
            remainder,
        ] = extractArray(dataBuffer, 0);
        expect(value).to.deep.equal([
            'foo',
            'bar',
            'hello'
        ]);
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('extractValue', () => {
    it('extracts a simple string value', () => {
        const dataBuffer = Buffer.from('+foo\r\n');
        const [
            value,
            remainder,
        ] = extractValue(dataBuffer, 0);
        expect(value).to.equal('foo');
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts a bulk string value', () => {
        const dataBuffer = Buffer.from('$3\r\nfoo\r\n');
        const [
            value,
            remainder,
        ] = extractValue(dataBuffer, 0);
        expect(value).to.equal('foo');
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts an integer value', () => {
        const dataBuffer = Buffer.from(':5\r\n');
        const [
            value,
            remainder,
        ] = extractValue(dataBuffer, 0);
        expect(value).to.equal(5);
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts a float value', () => {
        const dataBuffer = Buffer.from(':0035\r\n');
        const [
            value,
            remainder,
        ] = extractValue(dataBuffer, 0);
        expect(value).to.equal(35);
        expect(remainder).to.equal(dataBuffer.length);
    });

    it('extracts a null value', () => {
        const dataBuffer = Buffer.from('$-1\r\n');
        const [
            value,
            remainder,
        ] = extractValue(dataBuffer, 0);
        expect(value).to.be.null;
        expect(remainder).to.equal(dataBuffer.length);
    });
});

describe('parseFromJSON', () => {
    it('parses valid JSON', () => {
        const result = parseFromJSON('{"foo": "bar"}');
        expect(result).to.deep.equal({ foo: 'bar' });
    });

    it('returns null for invalid JSON', () => {
        const result = parseFromJSON('{foo: "bar"}');
        expect(result).to.be.null;
    });
});

describe('stringifyToJSON', () => {
    it('stringifies an object', () => {
        const result = stringifyToJSON({ foo: 'bar' });
        expect(result).to.equal('{"foo":"bar"}');
    });

    it('stringifies an array', () => {
        const result = stringifyToJSON([ 'foo', 'bar' ]);
        expect(result).to.equal('["foo","bar"]');
    });

    it('returns null JSON for null input', () => {
        const result = stringifyToJSON(null);
        expect(result).to.equal('null');
    });

    it('returns null JSON for NaN', () => {
        const result = stringifyToJSON(NaN);
        expect(result).to.equal('null');
    });
});

/*
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
*/
