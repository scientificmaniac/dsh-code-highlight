/**
 * SyntaxHighlighter 3 高亮 HTML 的导入与识别。
 *
 * codeinword.com 等工具导出的高亮结果是 class 标记的 HTML
 * （`<div class="line ..."><code class="python keyword">…`），
 * 颜色依赖外部样式表，直接贴进 Word 不会显色。这里把它解析回
 * token 行结构，交给既有渲染器重新产出任意格式。
 */

/** SyntaxHighlighter 的 token 类名 → 本插件 token kind。 */
const KIND_MAP = {
  plain: 'plain', spaces: 'plain', keyword: 'keyword', string: 'string',
  comments: 'comment', value: 'number', functions: 'function',
  constants: 'constant', variable: 'variable', preprocessor: 'meta',
  script: 'keyword', color1: 'property', color2: 'type', color3: 'constant',
};

/** 行结构类名，不参与语言与 kind 判断。 */
const STRUCTURAL = new Set([
  'line', 'alt', 'alt1', 'alt2', 'container', 'syntaxhighlighter', 'code',
  'gutter', 'toolbar', 'caption', 'highlighted', 'odd', 'even',
]);

function isStructural(name) {
  return STRUCTURAL.has(name) || /^number\d+$/.test(name) || /^index\d+$/.test(name);
}

/** 反转义 HTML 实体；`&nbsp;` 一律还原成普通空格。 */
export function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function classListOf(attrs) {
  const match = /class\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(attrs || '');
  return match ? (match[1] ?? match[2] ?? '').split(/\s+/).filter(Boolean) : [];
}

/**
 * 粗判输入是否像 SyntaxHighlighter 高亮 HTML（供 `input_format: auto` 嗅探）。
 * @param {unknown} input 待判定的文本。
 * @returns {boolean}
 */
export function looksLikeShHtml(input) {
  if (typeof input !== 'string') return false;
  const openRe = /<div\b([^>]*)>/gi;
  let open;
  while ((open = openRe.exec(input))) {
    if (classListOf(open[1]).includes('line')) {
      return /<code\b[^>]*class\s*=\s*(?:"[^"]*"|'[^']*')/i.test(input);
    }
  }
  return /<pre\b[^>]*class\s*=\s*(?:"[^"]*brush:[^"]*"|'[^']*brush:[^']*')/i.test(input);
}

/**
 * 解析 SyntaxHighlighter 高亮 HTML。
 *
 * 支持两种形态：渲染后的 `div.line` 结构（codeinword.com 的导出），
 * 以及源码形态的 `<pre class="brush: python">…</pre>`（此时返回未分词的源码，
 * 由调用方走常规分词流程）。外层包裹 div（container 等）与行号类名都会被剥掉，
 * 行号从 `numberN` 类名还原为起始行号。
 * @param {unknown} input 高亮 HTML 片段。
 * @returns {{form:'tokens', lines:Array<Array<{k:string,v:string}>>, language?:string, startLine:number}
 *          |{form:'source', source:string, language:string}
 *          |null} 无法识别时返回 null。
 */
export function parseShHtml(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (!text) return null;

  const lines = [];
  let language;
  let startLine;
  let sawCode = false;
  const openRe = /<div\b([^>]*)>/gi;
  let open;
  while ((open = openRe.exec(text))) {
    const classes = classListOf(open[1]);
    if (!classes.includes('line')) continue;
    const closeIndex = text.indexOf('</div>', openRe.lastIndex);
    const content = closeIndex === -1 ? text.slice(openRe.lastIndex) : text.slice(openRe.lastIndex, closeIndex);
    if (closeIndex !== -1) openRe.lastIndex = closeIndex + '</div>'.length;

    const brush = classes.find((name) => !isStructural(name) && !KIND_MAP[name]);
    if (!language && brush) language = brush.toLowerCase();
    const numbered = classes.find((name) => /^number\d+$/.test(name));
    if (startLine === undefined && numbered) startLine = Number(numbered.slice(6));

    const tokens = [];
    let codeCount = 0;
    let cursor = 0;
    const codeRe = /<code\b([^>]*)>([\s\S]*?)<\/code>/gi;
    // codeinword 等导出器会把部分空格放在 code 元素之间（如 `def</code> <code>`）；
    // 行内空白在 HTML 渲染时折叠为一个空格，这里同样折叠回正文。含换行/标签的
    // 间隙视为排版产物，忽略。
    const pushGap = (gap) => {
      const decoded = decodeEntities(gap);
      if (/^[^\S\n]+$/u.test(decoded)) {
        tokens.push({ k: 'plain', v: ' ' });
      } else if (decoded.trim() && !/[<>]/.test(decoded)) {
        tokens.push({ k: 'plain', v: decoded });
      }
    };
    let code;
    while ((code = codeRe.exec(content))) {
      sawCode = true;
      codeCount++;
      pushGap(content.slice(cursor, code.index));
      const codeClasses = classListOf(code[1]);
      const kind = codeClasses.find((name) => KIND_MAP[name]) || 'plain';
      // brush 语言名（如 `python`）挂在 code 元素类名上，不在行 div 上。
      const brush = codeClasses.find((name) => !KIND_MAP[name] && !isStructural(name));
      if (!language && brush) language = brush.toLowerCase();
      const value = decodeEntities(code[2]);
      if (value) tokens.push({ k: KIND_MAP[kind], v: value });
      cursor = codeRe.lastIndex;
    }
    if (codeCount) {
      pushGap(content.slice(cursor));
    } else {
      // 没有内联 code 元素的行：空行（内容只有 &nbsp;）或罕见的纯文本行。
      const residue = decodeEntities(content).trim();
      if (residue && !/<[a-z!]/i.test(residue)) tokens.push({ k: 'plain', v: residue });
    }
    lines.push(tokens);
  }

  if (lines.length && sawCode) {
    return { form: 'tokens', lines, language, startLine: startLine || 1 };
  }

  const pre = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/i.exec(text);
  if (pre) {
    // 类名形如 "brush: python"，冒号后有空格，不能按空白拆分类名。
    const brush = /brush:\s*([\w#+.-]+)/i.exec(pre[1] || '');
    if (brush) {
      return {
        form: 'source',
        source: decodeEntities(pre[2]).replace(/\s+$/, ''),
        language: brush[1].toLowerCase(),
      };
    }
  }
  return null;
}
