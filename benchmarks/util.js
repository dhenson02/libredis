"use strict";

const _KB = 1024;
const _MB = 1024 * _KB;
const _GB = 1024 * _MB;

const byteSized = [
    `B`,
    `KB`,
    `MB`,
    `GB`,
    `TB`,
    // Anything past this and we're doing something wrong
];

const finalByteType = byteSized.length;

function convertBytesToString ( bytes = 0 ) {
    if ( !bytes && bytes != 0 ) {
        return `?? B`;
    }

    let number;
    if ( typeof bytes === `string` ) {
        number = ~~bytes;
    }
    else {
        number = bytes;
    }

    let i = 0;

    while ( number > 1024.0 ) {
        i++;
        number /= 1024.0;
        if ( i > finalByteType ) {
            console.warn(`Excessive number gtfo`);
            return ``;
        }
    }

    if ( number === 0 && i === 0 ) {
        console.warn(`Bytes passed to string conversion total 0 - probaby wanna check that.`);
        return `0 B`;
    }

    return `${number.toFixed(3)} ${byteSized[ i ]}`;
};

module.exports = {
    convertBytesToString,
};
