// Modifications copyright 2020 Caf.js Labs and contributors
/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
/**
 * Client implementation of srp utils
 *
 * @name caf_security/srpUtils
 * @namespace
 */

const crypto = require('crypto');
const srp = require('srp');
const assert = require('assert');
const base64url = require('base64url');

const NUM_BITS = '2048';
const SALT_BYTES = 32;
const KEY_BYTES = 32;
exports.PARAMS = srp.params[NUM_BITS];

const ENCRYPTION_ALGO = 'AES-256-CBC';
const IV_LENGTH = 16;

exports.bufToHex = function(buf) {
    return buf.toString('hex');
};

exports.hexToBuf = function(hex) {
    return Buffer.from(hex, 'hex');
};

exports.newSalt = function() {
    return crypto.randomBytes(SALT_BYTES);
};

exports.newSecret = function() {
    return crypto.randomBytes(KEY_BYTES);
};

exports.encryptToken = function(key, tokenStr) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
    var tokenEnc = cipher.update(tokenStr, 'utf8', 'hex');
    tokenEnc += cipher.final('hex');
    const ivStr = iv.toString('hex');
    return ivStr + 'Z' + tokenEnc; // use separator without URL encoding
};

exports.decryptToken = function(key, tokenEnc) {
    const all = tokenEnc.trim().split('Z');
    assert(all.length === 2, 'Invalid encrypted token');
    const iv = Buffer.from(all[0], 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    var tokenStr = decipher.update(all[1], 'hex', 'utf8');
    tokenStr += decipher.final('utf8');
    return tokenStr;
};

exports.strToBuffer = function(str) {
    return Buffer.from(str, 'utf8');
};


const EXPIRES_AFTER = 'expiresAfter';
const CONSTRAINTS = [
    'appPublisher', 'appLocalName', 'caOwner', 'caLocalName', EXPIRES_AFTER
];

// Duplicate of tokens.similar() to avoid including caf_security
exports.similarTokens = function(t1, t2, ignoreExpires) {
    assert.equal(typeof t1, 'object', "'t1' not an object");
    assert.equal(typeof t2, 'object', "'t2' not an object");
    if ((t1 === null) || (t2 === null)) {
        return (t1 === t2);
    } else {
        return !CONSTRAINTS.some(function(x) {
            if (ignoreExpires &&
                                         (x === EXPIRES_AFTER)){
                return false;
            } else {
                return (t1[x] !== t2[x]);
            }
        });
    }
};


exports.decodeToken = function(tokStr) {
    return JSON.parse(base64url.decode(tokStr.split('.')[1]));
};
