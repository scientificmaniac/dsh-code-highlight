/**
 * 冒烟测试：不依赖 DSH 运行时，直接验证分词器、渲染器与排版几何。
 *
 * 运行：node tests/smoke.mjs
 * 产出：smoke-report.txt（仓库根，已被 .gitignore 忽略）与 examples/ 下的示例产物。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLanguage, LANGUAGE_IDS } from '../src/languages.js';
import { tokenizeLines, linesToText, setLanguageResolver } from '../src/tokenize.js';
import { resolveTheme, THEME_IDS } from '../src/themes.js';
import { parseShHtml, looksLikeShHtml } from '../src/shhtml.js';
import * as render from '../src/render.js';
import { apply } from '../index.js';
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
  'sh-html': (lines, options) => render.renderShHtml(lines, options),
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
  check('show_title false still renders the code', /<table/.test(withoutTitle));

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
 * 8. SyntaxHighlighter 经典主题（codeinword.com 同款高亮方式）
 * ------------------------------------------------------------------ */

{
  const SH_IDS = ['sh-default', 'sh-django', 'sh-eclipse', 'sh-emacs', 'sh-fadetogrey', 'sh-mdultra', 'sh-midnight', 'sh-rdark'];
  for (const id of SH_IDS) check(`sh theme ${id} exists`, THEME_IDS.includes(id));

  const aliasCases = {
    codeinword: 'sh-default', syntaxhighlighter: 'sh-default',
    django: 'sh-django', eclipse: 'sh-eclipse', emacs: 'sh-emacs',
    fadetogrey: 'sh-fadetogrey', mdultra: 'sh-mdultra',
    midnight: 'sh-midnight', rdark: 'sh-rdark',
  };
  for (const [alias, id] of Object.entries(aliasCases)) {
    check(`alias ${alias} → ${id}`, resolveTheme(alias, {}) === resolveTheme(id, {}));
  }

  const spotColors = [
    ['sh-default', 'keyword', '#006699'], ['sh-default', 'string', '#0000ff'],
    ['sh-eclipse', 'tag', '#3f7f7f'], ['sh-eclipse', 'attr', '#7f007f'],
    ['sh-django', 'keyword', '#96dd3b'], ['sh-rdark', 'string', '#5ce638'],
    ['sh-midnight', 'plain', '#d1edff'], ['sh-mdultra', 'constant', '#ffff00'],
  ];
  for (const [id, kind, expected] of spotColors) {
    const actual = resolveTheme(id, {}).colors[kind];
    check(`color ${id}/${kind}`, actual === expected, `got ${actual}`);
  }

  check('sh-default keyword is bold', resolveTheme('sh-default', {}).decorations.keyword === 'bold');
  check('django comment is italic', resolveTheme('sh-django', {}).decorations.comment === 'italic');
  check('fadetogrey function is bold', resolveTheme('sh-fadetogrey', {}).decorations.function === 'bold');

  const lines = tokenizeLines(SAMPLES.python, resolveLanguage('python'), { tabSize: 4 });
  const shHtml = render.renderHtml(lines, {
    theme: resolveTheme('sh-default', {}),
    language: 'python',
    lineNumbers: true,
    highlightLines: ['2'],
    title: 'demo.py',
  });
  check('sh html keeps the theme background', shHtml.includes('background:#ffffff'));
  check('sh html paints the gutter edge stripe', shHtml.includes('border-right:3px solid #6ce26c'));
  check('sh html paints the emphasized line band', shHtml.includes('background:#e0e0e0'));
  check('sh html paints the emphasized gutter number', shHtml.includes('background:#6ce26c'));

  const plainHtml = render.renderHtml(lines, {
    theme: resolveTheme('paper-light', {}),
    language: 'python',
    lineNumbers: true,
    highlightLines: ['2'],
  });
  check('legacy themes keep no gutter edge', !plainHtml.includes('border-right:3px solid'));

  const shDemoThemes = ['sh-default', 'sh-eclipse', 'sh-django', 'sh-midnight', 'sh-rdark'];
  const shDemoBody = shDemoThemes.map((id) => render.renderHtml(lines, {
    theme: resolveTheme(id, {}),
    language: 'python',
    lineNumbers: true,
    highlightLines: ['2'],
    title: `demo.py — ${id}`,
  })).join('\n');
  fs.writeFileSync(
    path.join(examplesDir, 'sh-themes-demo.html'),
    `<!DOCTYPE html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><title>SyntaxHighlighter 经典主题</title></head>\n<body style="padding:24px;background:#f6f8fa">\n${shDemoBody}\n</body>\n</html>\n`,
    'utf8',
  );
  report.push('');
  report.push('examples written: sh-themes-demo.html');
}

/* ------------------------------------------------------------------ *
 * 9. codeinword / SyntaxHighlighter HTML 导入与导出
 * ------------------------------------------------------------------ */

{
  // codeinword.com 实际导出的高亮 HTML（含 &nbsp; 缩进、实体转义、空行）。
  const SAMPLE = [
    '<div class="container">',
    '<div class="line number1 index0 alt2"><code class="python keyword">def</code> <code class="python plain">bubble_sort(arr):</code></div>',
    '<div class="line number2 index1 alt1"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python plain">n </code><code class="python keyword">=</code> <code class="python functions">len</code><code class="python plain">(arr)</code></div>',
    '<div class="line number3 index2 alt2"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python comments"># 外层循环控制排序轮数</code></div>',
    '<div class="line number4 index3 alt1"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python keyword">for</code> <code class="python plain">i </code><code class="python keyword">in</code> <code class="python functions">range</code><code class="python plain">(n):</code></div>',
    '<div class="line number5 index4 alt2"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python comments"># 内层循环控制每轮比较次数</code></div>',
    '<div class="line number6 index5 alt1"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python keyword">for</code> <code class="python plain">j </code><code class="python keyword">in</code> <code class="python functions">range</code><code class="python plain">(</code><code class="python value">0</code><code class="python plain">, n </code><code class="python keyword">-</code> <code class="python plain">i </code><code class="python keyword">-</code> <code class="python value">1</code><code class="python plain">):</code></div>',
    '<div class="line number7 index6 alt2"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python comments"># 如果前一个元素大于后一个元素，则交换它们</code></div>',
    '<div class="line number8 index7 alt1"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python keyword">if</code> <code class="python plain">arr[j] &gt; arr[j </code><code class="python keyword">+</code> <code class="python value">1</code><code class="python plain">]:</code></div>',
    '<div class="line number9 index8 alt2"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python plain">arr[j], arr[j </code><code class="python keyword">+</code> <code class="python value">1</code><code class="python plain">] </code><code class="python keyword">=</code> <code class="python plain">arr[j </code><code class="python keyword">+</code> <code class="python value">1</code><code class="python plain">], arr[j]</code></div>',
    '<div class="line number10 index9 alt1"><code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;</code><code class="python keyword">return</code> <code class="python plain">arr</code></div>',
    '<div class="line number11 index10 alt2">&nbsp;</div>',
    '<div class="line number12 index11 alt1"><code class="python comments"># 测试代码</code></div>',
    '<div class="line number13 index12 alt2"><code class="python plain">numbers </code><code class="python keyword">=</code> <code class="python plain">[</code><code class="python value">64</code><code class="python plain">, </code><code class="python value">34</code><code class="python plain">, </code><code class="python value">25</code><code class="python plain">, </code><code class="python value">12</code><code class="python plain">, </code><code class="python value">22</code><code class="python plain">, </code><code class="python value">11</code><code class="python plain">, </code><code class="python value">90</code><code class="python plain">]</code></div>',
    '<div class="line number14 index13 alt1"><code class="python plain">sorted_numbers </code><code class="python keyword">=</code> <code class="python plain">bubble_sort(numbers)</code></div>',
    '<div class="line number15 index14 alt2"><code class="python functions">print</code><code class="python plain">(</code><code class="python string">"排序后的数组:"</code><code class="python plain">, sorted_numbers)</code></div>',
    '</div>',
  ].join('');

  const EXPECTED_SOURCE = [
    'def bubble_sort(arr):',
    '    n = len(arr)',
    '    # 外层循环控制排序轮数',
    '    for i in range(n):',
    '        # 内层循环控制每轮比较次数',
    '        for j in range(0, n - i - 1):',
    '            # 如果前一个元素大于后一个元素，则交换它们',
    '            if arr[j] > arr[j + 1]:',
    '                arr[j], arr[j + 1] = arr[j + 1], arr[j]',
    '    return arr',
    '',
    '# 测试代码',
    'numbers = [64, 34, 25, 12, 22, 11, 90]',
    'sorted_numbers = bubble_sort(numbers)',
    'print("排序后的数组:", sorted_numbers)',
  ].join('\n');

  const parsed = parseShHtml(SAMPLE);
  check('sh-html parsed into tokens', !!parsed && parsed.form === 'tokens' && parsed.lines.length === 15,
    parsed ? `form=${parsed.form} lines=${parsed.lines?.length}` : 'null');
  check('sh-html brush language detected', !!parsed && parsed.language === 'python');
  check('sh-html startLine from number class', !!parsed && parsed.startLine === 1);

  const first = parsed && parsed.form === 'tokens' ? parsed.lines[0] : [];
  check('sh-html line 1 kinds',
    first.length >= 3 && first[0].k === 'keyword' && first[0].v === 'def'
    && first[1].v === ' ' && first[2].v === 'bubble_sort(arr):');

  const parsedLines = parsed && parsed.form === 'tokens' ? parsed.lines : [];
  const line3 = linesToText([parsedLines[2]]).join('');
  check('sh-html nbsp indent becomes spaces', line3 === '    # 外层循环控制排序轮数', JSON.stringify(line3));
  const line8 = linesToText([parsedLines[7]]).join('');
  check('sh-html entities decoded', line8 === '            if arr[j] > arr[j + 1]:', JSON.stringify(line8));
  check('sh-html keeps the blank line', !!parsedLines[10] && parsedLines[10].length === 0);

  const source = linesToText(parsedLines).join('\n');
  check('sh-html source reconstruction', source === EXPECTED_SOURCE,
    JSON.stringify(source.slice(0, 60)));

  check('looksLikeShHtml accepts the sample', looksLikeShHtml(SAMPLE));
  check('looksLikeShHtml rejects plain code', !looksLikeShHtml('const a = 1;\nprint(a);'));
  check('looksLikeShHtml rejects line div without code', !looksLikeShHtml('<div class="line">just text</div>'));

  // 换肤重渲：转成 monokai 的行内样式 HTML，不再依赖外部样式表。
  const recolored = render.renderHtml(parsedLines, { theme: resolveTheme('monokai', {}), language: 'python' });
  check('sh-html recolors with inline styles', recolored.includes('#f92672') && !recolored.includes('class="python'));

  // 反向导出：emit → reparse 往返后源码一致。
  const emitted = render.renderShHtml(parsedLines, { language: 'python' });
  const reparsed = parseShHtml(emitted);
  check('sh-html emit → reparse roundtrip', !!reparsed && reparsed.form === 'tokens' && linesToText(reparsed.lines).join('\n') === source);
  check('sh-html emit uses spaces class', emitted.includes('<code class="python spaces">&nbsp;&nbsp;&nbsp;&nbsp;</code>'));
  check('sh-html emit numbers and zebra lines', emitted.includes('class="line number11 index10 alt2"'));

  const pre = parseShHtml('<pre class="brush: python">print("hi")\n</pre>');
  check('sh-html accepts the pre/brush form', !!pre && pre.form === 'source' && pre.language === 'python' && pre.source === 'print("hi")');
}

/* ------------------------------------------------------------------ *
 * 10. 工具级行为：尾换行、Word 友好 HTML 结构、字体栈
 * ------------------------------------------------------------------ */

{
  let tool;
  apply({ effect: (fn) => fn(), tools: { register: (t) => { tool = t; } } });
  check('apply registers highlight_code', !!tool && tool.name === 'highlight_code');

  // P2：带尾换行与不带尾换行必须得到同样的行数。
  const withNewline = tool.execute({ code: 'const a = 1;\nconst b = 2;\n', format: 'text' }, {});
  const withoutNewline = tool.execute({ code: 'const a = 1;\nconst b = 2;', format: 'text' }, {});
  check('trailing newline adds no extra line', withNewline.lines === 2 && withoutNewline.lines === 2,
    `${withNewline.lines} vs ${withoutNewline.lines}`);

  // P1/P3/P5：HTML 输出为表格版式，title 在代码格外且不可选中。
  const run = tool.execute({
    code: 'def greet(name):\n    # 问候\n    print(f"hi {name}")\n',
    language: 'python',
    format: 'html',
    theme: 'sh-default',
    title: 'greet.py',
  }, {});
  const html = run.content;
  check('html uses table rows', /<table[^>]*border-collapse:collapse/.test(html) && (html.match(/<tr>/g) || []).length === 4);
  check('html has no display:block span', !html.includes('display:block'));
  check('html keeps one pre-formatted cell per line', (html.match(/white-space:pre/g) || []).length === 3);
  check('html line numbers are table cells', /<td style="[^"]*text-align:right[^"]*"[^>]*>2<\/td>/.test(html));
  check('html title sits outside code cells', /<td colspan="2"[^>]*user-select:none[^>]*>greet\.py<\/td>/.test(html));
  check('html leading indent uses nbsp', /white-space:pre;vertical-align:top"[^>]*>(?:&nbsp;)+/.test(html));
  check('html blank/empty lines keep a row height', !/> <\/td>/.test(html));

  // P4：字体栈首项必须是具体字体名，非 CSS 系统关键字。
  check('mono stack starts with a concrete font', render.DEFAULT_MONO.startsWith('Consolas,'));

  // 空行渲染为 &nbsp; 占位（Word 中保持行高）。
  const blank = tool.execute({ code: 'a\n\nb', format: 'html' }, {});
  check('html empty line becomes nbsp cell', /<td style="[^"]*white-space:pre[^"]*">&nbsp;<\/td>/.test(blank.content));

  // 尾随换行（含 CRLF 粘贴）不得多出空行——15 行代码必须是 15 行。
  const fifteen = 'def f():\n' + '    x = 1\n'.repeat(13) + '    return x';
  check('trailing \\n and \\r\\n keep 15 lines',
    tool.execute({ code: fifteen + '\n', format: 'text' }, {}).lines === 15
    && tool.execute({ code: fifteen + '\r\n', format: 'text' }, {}).lines === 15);

  // text + output_file：内容为空时 render() 仍要给成功反馈。
  const tmp = path.join(os.tmpdir(), `dsh-smoke-text-${process.pid}-${Date.now()}.txt`);
  const written = tool.execute({ code: 'x = 1\n', format: 'text', output_file: tmp }, {});
  const feedback = tool.output.render({}, written)[0].text;
  check('text + output_file returns feedback', written.content === '' && written.files.length === 1 && feedback.includes('Wrote text to'));
  fs.rmSync(tmp, { force: true });

  // listings 的 caption 必须走选项：浮动体外的 \caption 单独编译报 "Caption outside float"。
  const tex = render.renderLatex([[{ k: 'plain', v: 'x = 1' }]], { theme: resolveTheme('paper-light', {}), language: 'python', title: 'demo.py' });
  check('latex caption uses the listing option', tex.includes('caption={demo.py}') && !tex.includes('\\caption{'));
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
