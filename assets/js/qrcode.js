/**
 * qrcode.js — Self-Contained QR Code Generator
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module qrcode
 * @version 2.0.0
 *
 * Generates a scannable QR code from window.location.href.
 * Renders to a <canvas> element with ID 'qrcode-canvas'.
 * Supports dark/light mode via 'themechange' event.
 *
 * IMPLEMENTATION:
 *   Pure JavaScript, no external APIs or online services.
 *   Full QR code algorithm (ISO/IEC 18004):
 *     1. Data encoding in byte mode
 *     2. Reed-Solomon error correction (GF(256) arithmetic)
 *     3. Module placement (finder, separator, timing, alignment patterns)
 *     4. Mask application with penalty-based mask selection (all 8 patterns)
 *     5. Format information (BCH encoding)
 *     6. Canvas rendering with quiet zone
 *
 * Default: Version 3 (29x29 modules), Error Correction Level M (~15%)
 * Configurable version and EC level for larger payloads.
 */

(function () {
    'use strict';

    // ================================================================
    // CONFIGURATION
    // ================================================================

    /** QR version (1-10). Size = 17 + 4*version. */
    var VERSION = 3;

    /** Error correction level: 'L'=7%, 'M'=15%, 'Q'=25%, 'H'=30% */
    var EC_LEVEL = 'M';

    /** Pixel size of each module */
    var MODULE_SIZE = 4;

    /** Quiet zone in modules (spec requires 4) */
    var QUIET_ZONE = 4;

    // Map EC level string to array index
    var EC_MAP = { L: 0, M: 1, Q: 2, H: 3 };

    // ================================================================
    // QR SPECIFICATION TABLES (versions 1-10)
    // ================================================================

    // EC codewords per block: [v-1][EC_L, EC_M, EC_Q, EC_H]
    var EC_PER_BLOCK = [
        [ 7, 10, 13, 17 ],
        [10, 16, 22, 28 ],
        [15, 26, 18, 22 ],
        [20, 18, 26, 16 ],
        [26, 24, 18, 22 ],
        [18, 16, 24, 28 ],
        [20, 18, 18, 26 ],
        [24, 22, 22, 26 ],
        [30, 22, 20, 24 ],
        [18, 26, 24, 28 ]
    ];

    // Number of blocks group1: [v-1][L, M, Q, H]
    var BLOCKS_G1 = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 2, 2],
        [1, 2, 2, 4],
        [1, 2, 4, 4],
        [2, 4, 4, 4],
        [2, 4, 6, 5],
        [2, 4, 6, 6],
        [2, 4, 5, 6],
        [2, 4, 6, 6]
    ];

    // Data codewords per block group1: [v-1][L, M, Q, H]
    var DATA_G1 = [
        [19, 16, 13,  9],
        [34, 28, 22, 16],
        [55, 44, 17, 13],
        [80, 32, 24,  9],
        [108, 43, 15, 11],
        [68, 27, 19, 15],
        [78, 31, 14, 13],
        [97, 36, 18, 14],
        [116, 37, 16, 12],
        [68, 41, 20, 16]
    ];

    // Data codewords per block group2: [v-1][L, M, Q, H] (0 = no G2)
    var DATA_G2 = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 16, 12],
        [0, 33, 25, 10],
        [0, 44, 16, 12],
        [69, 28, 20, 16],
        [79, 32, 15, 14],
        [98, 37, 19, 15],
        [117, 38, 17, 13],
        [69, 42, 21, 17]
    ];

    // Number of blocks group2: [v-1][L, M, Q, H]
    var BLOCKS_G2 = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 1, 1],
        [0, 1, 1, 1],
        [0, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 2],
        [1, 1, 1, 2],
        [1, 1, 2, 2],
        [2, 2, 2, 2]
    ];

    // Alignment pattern center positions (1-indexed)
    var ALIGN_CENTERS = [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50]
    ];

    // ================================================================
    // GF(256) ARITHMETIC
    // Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 = 0x11D
    // ================================================================

    var GF_EXP = new Array(512);
    var GF_LOG = new Array(256);

    (function buildGF() {
        var x = 1;
        for (var i = 0; i < 255; i++) {
            GF_EXP[i] = x;
            GF_LOG[x] = i;
            x <<= 1;
            if (x & 0x100) {
                x ^= 0x11D;
            }
        }
        for (var j = 255; j < 512; j++) {
            GF_EXP[j] = GF_EXP[j - 255];
        }
    })();

    function gfMul(a, b) {
        if (a === 0 || b === 0) return 0;
        return GF_EXP[GF_LOG[a] + GF_LOG[b]];
    }

    // ================================================================
    // REED-SOLOMON ENCODING
    // ================================================================

    /**
     * Build the RS generator polynomial for a given number of EC codewords.
     * g(x) = Π(i=0 to n-1) (x - α^i)
     * Returns coefficients from highest degree to constant: [g_n, g_{n-1}, ..., g_0]
     * where g_n = 1.
     */
    function rsGeneratorPoly(n) {
        var poly = [1]; // degree 0: g(x) = 1
        for (var i = 0; i < n; i++) {
            // Multiply current poly by (x - α^i)
            // (x - α^i) * poly = x * poly - α^i * poly
            // New degree = current degree + 1
            var shifted = [0].concat(poly); // x * poly (shift coefficients right)
            var alphaI = GF_EXP[i];        // α^i
            // Subtract (GF add = XOR) α^i * poly
            // poly terms align with shifted[1..]
            for (var j = 0; j < poly.length; j++) {
                shifted[j] ^= gfMul(poly[j], alphaI);
            }
            poly = shifted;
        }
        return poly; // [g_n=1, g_{n-1}, ..., g_0]
    }

    /**
     * Compute EC codewords for a data block.
     * Returns an array of `ecCount` EC bytes.
     */
    function rsEncodeBlock(data, ecCount) {
        var gen = rsGeneratorPoly(ecCount);
        // Message polynomial padded with ecCount zeros
        var msg = [];
        for (var i = 0; i < data.length + ecCount; i++) {
            msg.push(i < data.length ? data[i] : 0);
        }
        // Polynomial division (synthetic division)
        for (var i = 0; i < data.length; i++) {
            var coef = msg[i];
            if (coef !== 0) {
                for (var j = 1; j < gen.length; j++) {
                    msg[i + j] ^= gfMul(gen[j], coef);
                }
            }
        }
        return msg.slice(data.length); // remainder = EC codewords
    }

    // ================================================================
    // DATA ENCODING (Byte Mode)
    // ================================================================

    /**
     * Encode a string into a byte array using UTF-8.
     */
    function encodeToBytes(str) {
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            var cp = str.charCodeAt(i);
            if (cp < 0x80) {
                bytes.push(cp);
            } else if (cp < 0x800) {
                bytes.push(0xC0 | (cp >> 6));
                bytes.push(0x80 | (cp & 0x3F));
            } else if (cp < 0xD800 || cp >= 0xE000) {
                // BMP (non-surrogate)
                bytes.push(0xE0 | (cp >> 12));
                bytes.push(0x80 | ((cp >> 6) & 0x3F));
                bytes.push(0x80 | (cp & 0x3F));
            } else {
                // Surrogate pair: combine with next char
                i++;
                var lo = str.charCodeAt(i);
                var full = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                bytes.push(0xF0 | (full >> 18));
                bytes.push(0x80 | ((full >> 12) & 0x3F));
                bytes.push(0x80 | ((full >> 6) & 0x3F));
                bytes.push(0x80 | (full & 0x3F));
            }
        }
        return bytes;
    }

    /**
     * Get total data codeword capacity for configured version + EC level.
     */
    function getCapacity() {
        var ei = EC_MAP[EC_LEVEL];
        var vi = VERSION - 1;
        return DATA_G1[vi][ei] * BLOCKS_G1[vi][ei] +
               (DATA_G2[vi][ei] || 0) * (BLOCKS_G2[vi][ei] || 0);
    }

    /**
     * Build the full data + EC codeword array (interleaved).
     * @returns {number[]} Final codeword sequence as bytes [0-255]
     */
    function buildCodewords(dataBytes) {
        var ei = EC_MAP[EC_LEVEL];
        var vi = VERSION - 1;

        var g1DataSize = DATA_G1[vi][ei];
        var g1Count    = BLOCKS_G1[vi][ei];
        var g2DataSize = DATA_G2[vi][ei] || 0;
        var g2Count    = BLOCKS_G2[vi][ei] || 0;
        var ecSize     = EC_PER_BLOCK[vi][ei];

        // --- Build the raw data bit stream with mode, count, terminator, pad ---
        var maxCodewords = g1DataSize * g1Count + g2DataSize * g2Count;
        var maxBits = maxCodewords * 8;

        var bits = [];

        // Mode indicator (4 bits): 0100 = Byte mode
        bits.push(0, 1, 0, 0);

        // Character count (8 bits for version 1-9)
        var len = dataBytes.length;
        for (var b = 7; b >= 0; b--) { bits.push((len >> b) & 1); }

        // Data bytes
        for (var i = 0; i < dataBytes.length; i++) {
            var bt = dataBytes[i];
            for (var b2 = 7; b2 >= 0; b2--) { bits.push((bt >> b2) & 1); }
        }

        // Terminator (up to 4 zero bits)
        var termLen = Math.min(4, maxBits - bits.length);
        for (var t = 0; t < termLen; t++) { bits.push(0); }

        // Pad to byte boundary
        while (bits.length % 8 !== 0 && bits.length < maxBits) {
            bits.push(0);
        }

        // Pad bytes: 0xEC, 0x11 alternating
        var padSeq = [0xEC, 0x11];
        var pIdx = 0;
        while (bits.length < maxBits) {
            var pb = padSeq[pIdx % 2];
            for (var b3 = 7; b3 >= 0 && bits.length < maxBits; b3--) {
                bits.push((pb >> b3) & 1);
            }
            pIdx++;
        }

        // Convert bit array to byte array
        var paddedBytes = [];
        for (var k = 0; k < bits.length; k += 8) {
            var byt = 0;
            for (var b4 = 0; b4 < 8; b4++) {
                byt = (byt << 1) | (bits[k + b4] || 0);
            }
            paddedBytes.push(byt);
        }

        // --- Split into blocks and generate EC ---
        var dataBlocks = [];
        var ecBlocks = [];
        var offset = 0;

        // Group 1
        for (var g1i = 0; g1i < g1Count; g1i++) {
            var block = paddedBytes.slice(offset, offset + g1DataSize);
            offset += g1DataSize;
            dataBlocks.push(block);
            ecBlocks.push(rsEncodeBlock(block, ecSize));
        }

        // Group 2 (if present)
        for (var g2i = 0; g2i < g2Count; g2i++) {
            var block2 = paddedBytes.slice(offset, offset + g2DataSize);
            offset += g2DataSize;
            dataBlocks.push(block2);
            ecBlocks.push(rsEncodeBlock(block2, ecSize));
        }

        // --- Interleave ---
        var result = [];
        var maxDLen = 0, maxELen = 0;
        for (var r = 0; r < dataBlocks.length; r++) {
            maxDLen = Math.max(maxDLen, dataBlocks[r].length);
            maxELen = Math.max(maxELen, ecBlocks[r].length);
        }
        for (var col = 0; col < maxDLen; col++) {
            for (var row = 0; row < dataBlocks.length; row++) {
                if (col < dataBlocks[row].length) {
                    result.push(dataBlocks[row][col]);
                }
            }
        }
        for (var eCol = 0; eCol < maxELen; eCol++) {
            for (var eRow = 0; eRow < ecBlocks.length; eRow++) {
                if (eCol < ecBlocks[eRow].length) {
                    result.push(ecBlocks[eRow][eCol]);
                }
            }
        }

        return result;
    }

    // ================================================================
    // QR MATRIX — FUNCTION PATTERNS
    // ================================================================

    function getSize() { return 17 + 4 * VERSION; }

    function inBounds(r, c, size) { return r >= 0 && r < size && c >= 0 && c < size; }

    /**
     * Check if a module is reserved (function pattern) and should NOT
     * receive data bits. The dark module and format info reserve spots
     * ARE reserved (data bits skip them, format info is placed later).
     */
    function isReserved(r, c, size) {
        // Top-left finder + separator + format area (0-8, 0-8)
        if (r <= 8 && c <= 8) return true;
        // Top-right (0-8, size-8..size-1)
        if (r <= 8 && c >= size - 8) return true;
        // Bottom-left (size-8..size-1, 0-8)
        if (r >= size - 8 && c <= 8) return true;
        // Timing patterns
        if (r === 6 || c === 6) return true;
        // Dark module for versions >= 1: (4*V + 9, 8) 1-indexed
        var darkR = 4 * VERSION + 8; // 0-indexed: 4*V + 9 - 1 = 4*V + 8
        if (r === darkR && c === 8) return true;
        // Alignment patterns (version >= 2)
        if (VERSION >= 2) {
            var centers = ALIGN_CENTERS[VERSION - 1];
            for (var i = 0; i < centers.length; i++) {
                for (var j = 0; j < centers.length; j++) {
                    var ar = centers[i] - 1; // convert to 0-indexed
                    var ac = centers[j] - 1;
                    // Skip if overlaps finder zone
                    if (ar <= 8 && ac <= 8) continue;
                    if (ar <= 8 && ac >= size - 8) continue;
                    if (ar >= size - 8 && ac <= 8) continue;
                    if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
                }
            }
        }
        return false;
    }

    /**
     * Build the initial QR matrix with all function patterns placed.
     * Data bits are set to false. Format info area = false (overwritten later).
     * Returns a 2D array of 0/1 values.
     */
    function buildMatrix() {
        var size = getSize();
        var m = new Array(size);
        for (var r = 0; r < size; r++) {
            m[r] = new Array(size);
            for (var c = 0; c < size; c++) {
                m[r][c] = 0;
            }
        }

        // --- Finder patterns (3 corners, 7x7) ---
        function drawFinder(row, col) {
            for (var r = 0; r < 7; r++) {
                for (var c = 0; c < 7; c++) {
                    if (r === 0 || r === 6 || c === 0 || c === 6 ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                        m[row + r][col + c] = 1;
                    }
                }
            }
        }
        drawFinder(0, 0);
        drawFinder(0, size - 7);
        drawFinder(size - 7, 0);

        // --- Separators (white ring around each finder) ---
        // Top-left separator
        for (var s = 0; s < 8; s++) {
            if (inBounds(7, s, size)) m[7][s] = 0;
            if (inBounds(s, 7, size)) m[s][7] = 0;
        }
        // Top-right separator
        for (var s2 = 0; s2 < 8; s2++) {
            if (inBounds(7, size - 1 - s2, size)) m[7][size - 1 - s2] = 0;
            if (inBounds(s2, size - 8, size)) m[s2][size - 8] = 0;
        }
        // Bottom-left separator
        for (var s3 = 0; s3 < 8; s3++) {
            if (inBounds(size - 8, s3, size)) m[size - 8][s3] = 0;
            if (inBounds(size - 8 + s3, 7, size)) m[size - 8 + s3][7] = 0;
        }

        // --- Timing patterns ---
        for (var t = 8; t < size - 8; t++) {
            m[6][t] = (t % 2 === 0) ? 1 : 0;
            m[t][6] = (t % 2 === 0) ? 1 : 0;
        }

        // --- Dark module ---
        var darkR = 4 * VERSION + 8;
        m[darkR][8] = 1;

        // --- Alignment patterns (version >= 2) ---
        if (VERSION >= 2) {
            var centers = ALIGN_CENTERS[VERSION - 1];
            for (var i = 0; i < centers.length; i++) {
                for (var j = 0; j < centers.length; j++) {
                    var ar = centers[i] - 1;
                    var ac = centers[j] - 1;
                    // Skip if overlaps finder zone
                    if (ar <= 8 && ac <= 8) continue;
                    if (ar <= 8 && ac >= size - 8) continue;
                    if (ar >= size - 8 && ac <= 8) continue;
                    // Draw 5x5 alignment pattern
                    for (var dr = -2; dr <= 2; dr++) {
                        for (var dc = -2; dc <= 2; dc++) {
                            var isOutline = (Math.abs(dr) === 2 || Math.abs(dc) === 2);
                            var isCenter = (dr === 0 && dc === 0);
                            if (isOutline || isCenter) {
                                m[ar + dr][ac + dc] = 1;
                            } else {
                                m[ar + dr][ac + dc] = 0;
                            }
                        }
                    }
                }
            }
        }

        // Format info reserve area is already white from initialization
        // and covered by isReserved checks; we will overwrite later.

        return m;
    }

    // ================================================================
    // DATA BIT PLACEMENT (Zigzag)
    // ================================================================

    /**
     * Place data bits into the matrix using standard QR upward zigzag.
     * Bits are from the final interleaved codewords.
     */
    function placeDataBits(matrix, codewords) {
        var size = getSize();
        // Convert codewords to bit array
        var bits = [];
        for (var i = 0; i < codewords.length; i++) {
            for (var b = 7; b >= 0; b--) {
                bits.push((codewords[i] >> b) & 1);
            }
        }

        // Traverse modules in standard QR order (upward, 2-column groups)
        var row = size - 1;
        var col = size - 1;
        var goingUp = true;
        var inRightCol = true;
        var bitIdx = 0;

        while (col >= 0) {
            if (col === 6) { col--; continue; }

            if (!isReserved(row, col, size)) {
                if (bitIdx < bits.length) {
                    matrix[row][col] = bits[bitIdx];
                } else {
                    matrix[row][col] = 0; // pad with white
                }
                bitIdx++;
            }

            // Advance to next module
            if (inRightCol) {
                col--;
                inRightCol = false;
            } else {
                col++;
                inRightCol = true;
                if (goingUp) {
                    row--;
                    if (row < 0) {
                        row = 0;
                        col -= 2;
                        goingUp = false;
                        if (col === 6) col--;
                    }
                } else {
                    row++;
                    if (row >= size) {
                        row = size - 1;
                        col -= 2;
                        goingUp = true;
                        if (col === 6) col--;
                    }
                }
            }
        }
    }

    // ================================================================
    // MASKING + PENALTY EVALUATION
    // ================================================================

    var MASK_FUNCS = [
        function(r, c) { return (r + c) % 2 === 0; },
        function(r, c) { return r % 2 === 0; },
        function(r, c) { return c % 3 === 0; },
        function(r, c) { return (r + c) % 3 === 0; },
        function(r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
        function(r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
        function(r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
        function(r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; }
    ];

    function applyMask(matrix, pattern) {
        var size = getSize();
        var result = new Array(size);
        for (var r = 0; r < size; r++) {
            result[r] = new Array(size);
            for (var c = 0; c < size; c++) {
                if (isReserved(r, c, size)) {
                    result[r][c] = matrix[r][c]; // keep function patterns
                } else {
                    var maskBit = MASK_FUNCS[pattern](r, c) ? 1 : 0;
                    result[r][c] = matrix[r][c] ^ maskBit;
                }
            }
        }
        return result;
    }

    function computePenalty(matrix) {
        var size = getSize();
        var penalty = 0;
        var darkCount = 0;
        var total = size * size;

        // N1: 5+ consecutive same-color modules in row/col
        for (var r = 0; r < size; r++) {
            var run = 1;
            for (var c = 1; c < size; c++) {
                if (matrix[r][c] === matrix[r][c - 1]) { run++; }
                else {
                    if (run >= 5) penalty += 3 + (run - 5);
                    run = 1;
                }
            }
            if (run >= 5) penalty += 3 + (run - 5);
        }
        for (var c2 = 0; c2 < size; c2++) {
            var runV = 1;
            for (var r2 = 1; r2 < size; r2++) {
                if (matrix[r2][c2] === matrix[r2 - 1][c2]) { runV++; }
                else {
                    if (runV >= 5) penalty += 3 + (runV - 5);
                    runV = 1;
                }
            }
            if (runV >= 5) penalty += 3 + (runV - 5);
        }

        // N2: 2x2 blocks of same color
        for (var r3 = 0; r3 < size - 1; r3++) {
            for (var c3 = 0; c3 < size - 1; c3++) {
                if (matrix[r3][c3] === matrix[r3][c3 + 1] &&
                    matrix[r3][c3] === matrix[r3 + 1][c3] &&
                    matrix[r3][c3] === matrix[r3 + 1][c3 + 1]) {
                    penalty += 3;
                }
            }
        }

        // N3: 1:1:3:1:1 ratio pattern (dark-light-dark-dark-dark-light-dark)
        var PATTERN = [1, 0, 1, 1, 1, 0, 1];
        function checkPattern(arr, pos) {
            for (var k = 0; k < 7; k++) {
                if (arr[pos + k] !== PATTERN[k]) return false;
            }
            // Check 4 light modules before or after
            var before = true;
            for (var b = pos - 1; b >= pos - 4 && b >= 0; b--) {
                if (arr[b] !== 0) { before = false; break; }
            }
            var after = true;
            for (var a = pos + 7; a <= pos + 10 && a < arr.length; a++) {
                if (arr[a] !== 0) { after = false; break; }
            }
            return before || after;
        }
        for (var r4 = 0; r4 < size; r4++) {
            for (var c4 = 0; c4 <= size - 7; c4++) {
                if (checkPattern(matrix[r4], c4)) penalty += 40;
            }
        }
        // Vertical
        for (var c5 = 0; c5 < size; c5++) {
            var colArr = [];
            for (var r5 = 0; r5 < size; r5++) colArr.push(matrix[r5][c5]);
            for (var r5b = 0; r5b <= size - 7; r5b++) {
                if (checkPattern(colArr, r5b)) penalty += 40;
            }
        }

        // N4: Dark/light ratio penalty
        for (var r6 = 0; r6 < size; r6++) {
            for (var c6 = 0; c6 < size; c6++) {
                if (matrix[r6][c6]) darkCount++;
            }
        }
        var pct = (darkCount / total) * 100;
        var deviation = Math.abs(Math.round(pct / 5) * 5 - 50) / 5;
        penalty += deviation * 10;

        return penalty;
    }

    function selectBestMask(matrix) {
        var bestMatrix = null;
        var bestPenalty = Infinity;
        var bestMask = 0;
        for (var p = 0; p < 8; p++) {
            var masked = applyMask(matrix, p);
            var pen = computePenalty(masked);
            if (pen < bestPenalty) {
                bestPenalty = pen;
                bestMatrix = masked;
                bestMask = p;
            }
        }
        return { matrix: bestMatrix, maskIndex: bestMask };
    }

    // ================================================================
    // FORMAT INFORMATION (BCH(15,5) encoding)
    // ================================================================

    function generateFormatInfo(maskIndex) {
        var ecBitsMap = { L: 1, M: 0, Q: 3, H: 2 };
        var data = (ecBitsMap[EC_LEVEL] << 3) | maskIndex; // 5 bits total

        // BCH encode
        var code = data << 10;
        var generator = 0x537; // x^10 + x^8 + x^5 + x^4 + x^2 + x + 1
        for (var i = 4; i >= 0; i--) {
            if (code & (1 << (i + 10))) {
                code ^= generator << i;
            }
        }
        var format = ((data << 10) | (code & 0x3FF)) ^ 0x5412; // XOR mask
        return format & 0x7FFF;
    }

    function placeFormatInfo(matrix, formatInfo) {
        var size = getSize();
        // The 15 format bits are placed at specific positions
        // We'll set them in the canonical order defined by the QR spec
        var positions = [
            // Around top-left finder
            [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
            [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
            // Right of top-right finder
            [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
            [8, size - 5], [8, size - 6], [8, size - 7],
            // Under bottom-left finder
            [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
            [size - 3, 8], [size - 2, 8], [size - 1, 8]
        ];

        for (var i = 0; i < positions.length; i++) {
            var bit = (formatInfo >> i) & 1;
            var r = positions[i][0];
            var c = positions[i][1];
            // Skip timing patterns
            if (r === 6 || c === 6) continue;
            if (inBounds(r, c, size)) {
                matrix[r][c] = bit;
            }
        }
    }

    // ================================================================
    // CANVAS RENDERING
    // ================================================================

    var renderingCanvas = null;

    function detectTheme() {
        if (document.documentElement.getAttribute('data-theme') === 'dark') return 'dark';
        if (document.body.classList.contains('dark-mode') ||
            document.body.classList.contains('dark')) return 'dark';
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    }

    function clearCanvas(cvs, cw, bgColor) {
        var ctx = cvs.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, cw, cw);
    }

    function drawModule(ctx, x, y, s, radius, isIsolated, color) {
        ctx.fillStyle = color;
        if (isIsolated && radius > 0) {
            // Rounded square for border modules
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + s - radius, y);
            ctx.quadraticCurveTo(x + s, y, x + s, y + radius);
            ctx.lineTo(x + s, y + s - radius);
            ctx.quadraticCurveTo(x + s, y + s, x + s - radius, y + s);
            ctx.lineTo(x + radius, y + s);
            ctx.quadraticCurveTo(x, y + s, x, y + s - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(x, y, s, s);
        }
    }

    function renderCanvas(matrix) {
        var size = getSize();
        var cw = (size + 2 * QUIET_ZONE) * MODULE_SIZE;

        renderingCanvas.width = cw;
        renderingCanvas.height = cw;

        var theme = detectTheme();
        var bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
        var fgColor = theme === 'dark' ? '#ffffff' : '#000000';

        var ctx = renderingCanvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, cw, cw);

        // Precompute isolation (used for rounded corners)
        var radius = MODULE_SIZE > 2 ? Math.max(0.5, MODULE_SIZE * 0.12) : 0;

        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (matrix[r][c]) {
                    var x = (c + QUIET_ZONE) * MODULE_SIZE;
                    var y = (r + QUIET_ZONE) * MODULE_SIZE;
                    var topDark    = r > 0        && matrix[r - 1][c];
                    var bottomDark = r < size - 1 && matrix[r + 1][c];
                    var leftDark   = c > 0        && matrix[r][c - 1];
                    var rightDark  = c < size - 1 && matrix[r][c + 1];
                    var isIsolated = !(topDark && bottomDark && leftDark && rightDark);

                    drawModule(ctx, x, y, MODULE_SIZE, radius, isIsolated, fgColor);
                }
            }
        }
    }

    // ================================================================
    // ERROR RENDERING
    // ================================================================

    function renderError() {
        if (!renderingCanvas) return;
        var cw = 200;
        renderingCanvas.width = cw;
        renderingCanvas.height = 100;
        var ctx = renderingCanvas.getContext('2d');
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, cw, 100);
        ctx.fillStyle = '#dc3545';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QR Code Generation Failed', cw / 2, 40);
        ctx.fillStyle = '#6c757d';
        ctx.font = '11px sans-serif';
        ctx.fillText('The URL may be too long for the QR version.', cw / 2, 65);
    }

    // ================================================================
    // MAIN ENTRY POINT
    // ================================================================

    /**
     * Generate and render the QR code.
     * @param {string} url - URL to encode
     */
    function generate(url) {
        if (!renderingCanvas) return;

        try {
            // 1. Encode URL to bytes (UTF-8)
            var bytes = encodeToBytes(url);

            // 2. Auto-upgrade version if data won't fit
            var capacity = getCapacity();
            var needBytes = bytes.length + 2; // overhead ~2 bytes
            var origVersion = VERSION;
            while (needBytes > capacity && VERSION < 10) {
                VERSION++;
                capacity = getCapacity();
            }
            if (needBytes > capacity) {
                // Still won't fit — try EC level L (most data capacity)
                VERSION = origVersion;
                while (needBytes > capacity && VERSION < 10) {
                    VERSION++;
                    var savedEC = EC_LEVEL;
                    EC_LEVEL = 'L';
                    capacity = getCapacity();
                    if (needBytes > capacity) {
                        EC_LEVEL = savedEC;
                        capacity = getCapacity();
                    }
                }
            }
            if (needBytes > capacity) {
                throw new Error('URL too long for maximum supported QR version');
            }

            // 3. Build interleaved data + EC codewords
            var codewords = buildCodewords(bytes);

            // 4. Build matrix with function patterns
            var matrix = buildMatrix();

            // 5. Place data bits
            placeDataBits(matrix, codewords);

            // 6. Mask selection
            var result = selectBestMask(matrix);

            // 7. Place format info
            var fi = generateFormatInfo(result.maskIndex);
            placeFormatInfo(result.matrix, fi);

            // 8. Render
            renderCanvas(result.matrix);

        } catch (e) {
            console.error('[TechTutorial QRCode]', e.message);
            renderError();
        }
    }

    // ================================================================
    // PUBLIC API
    // ================================================================

    /**
     * Initialize the QR code component.
     * Call on DOMContentLoaded or when the canvas is available.
     *
     * Usage:
     *   TechTutorial.initQRCode();           // uses window.location.href
     *   TechTutorial.initQRCode(customUrl);  // encodes a custom URL
     *
     * The QR code is rendered to <canvas id="qrcode-canvas">.
     * Re-renders on 'themechange' event for dark/light mode support.
     *
     * @param {string} [customUrl] - Optional URL to encode
     * @public
     * @memberof TechTutorial
     */
    function initQRCode(customUrl) {
        renderingCanvas = document.getElementById('qrcode-canvas');
        if (!renderingCanvas) {
            return;
        }

        var url = customUrl || window.location.href;

        generate(url);

        // Theme change listener
        window.addEventListener('themechange', function () {
            generate(url);
        });

        // Storage change listener (for localStorage-based theme toggles)
        window.addEventListener('storage', function (e) {
            if (e.key === 'theme' || e.key === 'data-theme' || e.key === 'color-theme') {
                generate(url);
            }
        });
    }

    // ================================================================
    // EXPORT
    // ================================================================

    window.TechTutorial = window.TechTutorial || {};
    window.TechTutorial.initQRCode = initQRCode;

})();
