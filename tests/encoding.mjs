/**
 * 编码守卫：仓库内的文本文件必须是合法 UTF-8、不带 BOM、且不含乱码特征字。
 *
 * 背景：用 Windows PowerShell 5.1 的 `Get-Content` 读 UTF-8 文件时会按 ANSI
 * 代码页解码，`Set-Content -Encoding utf8` 又会写入 BOM。用它做一次文本替换，
 * 中文就会整体变成「锟斤拷」式的乱码，而且仍是合法 UTF-8，很难被发现。
 * 这个测试把那次事故固化成一条可回归的检查。
 *
 * 运行：node tests/encoding.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 不属于源码的目录。 */
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.idea', '.vscode', 'dist', 'build']);

/** 二进制扩展名，不做文本检查。 */
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
  '.pdf', '.pptx', '.docx', '.xlsx',
  '.ttf', '.ttc', '.otf', '.woff', '.woff2',
  '.zip', '.gz', '.univer',
]);

/**
 * UTF-8 中文被 GBK 解码后的高频特征字。
 *
 * 以码点写出，既避免测试脚本自身命中，也避免这些字符出现在源码里。
 */
const MOJIBAKE_CODEPOINTS = [
  0x951f, // 锟
  0x6d93, // 涓
  0x6783, // 枃
  0x951b, // 锛
  0x9428, // 鐨
  0x93c2, // 鏂
  0x93b6, // 鎶
  0x9225, // 鈥
  0x9422, // 鐢
  0x935c, // 鍜
  0x93c4, // 鏄
  0x7039, // 瀹
];
const MOJIBAKE_MARKERS = MOJIBAKE_CODEPOINTS.map((code) => String.fromCharCode(code));

/** 本文件按码点写出标记，不需要检查自己。 */
const SELF = 'tests/encoding.mjs';

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF8 = new TextDecoder('utf-8', { fatal: true });

let checks = 0;
let failures = 0;

function check(name, ok, detail = '') {
  checks++;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `   ${detail}` : ''}`);
}

/**
 * 递归收集待检查的文本文件。
 * @param {string} dir 起始目录。
 * @param {string[]} files 累积结果。
 * @returns {string[]} 文本文件绝对路径。
 */
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files);
    } else if (entry.isFile() && !BINARY_EXT.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(root);
check('text files found', files.length > 0, `${files.length} files`);

let bomCount = 0;
let invalidCount = 0;
let markerCount = 0;

for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === SELF) continue;

  const bytes = fs.readFileSync(file);

  if (bytes.subarray(0, 3).equals(BOM)) {
    bomCount++;
    check(`${rel} has no BOM`, false, 'starts with EF BB BF');
  }

  let text;
  try {
    text = UTF8.decode(bytes);
  } catch {
    invalidCount++;
    check(`${rel} is valid UTF-8`, false, 'decode failed');
    continue;
  }

  if (text.includes('\uFFFD')) {
    markerCount++;
    check(`${rel} has no replacement characters`, false, 'contains U+FFFD');
    continue;
  }

  const hit = MOJIBAKE_MARKERS.find((marker) => text.includes(marker));
  if (hit) {
    markerCount++;
    check(`${rel} has no mojibake markers`, false, `contains U+${hit.codePointAt(0).toString(16).toUpperCase()}`);
  }
}

check('every text file is BOM-free', bomCount === 0, `${bomCount} file(s) with BOM`);
check('every text file is valid UTF-8', invalidCount === 0, `${invalidCount} invalid file(s)`);
check('no mojibake markers anywhere', markerCount === 0, `${markerCount} suspicious file(s)`);

console.log(`\nchecks: ${checks}   failures: ${failures}`);
console.log(failures === 0 ? 'ENCODING OK' : `ENCODING FAILED (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
