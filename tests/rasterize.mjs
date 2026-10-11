/**
 * PNG 链路测试：构造 spec → 调用 py/rasterize.py → 校验产物尺寸、DPI 与几何一致性。
 *
 * 需要 Python 3 + Pillow。没有可用解释器时以「跳过」结束，退出码仍为 0，
 * 这样没有 Python 的环境也能跑 `npm run test:raster`。
 *
 * 运行：node tests/rasterize.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveLanguage } from '../src/languages.js';
import { tokenizeLines, setLanguageResolver } from '../src/tokenize.js';
import { resolveTheme, colorFor, decorationsFor } from '../src/themes.js';
import { blockGeometry } from '../src/render.js';

setLanguageResolver(resolveLanguage);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RASTERIZER = path.join(root, 'py', 'rasterize.py');
const CANDIDATES = [process.env.DSH_CODE_HIGHLIGHT_PYTHON, 'python', 'python3', 'py'].filter(Boolean);

const WIDTH_IN = 6.3;
const DPI = 300;

let checks = 0;
let failures = 0;

function check(name, ok, detail = '') {
  checks++;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `   ${detail}` : ''}`);
}

/** 读取 PNG 的 IHDR 尺寸与 pHYs 分辨率。 */
function readPngMeta(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('not a PNG file');
  const meta = { bytes: buffer.length };
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      meta.width = data.readUInt32BE(0);
      meta.height = data.readUInt32BE(4);
    } else if (type === 'pHYs' && data.length >= 9) {
      meta.pixelsPerMeterX = data.readUInt32BE(0);
      meta.pixelsPerMeterY = data.readUInt32BE(4);
      meta.unit = data[8];
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  return meta;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const theme = resolveTheme('paper-light', {});

/**
 * 按与插件相同的路径构造一份栅格化 spec。
 * @param {string} source 源码。
 * @param {string} title 代码块标签。
 * @returns {{geometry: object, scale: number, spec: object}} 几何、缩放与 spec。
 */
function buildSpec(source, title) {
  const lines = tokenizeLines(source, resolveLanguage('python'), { tabSize: 4 });
  const options = {
    theme,
    title,
    showTitle: true,
    lineNumbers: true,
    startLine: 1,
    fontSize: 15,
    lineHeight: 1.5,
  };
  const geometry = blockGeometry(lines, options);
  const scale = Math.min(1, (WIDTH_IN * 96) / geometry.width);
  const spec = {
    widthIn: WIDTH_IN,
    dpi: DPI,
    blockWidth: geometry.width,
    blockHeight: geometry.height,
    scale,
    fontSizePx: options.fontSize,
    lineHeightRatio: options.lineHeight,
    padding: 18,
    startLine: options.startLine,
    lineNumbers: options.lineNumbers,
    showTitle: options.showTitle,
    title,
    background: theme.background,
    border: theme.border,
    titleBar: theme.titleBar,
    lineNumber: theme.lineNumber,
    lines: lines.map((line) => line.map((token) => {
      const decoration = decorationsFor(theme, token.k);
      return { v: token.v, color: colorFor(theme, token.k), bold: decoration.bold, italic: decoration.italic };
    })),
  };
  return { geometry, scale, spec };
}

const SHORT_SAMPLE = [
  'import json',
  'from pathlib import Path',
  '',
  'def load(path: Path) -> dict:',
  '    """读取报告，包含中文注释。"""',
  '    return json.loads(path.read_text("utf-8"))',
].join('\n');

const LONG_SAMPLE = `value = "${'x'.repeat(120)}"  # 一行很长的代码，必须缩到栏宽以内`;

const samples = [
  { name: 'narrow sample', built: buildSpec(SHORT_SAMPLE, 'sample.py') },
  { name: 'oversized sample', built: buildSpec(LONG_SAMPLE, 'long.py') },
];

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-code-highlight-test-'));

let interpreter = null;
for (const candidate of CANDIDATES) {
  const probe = spawnSync(candidate, ['-c', 'import PIL'], { stdio: 'ignore', windowsHide: true, timeout: 60000 });
  if (probe.error && probe.error.code === 'ENOENT') continue;
  if (probe.status !== 0) {
    console.log(`SKIP  ${candidate} is present but has no Pillow`);
    continue;
  }
  interpreter = candidate;
  break;
}

if (!interpreter) {
  console.log(`SKIP  no Python with Pillow found (tried ${CANDIDATES.join(', ')}); PNG pipeline not verified`);
  fs.rmSync(workDir, { recursive: true, force: true });
  process.exit(0);
}

for (const { name, built } of samples) {
  const { geometry, scale, spec } = built;
  const specPath = path.join(workDir, `${name.replace(/\s+/g, '-')}.spec.json`);
  const pngPath = path.join(workDir, `${name.replace(/\s+/g, '-')}.png`);
  const infoPath = `${specPath}.info.json`;
  fs.writeFileSync(specPath, JSON.stringify(spec), 'utf8');

  spawnSync(interpreter, [RASTERIZER, specPath, pngPath, infoPath], {
    stdio: 'ignore',
    windowsHide: true,
    timeout: 180000,
  });

  const info = readJson(infoPath);
  check(`${name}: rasterizer reported success`, !!info && info.ok === true, info ? info.error || '' : 'no info file');
  if (!info || info.ok !== true) continue;

  const expectedWidth = Math.round(geometry.width * scale * (DPI / 96));
  const expectedHeight = Math.round(geometry.height * scale * (DPI / 96));
  const meta = readPngMeta(pngPath);
  const physicalWidth = meta.width / DPI;

  check(`${name}: PNG exists`, fs.statSync(pngPath).size > 0, `${fs.statSync(pngPath).size} bytes`);
  check(`${name}: width matches block geometry`, meta.width === expectedWidth, `${meta.width} vs ${expectedWidth}`);
  check(`${name}: height matches block geometry`, meta.height === expectedHeight, `${meta.height} vs ${expectedHeight}`);
  check(`${name}: DPI is recorded in the PNG`, meta.unit === 1 && Math.abs(meta.pixelsPerMeterX - Math.round(DPI / 0.0254)) <= 1, `${meta.pixelsPerMeterX} px/m`);
  check(`${name}: physical width never exceeds width_in`, physicalWidth <= WIDTH_IN + 0.01, `${physicalWidth.toFixed(3)} in`);
  check(`${name}: cjk face resolved`, !!info.cjkFont, String(info.cjkFont));
  check(`${name}: scale reported back`, Math.abs(info.scale - scale) < 0.001, `scale ${info.scale}`);
}

const oversized = samples[1].built;
check(
  'oversized sample is shrunk to exactly width_in',
  oversized.scale < 1 && Math.abs(Math.round(oversized.geometry.width * oversized.scale * (DPI / 96)) / DPI - WIDTH_IN) < 0.01,
  `scale ${oversized.scale.toFixed(4)}`,
);

const narrow = samples[0].built;
check('narrow sample is left at its natural width', narrow.scale === 1);

// 失败路径：spec 不存在时也要写出诊断文件。
const badInfo = path.join(workDir, 'bad.info.json');
spawnSync(interpreter, [RASTERIZER, path.join(workDir, 'missing.json'), path.join(workDir, 'bad.png'), badInfo], {
  stdio: 'ignore',
  windowsHide: true,
  timeout: 60000,
});
const bad = readJson(badInfo);
check('failure path still reports through the info file', !!bad && bad.ok === false, bad ? String(bad.error).slice(0, 60) : 'no info file');

fs.rmSync(workDir, { recursive: true, force: true });

console.log(`\nchecks: ${checks}   failures: ${failures}`);
console.log(failures === 0 ? 'RASTER OK' : `RASTER FAILED (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
