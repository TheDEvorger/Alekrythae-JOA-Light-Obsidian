"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildPageOffsets, pageText, containsHugeUnbrokenRun } = require("../build/domain/writing/LongTextPaging.js");

test("1,372,184 unbroken characters round-trip without lost or inserted content", () => {
  const original = "g".repeat(1_372_184);
  const offsets = buildPageOffsets(original);
  assert.equal(offsets[0], 0);
  assert.equal(offsets.at(-1), original.length);
  assert.equal(offsets.length - 1, 336);
  assert.equal(offsets.every((n, i) => i === 0 || n > offsets[i - 1]), true);
  assert.equal(offsets.slice(0, -1).map((_, i) => pageText(original, offsets, i)).join(""), original);
  assert.ok(containsHugeUnbrokenRun(original));
});

test("emoji, Turkish text, Windows newlines, and Markdown keep their exact values", () => {
  const original = "> [!joa-dialogue] Meggy\r\n" + "ğİşü😊".repeat(1300) + "\n\nBitiş";
  const offsets = buildPageOffsets(original, 17);
  const pages = offsets.slice(0, -1).map((_, i) => pageText(original, offsets, i));
  assert.equal(pages.join(""), original);
  assert.ok(pages.every(p => !/[\uD800-\uDBFF]$/u.test(p)), "no high surrogate left dangling");
  assert.ok(pages.every(p => !/^[\uDC00-\uDFFF]/u.test(p)), "no low surrogate at page start");
});

test("empty and normal notes have safe bounds", () => {
  assert.deepEqual(buildPageOffsets(""), [0]);
  assert.deepEqual(buildPageOffsets("small"), [0, 5]);
  assert.equal(containsHugeUnbrokenRun("small"), false);
  assert.equal(containsHugeUnbrokenRun("x".repeat(8191)), false);
  assert.equal(containsHugeUnbrokenRun("x".repeat(8192)), true);
  assert.equal(containsHugeUnbrokenRun("x".repeat(8000) + " " + "x".repeat(8000)), false);
  assert.throws(() => pageText("abc", [0, 3], 2), RangeError);
});

test("safe reader is read-only and never writes or changes editor content", () => {
  const reader = fs.readFileSync("src/presentation/longtext/LongTextSafeReaderModal.ts", "utf8");
  assert.match(reader, /cachedRead\(this\.file\)/);
  assert.match(reader, /textContent = this\.raw/);
  assert.doesNotMatch(reader, /(?:\.write\(|\.process\(|\.replaceRange\(|\.setValue\()/);
  assert.match(reader, /joa-longtext-page/);
});
