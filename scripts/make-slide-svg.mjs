/**
 * 生成一张幻灯片尺寸的高亮代码页 SVG，用于验证 SVG 产物落到 Univer Slide / PPTX。
 *
 * 运行：node scripts/make-slide-svg.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLanguage } from '../src/languages.js';
import { tokenizeLines, setLanguageResolver } from '../src/tokenize.js';
import { resolveTheme } from '../src/themes.js';
import { renderSvg } from '../src/render.js';

setLanguageResolver(resolveLanguage);

const code = [
  'import json',
  'from pathlib import Path',
  '',
  '',
  'def load_report(path: Path) -> dict:',
  '    """读取季度报告数据。"""',
  '    data = json.loads(path.read_text("utf-8"))',
  '    if not data.get("rows"):',
  '        raise ValueError("报告为空")',
  '    return data',
].join('\n');

const lines = tokenizeLines(code, resolveLanguage('python'), { tabSize: 4 });
const svg = renderSvg(lines, {
  theme: resolveTheme('one-dark', {}),
  language: 'python',
  title: 'report.py',
  fontSize: 15,
  lineNumbers: true,
  canvas: '960x540',
});

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples');
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, 'slide-code.svg');
fs.writeFileSync(target, svg, 'utf8');
console.log(`wrote ${target} (${svg.length} bytes)`);
console.log(svg.split('\n').slice(0, 4).join('\n'));
