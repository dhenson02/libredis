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
    it('returns true for \\r', () => {
        expect(isCarriageReturn('\r')).to.be.true;
    });

    it('returns false for non-\\r', () => {
        expect(isCarriageReturn('f')).to.be.false;
        expect(isCarriageReturn('\n')).to.be.false;
        expect(isCarriageReturn('\s')).to.be.false;
        expect(isCarriageReturn('\r\n')).to.be.false;
        expect(isCarriageReturn('\t')).to.be.false;
    });
});

describe('getSimpleString', () => {
    it('extracts a simple string', () => {
        const [
            value,
            remainder,
        ] = getSimpleString('+foo\r\n');
        expect(value).to.equal('foo');
        expect(remainder).to.equal('');
    });

    it('handles escaped characters', () => {
        const [
            value,
            remainder,
        ] = getSimpleString('+\\r\\nfoo\r\n');
        expect(value).to.equal('\\r\\nfoo');
        expect(remainder).to.equal('');
    });
});

describe('getBulkString', () => {
    it('extracts a null bulk string', () => {
        const [
            value,
            remainder,
        ] = getBulkString('$-1\r\n');
        expect(value).to.be.null;
        expect(remainder).to.equal('');
    });

    it('extracts a non-null bulk string', () => {
        const [
            value,
            remainder,
        ] = getBulkString('$3\r\nfoo\r\n');
        expect(value).to.equal('foo');
        expect(remainder).to.equal('');
    });

    it('handles escaped characters', () => {
        const [
            value,
            remainder,
        ] = getBulkString('$7\r\n\\r\\nfoo\r\n');
        expect(value).to.equal('\\r\\nfoo');
        expect(remainder).to.equal('');
    });

    it('handles multiple values', () => {
        let [
            value,
            remainder,
        ] = getBulkString('$3\r\nfoo\r\n$3\r\nbar\r\n');
        expect(value).to.equal('foo');
        [
            value,
            remainder,
        ] = getBulkString(remainder);
        expect(value).to.equal('bar');
        expect(remainder).to.equal('');
    });
});

describe('getNumber', () => {
    it('extracts a positive number', () => {
        const [
            value,
            remainder
        ] = getNumber('$3\r\n');
        expect(value).to.equal(3);
        expect(remainder).to.equal('');
    });

    it('extracts a negative number', () => {
        const [
            value,
            remainder,
        ] = getNumber('$-5\r\n');
        expect(value).to.equal(-5);
        expect(remainder).to.equal('');
    });
    it('handles leading zeros', () => {
        const [
            value,
            remainder,
        ] = getNumber('$005\r\n');
        expect(value).to.equal(5);
        expect(remainder).to.equal('');
    });
});

describe('getError', () => {
    it('extracts an error', () => {
        const [
            value,
            remainder,
        ] = getError('-ERR Invalid request\r\n');
        expect(value).instanceOf(Error);
        if ( value instanceof Error ) {
            expect(value.message).to.equal("ERR Invalid request");
        }
        // expect(value).to.equal(new Error('ERR Invalid request'));
        expect(remainder).to.equal('');
    });
    it('handles escaped characters', () => {
        const [
            value,
            remainder,
        ] = getError('-ERR Invalid \\r\\n request\r\n');

        expect(value).instanceOf(Error);
        if ( value instanceof Error ) {
            expect(value.message).to.equal('ERR Invalid \\r\\n request');
        }
        expect(remainder).to.equal('');
    });
});

describe('extractArray', () => {
    it('extracts an empty array', () => {
        const [
            value,
            remainder,
        ] = extractArray('*0\r\n');
        expect(value).to.deep.equal([]);
        expect(remainder).to.equal('');
    });

    it('extracts an array with one value', () => {
        const [
            value,
            remainder,
        ] = extractArray('*1\r\n$3\r\nfoo\r\n');
        expect(value).to.deep.equal([ 'foo' ]);
        expect(remainder).to.equal('');
    });

    it('extracts an array with multiple values', () => {
        const [
            value,
            remainder,
        ] = extractArray('*3\r\n$3\r\nfoo\r\n$3\r\nbar\r\n$5\r\nhello\r\n');
        expect(value).to.deep.equal([
            'foo',
            'bar',
            'hello'
        ]);
        expect(remainder).to.equal('');
    });
});

describe('extractValue', () => {
    it('extracts a simple string value', () => {
        const [
            value,
            remainder,
        ] = extractValue('+foo\r\n');
        expect(value).to.equal('foo');
        expect(remainder).to.equal('');
    });

    it('extracts a bulk string value', () => {
        const [
            value,
            remainder,
        ] = extractValue('$3\r\nfoo\r\n');
        expect(value).to.equal('foo');
        expect(remainder).to.equal('');
    });

    it('extracts an integer value', () => {
        const [
            value,
            remainder,
        ] = extractValue(':5\r\n');
        expect(value).to.equal(5);
        expect(remainder).to.equal('');
    });

    it('extracts a float value', () => {
        const [
            value,
            remainder,
        ] = extractValue(':0035\r\n');
        expect(value).to.equal(35);
        expect(remainder).to.equal('');
    });

    it('extracts a null value', () => {
        const [
            value,
            remainder,
        ] = extractValue('$-1\r\n');
        expect(value).to.be.null;
        expect(remainder).to.equal('');
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
