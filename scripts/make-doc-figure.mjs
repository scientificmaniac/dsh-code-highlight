/**
 * 生成一对「矢量 + 位图」文档插图：同一排版模型，6.3 in 宽。
 *
 * SVG 由 Node 侧生成；PNG 的 spec 也在此写出，随后由 py/rasterize.py 消费
 * （沙箱化的 shell 里 Node 无法捕获子进程输出，所以调用分成两条命令）。
 *
 * 运行：
 *   node scripts/make-doc-figure.mjs
 *   python py/rasterize.py examples/doc-figure.spec.json examples/doc-figure.png
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLanguage } from '../src/languages.js';
import { tokenizeLines, setLanguageResolver } from '../src/tokenize.js';
import { resolveTheme, colorFor, decorationsFor } from '../src/themes.js';
import { renderSvg, blockGeometry } from '../src/render.js';

setLanguageResolver(resolveLanguage);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examples = path.join(root, 'examples');
fs.mkdirSync(examples, { recursive: true });

const WIDTH_IN = 6.3;
const DPI = 300;
const FONT_SIZE = 15;

const code = [
  'import json',
  'from pathlib import Path',
  '',
  '',
  'def load_report(path: Path) -> dict:',
  '    """读取季度报告数据。"""',
  '    data = json.loads(path.read_text("utf-8"))  # 中文注释',
  '    rows = data.get("rows")',
  '    if not rows:',
  '        raise ValueError("报告为空")',
  '    return {"count": len(rows), "rows": rows}',
].join('\n');

const theme = resolveTheme('paper-light', {});
const lines = tokenizeLines(code, resolveLanguage('python'), { tabSize: 4 });

const options = {
  theme,
  language: 'python',
  title: 'doorbell.py',
  showTitle: true,
  lineNumbers: true,
  startLine: 1,
  fontSize: FONT_SIZE,
  lineHeight: 1.5,
  widthIn: WIDTH_IN,
};

fs.writeFileSync(path.join(examples, 'doc-figure.svg'), renderSvg(lines, options), 'utf8');

const geometry = blockGeometry(lines, options);
const fit = Math.min(1, (WIDTH_IN * 96) / geometry.width);

const spec = {
  widthIn: WIDTH_IN,
  dpi: DPI,
  blockWidth: geometry.width,
  blockHeight: geometry.height,
  scale: fit,
  fontSizePx: FONT_SIZE,
  lineHeightRatio: 1.5,
  padding: 18,
  startLine: 1,
  lineNumbers: true,
  showTitle: true,
  title: 'doorbell.py',
  background: theme.background,
  border: theme.border,
  titleBar: theme.titleBar,
  lineNumber: theme.lineNumber,
  lines: lines.map((line) => line.map((token) => {
    const decoration = decorationsFor(theme, token.k);
    return {
      v: token.v,
      color: colorFor(theme, token.k),
      bold: decoration.bold,
      italic: decoration.italic,
    };
  })),
};
fs.writeFileSync(path.join(examples, 'doc-figure.spec.json'), JSON.stringify(spec), 'utf8');

console.log(`wrote examples/doc-figure.svg (${WIDTH_IN} in target, scale ${fit.toFixed(4)}) and examples/doc-figure.spec.json`);
console.log(`logical block ${geometry.width}x${geometry.height}, expected PNG ${Math.round(geometry.width * fit * DPI / 96)}x${Math.round(geometry.height * fit * DPI / 96)} px`);
