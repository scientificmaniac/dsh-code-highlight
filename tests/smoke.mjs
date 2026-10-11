/**
 * 冒烟测试：不依赖 DSH 运行时，直接验证分词器、渲染器与排版几何。
 *
 * 运行：node tests/smoke.mjs
 * 产出：smoke-report.txt（仓库根，已被 .gitignore 忽略）与 examples/ 下的示例产物。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLanguage, LANGUAGE_IDS } from '../src/languages.js';
import { tokenizeLines, linesToText, setLanguageResolver } from '../src/tokenize.js';
import { resolveTheme, THEME_IDS } from '../src/themes.js';
import * as render from '../src/render.js';
import { detectLanguage } from '../src/detect.js';

setLanguageResolver(resolveLanguage);

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplesDir = path.join(outDir, 'examples');
fs.mkdirSync(examplesDir, { recursive: true });

const report = [];
let failures = 0;
let checks = 0;

function check(name, ok, detail = '') {
  checks++;
  if (!ok) failures++;
  report.push(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`);
}

/* ------------------------------------------------------------------ *
 * 1. 不变式：任何语言、任何输入，分词结果拼回来必须等于输入
 * ------------------------------------------------------------------ */

const STRESS = [
  'const x = 1; # 注释 comment',
  '/* block */ "double" \'single\' `tpl` """triple"""',
  '@decorator $var ${x} %s &amp; <tag a="1" b=\'2\'>',
  '[[raw]] ~"tilde" r"raw" R"(cpp)" @"verbatim"',
  '- item: value',
  'foo(bar) => baz; // tail',
  '\\command{arg} % percent',
  '  -42.5e3 0xFF 0b1010 1_000L 3.14',
  '<?xml version="1.0"?> <!DOCTYPE html>',
  "SELECT * FROM t WHERE a = 'x';",
  '',
  '|a|b|,c,d',
  '    四空格缩进 中文注释 remark',
].join('\n');

const EDGE_CASES = ['', '\n', '\n\n', 'a', '   ', '\uFEFFx', '中文', 'emoji 🎉 ok'];

for (const id of LANGUAGE_IDS) {
  const def = resolveLanguage(id);
  if (!def) {
    check(`resolve ${id}`, false, 'not resolvable');
    continue;
  }
  let ok = true;
  let detail = '';
  for (const sample of [STRESS, ...EDGE_CASES]) {
    let lines;
    let joined;
    try {
      lines = tokenizeLines(sample, def, { tabSize: 4 });
      joined = linesToText(lines).join('\n');
    } catch (error) {
      ok = false;
      detail = `threw: ${error.message}`;
      break;
    }
    if (joined !== sample) {
      ok = false;
      detail = `text changed: ${JSON.stringify(joined.slice(0, 40))} != ${JSON.stringify(sample.slice(0, 40))}`;
      break;
    }
    if (lines.length !== sample.split('\n').length) {
      ok = false;
      detail = `line count ${lines.length} != ${sample.split('\n').length}`;
      break;
    }
  }
  check(`roundtrip ${id}`, ok, detail);
}

/* ------------------------------------------------------------------ *
 * 2. 渲染器：所有主题 × 所有代表性格式不得抛错
 * ------------------------------------------------------------------ */

const SAMPLES = {
  python: [
    'import os',
    'from dataclasses import dataclass',
    '',
    '@dataclass',
    'class Report:',
    '    """报告元数据。"""',
    '    title: str = "季度报告"',
    '',
    '    def summary(self) -> str:',
    '        # 统计条目',
    '        total = len(self.items)',
    '        print(f"共 {total} 项")',
    '        return f"{self.title}: {total}"',
  ].join('\n'),
  javascript: [
    "import { readFile } from 'node:fs/promises';",
    '',
    'const VERSION = 3;',
    'export async function loadReport(path) {',
    "  const raw = await readFile(path, 'utf8');",
    '  const data = JSON.parse(raw);',
    '  return { ...data, version: VERSION, loadTime: Date.now() };',
    '}',
  ].join('\n'),
  typescript: [
    'interface ReportRow {',
    '  id: number;',
    '  name: string;',
    '  tags?: string[];',
    '}',
    '',
    'export function pick<T, K extends keyof T>(row: T, keys: K[]): Pick<T, K> {',
    '  return keys.reduce((acc, key) => ({ ...acc, [key]: row[key] }), {} as Pick<T, K>);',
    '}',
  ].join('\n'),
  go: [
    'package main',
    '',
    'import "fmt"',
    '',
    'func main() {',
    '\titems := []string{"a", "b"}',
    '\tfor i, v := range items {',
    '\t\tfmt.Printf("%d: %s\\n", i, v)',
    '\t}',
    '}',
  ].join('\n'),
  rust: [
    'use std::collections::HashMap;',
    '',
    'pub fn count(words: &[String]) -> HashMap<&String, usize> {',
    '    let mut map = HashMap::new();',
    '    for word in words {',
    '        *map.entry(word).or_insert(0) += 1;',
    '    }',
    '    map',
    '}',
  ].join('\n'),
  java: [
    'package com.example;',
    '',
    'import java.util.List;',
    '',
    'public class Report {',
    '    public static void main(String[] args) {',
    '        List<String> rows = List.of("a", "b");',
    '        rows.forEach(System.out::println);',
    '    }',
    '}',
  ].join('\n'),
  sql: [
    '-- 月度汇总',
    'SELECT t.region, COUNT(*) AS orders, SUM(t.amount) AS total',
    'FROM orders AS t',
    "WHERE t.created_at >= '2026-01-01'",
    'GROUP BY t.region',
    'ORDER BY total DESC;',
  ].join('\n'),
  html: [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '  <head><meta charset="utf-8"><title>报告</title></head>',
    '  <body class="report" data-version="2">',
    '    <!-- 主图 -->',
    '    <p>总计 &amp; 明细</p>',
    '  </body>',
    '</html>',
  ].join('\n'),
  css: [
    '.report-card {',
    '  display: flex;',
    '  gap: 12px;',
    '  background: #ffffff;',
    '  color: rgba(0, 0, 0, 0.87);',
    '}',
    '',
    '@media (max-width: 600px) {',
    '  .report-card { flex-direction: column; }',
    '}',
  ].join('\n'),
  json: [
    '{',
    '  "report": "季度总结",',
    '  "items": [1, 2, 3],',
    '  "nested": { "ok": true, "value": null }',
    '}',
  ].join('\n'),
  yaml: [
    'report: 季度总结',
    'items:',
    '  - name: alpha',
    '    value: 1',
    '  - name: beta',
    '    value: 2',
    'flags: [true, false, null]',
  ].join('\n'),
  markdown: [
    '# 报告标题',
    '',
    '正文包含 `inline code` 与 [链接](https://example.com)。',
    '',
    '```python',
    'def hello(name):',
    '    return f"hi {name}"',
    '```',
    '',
    '> 引用段落',
  ].join('\n'),
  bash: [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    'REPORT_DIR="${1:-./reports}"',
    'for file in "$REPORT_DIR"/*.md; do',
    '  echo "==> $file"',
    '  wc -l "$file"',
    'done',
  ].join('\n'),
  dockerfile: [
    'FROM node:20-alpine',
    'WORKDIR /app',
    'COPY package*.json ./',
    'RUN npm ci --omit=dev',
    'CMD ["node", "server.js"]',
  ].join('\n'),
  diff: [
    'diff --git a/report.md b/report.md',
    'index 1a2b3c4..5d6e7f8 100644',
    '--- a/report.md',
    '+++ b/report.md',
    '@@ -1,4 +1,5 @@',
    ' # 标题',
    '-旧行内容',
    '+新行内容',
    '+补充说明',
  ].join('\n'),
  latex: [
    '\\documentclass{article}',
    '\\begin{document}',
    '\\section{结果}',
    '公式 $E = mc^2$ 与 \\textbf{加粗} 文本。',
    '% 注释行',
    '\\end{document}',
  ].join('\n'),
  cpp: [
    '#include <iostream>',
    '#include <vector>',
    '',
    'template <typename T>',
    'T sum(const std::vector<T>& items) {',
    '  T total{};',
    '  for (const auto& item : items) total += item;',
    '  return total;',
    '}',
  ].join('\n'),
  toml: [
    '[package]',
    'name = "report"',
    'version = "1.0.0"',
    '',
    '[dependencies]',
    'serde = { version = "1", features = ["derive"] }',
  ].join('\n'),
};

const formatFunctions = {
  html: (lines, options) => render.renderHtml(lines, options),
  'html-file': (lines, options) => render.renderHtmlDocument([{ lines, language: options.language, title: options.title }], options),
  svg: (lines, options) => render.renderSvg(lines, options),
  latex: (lines, options) => render.renderLatex(lines, options),
  'latex-minted': (lines, options) => render.renderLatex(lines, { ...options, latexBackend: 'minted' }),
  ansi: (lines, options) => render.renderAnsi(lines, options),
  markdown: (_lines, options) => render.renderMarkdown(SAMPLES[options.language] || '', options.language),
  text: (_lines, options) => SAMPLES[options.language] || '',
};

for (const [languageId, code] of Object.entries(SAMPLES)) {
  const def = resolveLanguage(languageId);
  check(`resolve sample ${languageId}`, !!def);
  if (!def) continue;
  const lines = tokenizeLines(code, def, { tabSize: 4 });
  for (const themeId of THEME_IDS) {
    const theme = resolveTheme(themeId, {});
    const options = {
      theme,
      language: languageId,
      lineNumbers: true,
      startLine: 1,
      highlightLines: ['2'],
      fontSize: 13,
      tabSize: 4,
      title: `${languageId} snippet`,
    };
    for (const [format, fn] of Object.entries(formatFunctions)) {
      try {
        const text = fn(lines, options);
        if (typeof text !== 'string' || text.length === 0) {
          check(`render ${languageId}/${themeId}/${format}`, false, 'empty output');
        }
      } catch (error) {
        check(`render ${languageId}/${themeId}/${format}`, false, `threw: ${error.message}`);
      }
    }
  }
}
report.push(`ok    render matrix: ${Object.keys(SAMPLES).length} languages × ${THEME_IDS.length} themes × ${Object.keys(formatFunctions).length} formats`);
checks++;

/* ------------------------------------------------------------------ *
 * 3. 语言自动识别
 * ------------------------------------------------------------------ */

const DETECT_CASES = [
  ['python', ['import os', 'def main():', '    print("hi")'].join('\n')],
  ['javascript', ['const a = 1;', 'console.log(a);'].join('\n')],
  ['java', ['public class A {', '  public static void main(String[] a) {}', '}'].join('\n')],
  ['go', ['package main', '', 'func main() {}'].join('\n')],
  ['rust', ['fn main() {', '    println!("hi");', '}'].join('\n')],
  ['sql', ['SELECT id FROM users;'].join('\n')],
  ['json', ['{ "a": 1 }'].join('\n')],
  ['html', ['<!DOCTYPE html>', '<html><body></body></html>'].join('\n')],
  ['dockerfile', ['FROM alpine', 'RUN apk add curl'].join('\n')],
  ['diff', ['diff --git a/x b/x', '@@ -1 +1 @@'].join('\n')],
];

for (const [expected, code] of DETECT_CASES) {
  const def = detectLanguage(code);
  check(`detect ${expected}`, !!def && def.id === expected, def ? `got ${def.id}` : 'got nothing');
}

/* ------------------------------------------------------------------ *
 * 4. 分词结果抽样（人工可读，用于确认分类合理）
 * ------------------------------------------------------------------ */

for (const languageId of ['python', 'javascript', 'sql', 'markdown', 'yaml', 'diff']) {
  const code = SAMPLES[languageId];
  const lines = tokenizeLines(code, resolveLanguage(languageId), { tabSize: 4 });
  report.push('');
  report.push(`--- tokens: ${languageId} ---`);
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const rendered = lines[i].map((token) => `${token.k}(${JSON.stringify(token.v)})`).join(' ');
    report.push(`${String(i + 1).padStart(2)}: ${rendered}`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. 生成示例产物
 * ------------------------------------------------------------------ */

const exampleTheme = resolveTheme('github-dark', {});
const pythonLines = tokenizeLines(SAMPLES.python, resolveLanguage('python'), { tabSize: 4 });
fs.writeFileSync(
  path.join(examplesDir, 'python-highlight.html'),
  render.renderHtmlDocument([{ lines: pythonLines, language: 'python', title: 'Python 报告片段' }], {
    theme: exampleTheme,
    language: 'python',
    title: 'Python 报告片段',
    lineNumbers: true,
    fontSize: 13,
  }),
  'utf8',
);

const goLines = tokenizeLines(SAMPLES.go, resolveLanguage('go'), { tabSize: 4 });
fs.writeFileSync(
  path.join(examplesDir, 'go-highlight.svg'),
  render.renderSvg(goLines, {
    theme: exampleTheme,
    language: 'go',
    lineNumbers: true,
    fontSize: 14,
    title: 'main.go',
  }),
  'utf8',
);

const sqlLines = tokenizeLines(SAMPLES.sql, resolveLanguage('sql'), { tabSize: 4 });
fs.writeFileSync(
  path.join(examplesDir, 'sql-highlight.tex'),
  render.renderLatex(sqlLines, {
    theme: resolveTheme('github-light', {}),
    language: 'sql',
    lineNumbers: true,
    title: '月度汇总查询',
  }),
  'utf8',
);

report.push('');
report.push(`examples written: python-highlight.html, go-highlight.svg, sql-highlight.tex`);

/* ------------------------------------------------------------------ *
 * 6. 画布模式：SVG 按目标页面尺寸出图
 * ------------------------------------------------------------------ */

{
  const lines = tokenizeLines(SAMPLES.python, resolveLanguage('python'), { tabSize: 4 });
  const base = { theme: exampleTheme, language: 'python', lineNumbers: true };
  const plain = render.renderSvg(lines, base);
  check('svg block keeps natural size', /width="\d+" height="\d+"/.test(plain) && !/width="960"/.test(plain));
  const framed = render.renderSvg(lines, { ...base, canvas: '960x540' });
  check('svg canvas 960x540', /^<svg[^>]*width="960" height="540"/.test(framed), framed.slice(0, 60));
  check('svg canvas has translate', /<g transform="translate\(/.test(framed));
  const framed16x9 = render.renderSvg(lines, { ...base, canvas: '1280×720' });
  check('svg canvas accepts full-width x', /width="1280" height="720"/.test(framed16x9));
  const bad = render.renderSvg(lines, { ...base, canvas: 'nonsense' });
  check('svg ignores malformed canvas', !/<g transform=/.test(bad));
}

/* ------------------------------------------------------------------ *
 * 7. 文档排版：英寸宽度、标题去重、CJK 步进
 * ------------------------------------------------------------------ */

{
  const lines = tokenizeLines(SAMPLES.python, resolveLanguage('python'), { tabSize: 4 });
  const base = {
    theme: resolveTheme('paper-light', {}),
    language: 'python',
    lineNumbers: true,
    title: 'doorbell.py',
  };

  const doc = render.renderHtmlDocument(
    [{ lines, language: 'python', title: 'doorbell.py' }],
    { ...base, documentTitle: '示例报告' },
  );
  check('html-file has no h2 block heading', !/<h2/.test(doc));
  check('html-file keeps exactly one block label', (doc.match(/doorbell\.py/g) || []).length === 1);
  check('html-file document_title appears in h1 and <title>', (doc.match(/示例报告/g) || []).length === 2);

  const withoutTitle = render.renderHtmlDocument(
    [{ lines, language: 'python', title: 'doorbell.py' }],
    { ...base, showTitle: false },
  );
  check('show_title false drops the label everywhere', !/doorbell\.py/.test(withoutTitle));
  check('show_title false still renders the code', /<pre/.test(withoutTitle));

  const inch = render.renderSvg(lines, { ...base, widthIn: 6.3 });
  const inchWidth = Number((/width="([\d.]+)in"/.exec(inch) || [])[1]);
  check('svg width_in caps the physical width', inchWidth > 0 && inchWidth <= 6.3, `${inchWidth}in`);
  check('svg width_in keeps a viewBox', /viewBox="0 0 \d+/.test(inch));

  const cjkWidth = render.measureText('报告', 10);
  const asciiWidth = render.measureText('abcd', 10);
  check('cjk glyph occupies two cells', Math.abs(cjkWidth - asciiWidth) < 0.001, `${cjkWidth} vs ${asciiWidth}`);
  check('wide code point detector', render.isWideCodePoint('报'.codePointAt(0)) && !render.isWideCodePoint(65));
  check('paper-light theme exists', !!resolveTheme('paper-light', {}) && THEME_IDS.includes('paper-light'));
}

/* ------------------------------------------------------------------ *
 * 汇总
 * ------------------------------------------------------------------ */

const header = [
  `checks: ${checks}   failures: ${failures}`,
  `languages: ${LANGUAGE_IDS.length}   themes: ${THEME_IDS.length}`,
  '',
].join('\n');

fs.writeFileSync(path.join(outDir, 'smoke-report.txt'), header + report.join('\n') + '\n', 'utf8');
console.log(header);
console.log(failures === 0 ? 'SMOKE OK' : `SMOKE FAILED (${failures})`);
if (failures > 0) {
  for (const line of report) if (line.startsWith('FAIL')) console.log(line);
}
process.exitCode = failures === 0 ? 0 : 1;
