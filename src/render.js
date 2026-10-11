/**
 * 渲染器集合：把分词结果渲染成各种报告可用的产物。
 *
 * 每个渲染器只依赖 token 的 `k`/`v` 与主题，不修改输入。
 * 输出一律自包含：HTML 用内联样式，SVG 用内联属性，LaTeX 自带宏包注释。
 */

import { linesToText } from './tokenize.js';
import { colorFor, backgroundFor, decorationsFor } from './themes.js';

/** 等宽字体栈：优先本地 UI 等宽字体，再退到通用等宽族。 */
export const DEFAULT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

/** 转义 HTML 文本节点与 XML 文本。 */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 估算一行文本在固定步进等宽网格下的像素宽度。
 *
 * 单元格宽度固定为 `0.6 × fontSize`，宽字符（CJK、全角、emoji）占两个单元格。
 * Python 栅格化器使用同一模型，因此 SVG 与 PNG 的逐格排版一致。
 */
export function measureText(text, fontSize) {
  let width = 0;
  for (const ch of text) {
    width += isWideCodePoint(ch.codePointAt(0)) ? fontSize * 1.2 : fontSize * 0.6;
  }
  return width;
}

/** 判断码点是否占两个等宽单元格。 */
export function isWideCodePoint(code) {
  return (
    (code >= 0x1100 && code <= 0x115f)
    || (code >= 0x2e80 && code <= 0xa4cf)
    || (code >= 0xac00 && code <= 0xd7a3)
    || (code >= 0xf900 && code <= 0xfaff)
    || (code >= 0xfe30 && code <= 0xfe6f)
    || (code >= 0xff00 && code <= 0xff60)
    || (code >= 0xffe0 && code <= 0xffe6)
    || (code >= 0x1f300 && code <= 0x1faff)
    || (code >= 0x20000 && code <= 0x3fffd)
  );
}

/** 一个 token 的行内 CSS 声明。 */
function tokenCss(theme, token) {
  const parts = [`color:${colorFor(theme, token.k)}`];
  const background = backgroundFor(theme, token.k);
  if (background) parts.push(`background-color:${background}`);
  const { bold, italic } = decorationsFor(theme, token.k);
  if (bold) parts.push('font-weight:600');
  if (italic) parts.push('font-style:italic');
  return parts.join(';');
}

/** 一行的背景色（diff 增删行、显式高亮行）。 */
function lineBackground(theme, tokens) {
  for (const token of tokens) {
    if (token.k === 'inserted' || token.k === 'deleted') {
      const background = backgroundFor(theme, token.k);
      if (background) return background;
    }
  }
  return null;
}

/**
 * 渲染 HTML 片段（全内联样式，可直接粘进 Markdown / HTML / 邮件 / Word）。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @param {object} [options] 渲染选项。
 * @returns {string} HTML 片段。
 */
export function renderHtml(lines, options = {}) {
  const theme = options.theme;
  const fontSize = options.fontSize || 13;
  const lineHeight = options.lineHeight || 1.5;
  const fontFamily = options.fontFamily || DEFAULT_MONO;
  const showNumbers = options.lineNumbers !== false;
  const startLine = options.startLine || 1;
  const pad = options.padding === undefined ? 14 : options.padding;
  const highlights = normalizeHighlightLines(options.highlightLines, lines.length, startLine);
  const digits = String(startLine + lines.length - 1).length;
  const gutterWidth = `${digits}ch`;

  const pre = [
    'margin:0',
    `padding:${pad}px 0`,
    `background:${theme.background}`,
    `border:1px solid ${theme.border}`,
    'border-radius:8px',
    'overflow-x:auto',
    `color:${colorFor(theme, 'plain')}`,
    `font-family:${fontFamily}`,
    `font-size:${fontSize}px`,
    `line-height:${lineHeight}`,
    'tab-size:4',
    'text-align:left',
    'white-space:pre',
  ].join(';');

  const out = [`<pre style="${pre}"><code style="font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;white-space:pre">`];

  if (options.title && options.showTitle !== false) {
    out.push(`<span style="display:block;padding:0 ${pad}px ${Math.max(8, Math.round(fontSize * 0.7))}px;color:${theme.lineNumber};font-size:${Math.max(10, fontSize - 2)}px">${escapeXml(options.title)}</span>`);
  }

  const numberWidth = showNumbers ? `width:${gutterWidth};text-align:right;padding-right:${pad}px;color:${theme.lineNumber};user-select:none;-webkit-user-select:none` : null;

  for (let index = 0; index < lines.length; index++) {
    const tokens = lines[index];
    const lineNo = startLine + index;
    const rowStyle = ['display:block', `padding:0 ${pad}px`];
    const background = lineBackground(theme, tokens) || (highlights.has(lineNo) ? theme.titleBar : null);
    if (background) rowStyle.push(`background:${background}`);
    const body = tokens.map((token) => (token.k === 'plain' ? escapeXml(token.v) : `<span style="${tokenCss(theme, token)}">${escapeXml(token.v)}</span>`)).join('');
    const gutter = numberWidth ? `<span style="display:inline-block;${numberWidth}">${lineNo}</span>` : '';
    out.push(`<span style="${rowStyle.join(';')}">${gutter}${body || ' '}</span>`);
  }

  out.push('</code></pre>');
  return out.join('');
}

/**
 * 渲染一个完整、可独立打开或打印成 PDF 的 HTML 文档。
 *
 * 文档级标题只来自 `documentTitle`；每个代码块自己的标签只由 `renderHtml` 输出一次，
 * 因此同一个文件名不会在 h1、小节标题和代码块内重复出现。
 * @param {Array<{lines:Array, language?:string, title?:string}>} blocks 代码块列表。
 * @param {object} [options] 渲染选项。
 * @returns {string} HTML 文档。
 */
export function renderHtmlDocument(blocks, options = {}) {
  const theme = options.theme;
  const documentTitle = options.documentTitle;
  const body = blocks.map((block) => {
    const rendered = renderHtml(block.lines, {
      ...options,
      title: block.title === undefined ? options.title : block.title,
      language: block.language,
    });
    return `<section style="margin:0 0 24px">${rendered}</section>`;
  }).join('\n');
  const heading = documentTitle
    ? `<h1 style="font-size:18px;font-weight:600;margin:0 0 20px">${escapeXml(documentTitle)}</h1>\n`
    : '';
  return `<!DOCTYPE html>
<html lang="${options.lang || 'zh-CN'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(documentTitle || 'Code Highlight')}</title>
<style>
  :root { color-scheme: ${theme.dark ? 'dark' : 'light'}; }
  body { margin:0; padding:24px; background:${theme.dark ? '#010409' : '#ffffff'}; color:${colorFor(theme, 'plain')}; font-family:${options.fontFamily || DEFAULT_MONO}; }
  main { max-width: ${options.maxWidthPx || 900}px; margin: 0 auto; }
  @media print { body { background:#fff; padding:0; } main { max-width: none; } pre { break-inside: avoid; } }
</style>
</head>
<body>
<main>
${heading}${body}
</main>
</body>
</html>
`;
}

/** 把 highlightLines 归一化成行号集合。 */
function normalizeHighlightLines(value, count, startLine) {
  const set = new Set();
  if (!value) return set;
  const entries = Array.isArray(value) ? value : [value];
  for (const entry of entries) {
    if (typeof entry === 'number') set.add(entry);
    else if (typeof entry === 'string') {
      const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(entry.trim());
      if (m) {
        const from = Math.max(Number(m[1]), startLine);
        const to = Math.min(Number(m[2]), startLine + count - 1);
        for (let n = from; n <= to; n++) set.add(n);
      } else if (/^\d+$/.test(entry.trim())) set.add(Number(entry.trim()));
    } else if (entry && typeof entry === 'object') {
      const from = Number(entry.from);
      const to = Number(entry.to === undefined ? entry.from : entry.to);
      for (let n = from; n <= to; n++) set.add(n);
    }
  }
  return set;
}

/**
 * 渲染 SVG 矢量代码图：可直接贴进 Word / PPT / 网页，也可交给 Univer 的 SVG 编译入口。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @param {object} [options] 渲染选项。
 * @returns {string} SVG 源码。
 */
export function renderSvg(lines, options = {}) {
  const block = svgBlock(lines, options);
  const label = escapeXml(options.title || options.language || 'code');
  const canvas = parseCanvas(options.canvas);
  const inches = canvas ? null : parseInches(options.widthIn);
  if (!canvas && !inches) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${block.width}" height="${block.height}" viewBox="0 0 ${block.width} ${block.height}" role="img" aria-label="${label}">`,
      block.body,
      '</svg>',
    ].join('\n');
  }
  if (!canvas && inches) {
    const logicalWidth = inches * 96;
    const scale = Math.min(1, logicalWidth / block.width);
    const widthInches = round3((block.width * scale) / 96);
    const heightInches = round3((block.height * scale) / 96);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${widthInches}in" height="${heightInches}in" viewBox="0 0 ${block.width} ${block.height}" role="img" aria-label="${label}">`,
      block.body,
      '</svg>',
    ].join('\n');
  }
  const margin = options.canvasMargin === undefined ? 32 : options.canvasMargin;
  const targetWidth = canvas.width;
  const scale = Math.min(1, (targetWidth - margin * 2) / block.width, (canvas.height - margin * 2) / block.height);
  const blockHeight = block.height * scale;
  const x = Math.round((targetWidth - block.width * scale) / 2);
  const y = Math.round((canvas.height - blockHeight) / 2);
  const transform = scale === 1
    ? `translate(${x} ${y})`
    : `translate(${x} ${y}) scale(${Number(scale.toFixed(4))})`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${canvas.height}" viewBox="0 0 ${targetWidth} ${canvas.height}" role="img" aria-label="${label}">`,
    `<rect width="${targetWidth}" height="${canvas.height}" fill="${options.canvasBackground || options.theme.background}"/>`,
    `<g transform="${transform}">`,
    block.body,
    '</g>',
    '</svg>',
  ].join('\n');
}

/** 保留三位小数，用于英寸尺寸。 */
function round3(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * 计算代码块的自然几何：供 SVG 与 Python 栅格化器共用，保证两者尺寸一致。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @param {object} options 渲染选项。
 * @returns {{width:number, height:number, fontSize:number, lineHeight:number, padding:number, titleHeight:number, unit:number, gutter:number, digits:number}}
 */
export function blockGeometry(lines, options) {
  const fontSize = options.fontSize || 13;
  const lineHeight = Math.round(fontSize * (options.lineHeight || 1.5));
  const padding = options.padding === undefined ? 18 : options.padding;
  const startLine = options.startLine || 1;
  const texts = linesToText(lines);
  const maxWidth = texts.reduce((max, text) => Math.max(max, measureText(text, fontSize)), 0);
  const digits = String(startLine + lines.length - 1).length;
  const unit = fontSize * 0.6;
  const gutter = options.lineNumbers === false ? 0 : digits * unit + 18;
  const showTitle = !!options.title && options.showTitle !== false;
  const titleHeight = showTitle ? Math.round(fontSize * 2.1) : 0;
  const width = Math.ceil((maxWidth + gutter + padding * 2) * 1.06);
  const height = Math.ceil(padding * 2 + titleHeight + lines.length * lineHeight + fontSize * 0.3);
  return { width, height, fontSize, lineHeight, padding, titleHeight, unit, gutter, digits, showTitle };
}

/** 解析物理宽度（英寸）。 */
function parseInches(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1 || number > 40) return null;
  return number;
}

/** 解析 `WIDTHxHEIGHT` 形式的画布尺寸。 */
function parseCanvas(value) {
  if (typeof value !== 'string') return null;
  const match = /^\s*(\d{2,5})\s*[x×*,]\s*(\d{2,5})\s*$/.exec(value);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 80 || height < 80 || width > 20000 || height > 20000) return null;
  return { width, height };
}

/** 生成代码块自身的 SVG 主体（不含外层 `svg` 元素）。 */
function svgBlock(lines, options) {
  const theme = options.theme;
  const geometry = blockGeometry(lines, options);
  const { width, height, fontSize, lineHeight, padding, titleHeight, gutter, showTitle } = geometry;
  const showNumbers = options.lineNumbers !== false;
  const startLine = options.startLine || 1;
  const mono = options.fontFamily || DEFAULT_MONO;

  const out = [];
  out.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${theme.background}" stroke="${theme.border}"/>`);
  if (showTitle) {
    out.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${titleHeight}" rx="8" fill="${theme.titleBar}"/>`);
    out.push(`<rect x="0.5" y="${titleHeight - 8}" width="${width - 1}" height="8" fill="${theme.titleBar}"/>`);
    out.push(`<text x="${padding}" y="${Math.round(titleHeight * 0.66)}" font-family="${mono}" font-size="${Math.max(10, fontSize - 1)}" fill="${theme.lineNumber}" xml:space="preserve">${escapeXml(options.title)}</text>`);
  }
  const baseY = padding + titleHeight;
  for (let index = 0; index < lines.length; index++) {
    const y = baseY + Math.round(lineHeight * index + fontSize * 1.05);
    if (showNumbers) {
      out.push(`<text x="${padding + gutter - 14}" y="${y}" text-anchor="end" font-family="${mono}" font-size="${fontSize}" fill="${theme.lineNumber}" xml:space="preserve">${startLine + index}</text>`);
    }
    const spans = lines[index].map((token) => {
      const attributes = [`fill="${colorFor(theme, token.k)}"`];
      const { bold, italic } = decorationsFor(theme, token.k);
      if (bold) attributes.push('font-weight="600"');
      if (italic) attributes.push('font-style="italic"');
      return `<tspan ${attributes.join(' ')} xml:space="preserve">${escapeXml(token.v)}</tspan>`;
    }).join('');
    out.push(`<text x="${padding + gutter}" y="${y}" font-family="${mono}" font-size="${fontSize}" xml:space="preserve">${spans}</text>`);
  }
  return { width, height, body: out.join('\n') };
}

/** listings 宏包能识别的语言名。 */
const LISTINGS_LANGUAGE = {
  javascript: 'JavaScript', typescript: 'JavaScript', jsx: 'JavaScript', tsx: 'JavaScript',
  python: 'Python', java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#', go: 'Go',
  rust: 'Rust', swift: 'Swift', ruby: 'Ruby', php: 'PHP', perl: 'Perl', lua: 'Lua',
  r: 'R', matlab: 'Matlab', julia: 'Julia', dart: 'Java', scala: 'Scala',
  haskell: 'Haskell', ocaml: 'Caml', erlang: 'Erlang', elixir: 'Elixir',
  clojure: 'Clojure', lisp: 'Lisp', fsharp: 'Caml', vb: 'VisualBasic', pascal: 'Pascal',
  fortran: 'Fortran', assembly: 'Assembler', sql: 'SQL', html: 'HTML', xml: 'XML',
  css: 'CSS', json: 'JavaScript', yaml: 'Python', toml: 'Python', ini: 'INI',
  markdown: 'TeX', latex: 'TeX', bash: 'bash', shell: 'bash', powershell: 'PowerShell',
  dockerfile: 'bash', makefile: 'make', cmake: 'make', verilog: 'Verilog', vhdl: 'VHDL',
  solidity: 'Java', protobuf: 'C', graphql: 'Java', terraform: 'Python', nix: 'Haskell',
  awk: 'Awk', cobol: 'Cobol', diff: 'Diff', csv: 'Java', zig: 'C', nim: 'Python',
  glsl: 'C', gdscript: 'Python', groovy: 'Java', kotlin: 'Java', apex: 'Java',
  batch: 'bash', fish: 'bash', http: 'bash', vim: 'bash', mermaid: 'bash',
};

/** 十六进制颜色转 LaTeX 的 `\definecolor` 用形式（去掉 `#`）。 */
function latexHex(color) {
  return String(color).replace('#', '').toUpperCase();
}

/**
 * 渲染 LaTeX 源码。
 *
 * 默认后端是 `listings`（pdfLaTeX / XeLaTeX / LuaLaTeX 通用，无需 shell-escape），
 * `minted` 后端交给 Pygments 处理。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @param {object} [options] 渲染选项。
 * @returns {string} LaTeX 片段。
 */
export function renderLatex(lines, options = {}) {
  const theme = options.theme;
  const language = options.language || 'text';
  const backend = options.latexBackend === 'minted' ? 'minted' : 'listings';
  const source = linesToText(lines).join('\n');
  const caption = options.title ? `\n\\caption{${escapeLatex(options.title)}}` : '';
  const hex = latexHex;

  if (backend === 'minted') {
    const mintedLanguage = options.mintedLanguage || language.replace(/[^A-Za-z0-9_+-]/g, '') || 'text';
    const titleLine = options.title ? `% Title: ${options.title.replace(/%/g, '\\%')}\n` : '';
    return `% Generated by dsh-code-highlight (minted backend).
% Requires: \\usepackage{minted}; compile with xelatex/lualatex and -shell-escape.
% Non-ASCII titles or code need a CJK-aware engine (xelatex + ctex/xeCJK).
${titleLine}\\begin{minted}[linenos=${options.lineNumbers === false ? 'false' : 'true'}, breaklines=true, fontsize=\\small]{${mintedLanguage}}
${source}
\\end{minted}
`;
  }

  const listingLanguage = LISTINGS_LANGUAGE[language];
  const listingOptions = [
    listingLanguage ? `language=${listingLanguage}` : null,
    `numbers=${options.lineNumbers === false ? 'none' : 'left'}`,
    `backgroundcolor=\\color[HTML]{${hex(theme.background)}}`,
    `basicstyle=\\ttfamily\\small\\color[HTML]{${hex(colorFor(theme, 'plain'))}}`,
    `keywordstyle=\\color[HTML]{${hex(colorFor(theme, 'keyword'))}}`,
    `stringstyle=\\color[HTML]{${hex(colorFor(theme, 'string'))}}`,
    `commentstyle=\\itshape\\color[HTML]{${hex(colorFor(theme, 'comment'))}}`,
    `numberstyle=\\color[HTML]{${hex(colorFor(theme, 'number'))}}`,
    'showstringspaces=false',
    'breaklines=true',
    'columns=fullflexible',
    'frame=single',
    'framexleftmargin=4pt',
    `rulecolor=\\color[HTML]{${hex(theme.border)}}`,
  ].filter(Boolean).join(', ');

  return `% Generated by dsh-code-highlight (listings backend).
% Requires: \\usepackage{listings} \\usepackage{xcolor}
\\begin{lstlisting}[${listingOptions}]
${source}
\\end{lstlisting}${caption}
% Color reference: keyword ${colorFor(theme, 'keyword')} / string ${colorFor(theme, 'string')} / comment ${colorFor(theme, 'comment')}
`;
}

/** 转义 LaTeX 特殊字符。 */
export function escapeLatex(value) {
  return String(value)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** 把 `#rrggbb` 拆成三元组。 */
function rgbOf(hex) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value.padEnd(6, '0').slice(0, 6);
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/**
 * 渲染 ANSI 彩色终端文本。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @param {object} [options] 渲染选项，`ansiMode` 为 `truecolor`（默认）或 `256`。
 * @returns {string} 带转义序列的文本。
 */
export function renderAnsi(lines, options = {}) {
  const theme = options.theme;
  const mode = options.ansiMode === '256' ? '256' : 'truecolor';
  const cache = new Map();
  const code = (kind) => {
    if (cache.has(kind)) return cache.get(kind);
    const [r, g, b] = rgbOf(colorFor(theme, kind));
    let value;
    if (mode === '256') {
      const r6 = Math.round((r / 255) * 5);
      const g6 = Math.round((g / 255) * 5);
      const b6 = Math.round((b / 255) * 5);
      value = `\u001b[38;5;${16 + 36 * r6 + 6 * g6 + b6}m`;
    } else {
      value = `\u001b[38;2;${r};${g};${b}m`;
    }
    const { bold, italic } = decorationsFor(theme, kind);
    if (bold) value += '\u001b[1m';
    if (italic) value += '\u001b[3m';
    cache.set(kind, value);
    return value;
  };
  const reset = '\u001b[0m';
  const showNumbers = options.lineNumbers === true;
  const startLine = options.startLine || 1;
  return lines.map((tokens, index) => {
    const body = tokens.map((token) => (token.k === 'plain' ? token.v : code(token.k) + token.v + reset)).join('');
    if (!showNumbers) return body;
    return `\u001b[38;2;110;118;129m${String(startLine + index).padStart(3)}\u001b[0m ${body}`;
  }).join('\n') + '\n';
}

/**
 * 渲染 Markdown 围栏代码块（由下游 Markdown 渲染器负责着色）。
 * @param {string} source 原始代码。
 * @param {string} language 语言 id。
 * @returns {string} Markdown 片段。
 */
export function renderMarkdown(source, language) {
  const fence = source.includes('```') ? '````' : '```';
  return `${fence}${language || ''}\n${source.replace(/\n$/, '')}\n${fence}\n`;
}
