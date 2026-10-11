/**
 * 通用代码分词器。
 *
 * 输入源码与一份语言定义（见 `languages.js`），输出「每行一组 token」的结构，
 * 供各渲染器（HTML / SVG / LaTeX / ANSI / Univer）复用。
 *
 * token 形状：`{ k: kind, v: value }`，kind 取值见 `KINDS`。
 * 渲染器只需认识 kind，不需要理解任何语言。
 */

/** 分词器可以产出的 token 类型。 */
export const KINDS = [
  'plain', 'keyword', 'string', 'comment', 'number', 'function', 'type',
  'builtin', 'constant', 'operator', 'punctuation', 'variable', 'property',
  'tag', 'attr', 'meta', 'annotation', 'inserted', 'deleted', 'heading',
  'link', 'emphasis', 'code'
];

const IDENT_START_RE = /[\p{L}\p{Nl}_$]/u;
const IDENT_PART_RE = /[\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}$]/u;
const SPACE_RE = /\s/;
const NUMBER_RE = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.[\d_]+)(?:[eE][+-]?\d+)?)(?:[uUlLfFnN]+)?/;
const OPERATOR_CHARS = '+-*/%=<>!&|^~?:@';
const PUNCT_CHARS = '(){}[],;.\\';

/** 追加一个 token，并合并相邻的同类 token。 */
function push(tokens, k, v) {
  if (!v) return;
  const last = tokens[tokens.length - 1];
  if (last && last.k === k) last.v += v;
  else tokens.push({ k, v });
}

/** 返回 `from` 起的第一个非空白字符。 */
function nextNonSpace(text, from) {
  let i = from;
  while (i < text.length && SPACE_RE.test(text[i])) i++;
  return text[i] || '';
}

/** 判断字符是否为该语言的标识符起始字符。 */
function isIdentStart(ch) {
  return !!ch && IDENT_START_RE.test(ch);
}

/** 判断字符是否为标识符后续字符。 */
function isIdentPart(ch) {
  return !!ch && IDENT_PART_RE.test(ch);
}

/** 判断字符是否为十进制数字。 */
function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

/** 按语言定义做大小写归一后的查找。 */
function has(set, word, ci) {
  if (!set) return false;
  return set.has(ci ? word.toLowerCase() : word);
}

/** 把制表符展开成空格，保持等宽对齐。 */
function expandTabs(line, tabSize) {
  if (line.indexOf('\t') < 0) return line;
  let out = '';
  let column = 0;
  for (const ch of line) {
    if (ch === '\t') {
      const width = tabSize - (column % tabSize);
      out += ' '.repeat(width);
      column += width;
    } else {
      out += ch;
      column += 1;
    }
  }
  return out;
}

/** 匹配行注释前缀。 */
function matchLineComment(text, i, def) {
  for (const prefix of def.line) {
    const candidate = text.slice(i, i + prefix.length);
    const matched = def.ci ? candidate.toLowerCase() === prefix.toLowerCase() : candidate === prefix;
    if (!matched) continue;
    if (/^[A-Za-z]+$/.test(prefix)) {
      const before = i > 0 ? text[i - 1] : '';
      const after = text[i + prefix.length] || '';
      if ((before && isIdentPart(before)) || (after && isIdentPart(after))) continue;
    }
    return prefix;
  }
  return null;
}

/** 匹配块注释起始。 */
function matchBlockComment(text, i, def) {
  for (const pair of def.block) {
    if (text.startsWith(pair[0], i)) return pair;
  }
  return null;
}

/** 匹配字符串起始。 */
function matchString(text, i, def) {
  for (const s of def.strSorted) {
    if (!text.startsWith(s.o, i)) continue;
    if (/^[A-Za-z_@#]/.test(s.o)) {
      const before = i > 0 ? text[i - 1] : '';
      if (before && isIdentPart(before)) continue;
    }
    return s;
  }
  return null;
}

/** 从 `start` 扫描到字符串结束，返回结束偏移与是否闭合。 */
function scanStringBody(text, start, s) {
  let i = start + s.o.length;
  while (i < text.length) {
    const ch = text[i];
    if (s.esc && ch === s.esc) {
      i += 2;
      continue;
    }
    if (text.startsWith(s.c, i)) return { end: i + s.c.length, closed: true };
    i++;
  }
  return { end: text.length, closed: false };
}

/** 扫描一段 `code` 模式的行。 */
function scanCodeLine(text, def) {
  const tokens = [];
  const ci = def.ci;
  let i = 0;
  let prev = null;
  while (i < text.length) {
    const ch = text[i];

    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }

    if (def.pre && text[i] === def.pre && tokens.every((t) => t.k === 'plain')) {
      push(tokens, 'meta', text.slice(i));
      break;
    }

    const lineComment = matchLineComment(text, i, def);
    if (lineComment) {
      push(tokens, 'comment', text.slice(i));
      break;
    }

    const blockComment = matchBlockComment(text, i, def);
    if (blockComment) {
      const close = text.indexOf(blockComment[1], i + blockComment[0].length);
      if (close < 0) {
        push(tokens, 'comment', text.slice(i));
        return { tokens, state: { kind: 'comment', close: blockComment[1] } };
      }
      const end = close + blockComment[1].length;
      push(tokens, 'comment', text.slice(i, end));
      i = end;
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(text[i + 1]))) {
      const m = NUMBER_RE.exec(text.slice(i));
      if (m && m[0]) {
        push(tokens, 'number', m[0]);
        i += m[0].length;
        continue;
      }
    }

    const str = matchString(text, i, def);
    if (str) {
      const body = scanStringBody(text, i, str);
      push(tokens, 'string', text.slice(i, body.end));
      i = body.end;
      if (!body.closed && str.multi) return { tokens, state: { kind: 'string', str } };
      continue;
    }

    if (def.vars.length && def.vars.indexOf(ch) >= 0) {
      let j = i + 1;
      if (text[j] === '{' || text[j] === '(') {
        const closeChar = text[j] === '{' ? '}' : ')';
        let depth = 0;
        while (j < text.length) {
          if (text[j] === text[i + 1]) depth++;
          else if (text[j] === closeChar) {
            depth--;
            if (depth === 0) { j++; break; }
          }
          j++;
        }
      } else {
        while (j < text.length && (isIdentPart(text[j]) || text[j] === ch || text[j] === '*' || text[j] === '?' || text[j] === '#' || text[j] === '!')) j++;
      }
      if (j > i + 1) {
        push(tokens, 'variable', text.slice(i, j));
        prev = { k: 'variable', v: text.slice(i, j) };
        i = j;
        continue;
      }
    }

    if (def.decorator && text.startsWith(def.decorator, i)) {
      const before = i > 0 ? text[i - 1] : '';
      const after = text[i + def.decorator.length];
      if (!(before && isIdentPart(before)) && after && isIdentStart(after)) {
        let j = i + def.decorator.length;
        while (j < text.length && (isIdentPart(text[j]) || text[j] === '.')) j++;
        push(tokens, 'annotation', text.slice(i, j));
        i = j;
        continue;
      }
    }

    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < text.length && isIdentPart(text[j])) j++;
      const word = text.slice(i, j);
      const after = nextNonSpace(text, j);
      let kind;
      if (def.fnKeys && after === '(' && !has(def.kw, word, ci) && !has(def.consts, word, ci)) {
        kind = 'function';
      } else if (prev && prev.k === 'punctuation' && prev.v === '.') {
        kind = 'property';
      } else if (has(def.kw, word, ci)) {
        kind = 'keyword';
      } else if (has(def.consts, word, ci)) {
        kind = 'constant';
      } else if (has(def.types, word, ci)) {
        kind = 'type';
      } else if (has(def.builtins, word, ci)) {
        kind = 'builtin';
      } else if (after === ':' && prev && prev.k === 'punctuation' && (prev.v === '{' || prev.v === ',')) {
        kind = 'property';
      } else if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) {
        kind = 'type';
      } else {
        kind = 'plain';
      }
      push(tokens, kind, word);
      prev = { k: kind, v: word };
      i = j;
      continue;
    }

    if (OPERATOR_CHARS.indexOf(ch) >= 0) {
      let j = i;
      while (j < text.length && OPERATOR_CHARS.indexOf(text[j]) >= 0) j++;
      push(tokens, 'operator', text.slice(i, j));
      i = j;
      continue;
    }

    if (PUNCT_CHARS.indexOf(ch) >= 0) {
      push(tokens, 'punctuation', ch);
      prev = { k: 'punctuation', v: ch };
      i++;
      continue;
    }

    push(tokens, 'plain', ch);
    i++;
  }
  return { tokens, state: null };
}

/** 扫描一段标签语言（HTML / XML）的行。 */
function scanMarkupLine(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      if (close < 0) {
        push(tokens, 'comment', text.slice(i));
        return { tokens, state: { kind: 'comment', close: '-->' } };
      }
      push(tokens, 'comment', text.slice(i, close + 3));
      i = close + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      const close = text.indexOf(']]>', i + 9);
      if (close < 0) {
        push(tokens, 'meta', text.slice(i));
        return { tokens, state: { kind: 'comment', close: ']]>' } };
      }
      push(tokens, 'meta', text.slice(i, close + 3));
      i = close + 3;
      continue;
    }
    if (text.startsWith('<!', i) || text.startsWith('<?', i)) {
      const close = text.startsWith('<!', i) ? '>' : '?>';
      const at = text.indexOf(close, i + 2);
      if (at < 0) {
        push(tokens, 'meta', text.slice(i));
        return { tokens, state: { kind: 'comment', close } };
      }
      push(tokens, 'meta', text.slice(i, at + close.length));
      i = at + close.length;
      continue;
    }
    if (text[i] === '<') {
      let j = i + 1;
      let closing = false;
      if (text[j] === '/') { closing = true; j++; }
      let n = j;
      while (n < text.length && /[A-Za-z0-9:_-]/.test(text[n])) n++;
      if (n === j) {
        push(tokens, 'plain', '<');
        i++;
        continue;
      }
      push(tokens, 'punctuation', closing ? '</' : '<');
      push(tokens, 'tag', text.slice(j, n));
      j = n;
      while (j < text.length && text[j] !== '>' && !(text[j] === '/' && text[j + 1] === '>')) {
        if (SPACE_RE.test(text[j])) {
          let k = j;
          while (k < text.length && SPACE_RE.test(text[k])) k++;
          push(tokens, 'plain', text.slice(j, k));
          j = k;
          continue;
        }
        if (text[j] === '"' || text[j] === "'") {
          const quote = text[j];
          let k = j + 1;
          while (k < text.length && text[k] !== quote) k++;
          k = Math.min(k + 1, text.length);
          push(tokens, 'string', text.slice(j, k));
          j = k;
          continue;
        }
        if (text[j] === '=') {
          push(tokens, 'operator', '=');
          j++;
          continue;
        }
        if (/[A-Za-z_:@#[]()\-.]/.test(text[j])) {
          let k = j;
          while (k < text.length && !/[\s=>/]/.test(text[k])) k++;
          push(tokens, 'attr', text.slice(j, k));
          j = k;
          continue;
        }
        push(tokens, 'plain', text[j]);
        j++;
      }
      if (text.startsWith('/>', j)) {
        push(tokens, 'punctuation', '/>');
        j += 2;
      } else if (text[j] === '>') {
        push(tokens, 'punctuation', '>');
        j++;
      }
      i = j;
      continue;
    }
    if (text[i] === '&') {
      const entity = /^&[A-Za-z0-9#]+;/.exec(text.slice(i));
      if (entity) {
        push(tokens, 'constant', entity[0]);
        i += entity[0].length;
        continue;
      }
    }
    let j = i;
    while (j < text.length && text[j] !== '<' && text[j] !== '&') j++;
    push(tokens, 'plain', text.slice(i, j));
    i = j;
  }
  return { tokens, state: null };
}

/** 扫描一段 CSS 的行。 */
function scanCssLine(text, inBlock) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }
    if (text.startsWith('/*', i)) {
      const close = text.indexOf('*/', i + 2);
      if (close < 0) {
        push(tokens, 'comment', text.slice(i));
        return { tokens, state: { kind: 'comment', close: '*/' }, inBlock };
      }
      push(tokens, 'comment', text.slice(i, close + 2));
      i = close + 2;
      continue;
    }
    if (ch === '{') { push(tokens, 'punctuation', '{'); i++; inBlock = true; continue; }
    if (ch === '}') { push(tokens, 'punctuation', '}'); i++; inBlock = false; continue; }
    if (ch === ';') { push(tokens, 'punctuation', ';'); i++; continue; }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        if (text[j] === '\\') j++;
        j++;
      }
      j = Math.min(j + 1, text.length);
      push(tokens, 'string', text.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '#') {
      const hex = /^#[0-9a-fA-F]{3,8}\b/.exec(text.slice(i));
      if (hex) { push(tokens, 'number', hex[0]); i += hex[0].length; continue; }
    }
    if (ch === '@') {
      let j = i + 1;
      while (j < text.length && (isIdentPart(text[j]) || text[j] === '-')) j++;
      push(tokens, 'keyword', text.slice(i, j));
      i = j;
      continue;
    }
    if (isDigit(ch)) {
      const m = /^\d*\.?\d+(?:[a-zA-Z%]+)?/.exec(text.slice(i));
      push(tokens, 'number', m[0]);
      i += m[0].length;
      continue;
    }
    if (ch === '.' || ch === ':' || ch === '[' || ch === ']' || ch === '(' || ch === ')' || ch === ',' || ch === '>' || ch === '+' || ch === '~') {
      push(tokens, 'punctuation', ch);
      i++;
      continue;
    }
    if (isIdentStart(ch) || ch === '-') {
      let j = i + 1;
      while (j < text.length && (isIdentPart(text[j]) || text[j] === '-')) j++;
      const word = text.slice(i, j);
      if (!inBlock) {
        push(tokens, 'tag', word);
      } else if (nextNonSpace(text, j) === ':') {
        push(tokens, 'attr', word);
      } else if (/^(important|inherit|initial|unset|auto|none|block|flex|grid|inline|absolute|relative|fixed|sticky|solid|dashed|dotted|bold|italic|normal|center|left|right|top|bottom|middle|hidden|visible)$/.test(word)) {
        push(tokens, 'keyword', word);
      } else {
        push(tokens, 'builtin', word);
      }
      i = j;
      continue;
    }
    push(tokens, 'plain', ch);
    i++;
  }
  return { tokens, state: null, inBlock };
}

/** 扫描一段 JSON 的行。 */
function scanJsonLine(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }
    if (text.startsWith('//', i)) { push(tokens, 'comment', text.slice(i)); break; }
    if (text.startsWith('/*', i)) {
      const close = text.indexOf('*/', i + 2);
      if (close < 0) {
        push(tokens, 'comment', text.slice(i));
        return { tokens, state: { kind: 'comment', close: '*/' } };
      }
      push(tokens, 'comment', text.slice(i, close + 2));
      i = close + 2;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') j++;
        j++;
      }
      j = Math.min(j + 1, text.length);
      const raw = text.slice(i, j);
      push(tokens, nextNonSpace(text, j) === ':' ? 'property' : 'string', raw);
      i = j;
      continue;
    }
    if (isDigit(ch) || (ch === '-' && isDigit(text[i + 1]))) {
      const m = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
      push(tokens, 'number', m[0]);
      i += m[0].length;
      continue;
    }
    if (isIdentStart(ch)) {
      let j = i;
      while (j < text.length && isIdentPart(text[j])) j++;
      const word = text.slice(i, j);
      push(tokens, /^(true|false)$/.test(word) ? 'constant' : word === 'null' ? 'constant' : 'plain', word);
      i = j;
      continue;
    }
    if ('{}[],:'.indexOf(ch) >= 0) { push(tokens, 'punctuation', ch); i++; continue; }
    push(tokens, 'plain', ch);
    i++;
  }
  return { tokens, state: null };
}

/** 扫描一段 YAML 的行。 */
function scanYamlLine(text) {
  const tokens = [];
  if (/^\s*(---|\.\.\.)\s*$/.test(text)) {
    push(tokens, 'meta', text);
    return { tokens, state: null };
  }
  let i = 0;
  let sawKey = false;
  const leading = /^\s*/.exec(text)[0];
  if (leading) { push(tokens, 'plain', leading); i = leading.length; }
  while (i < text.length) {
    const ch = text[i];
    if (ch === '#') { push(tokens, 'comment', text.slice(i)); break; }
    if (ch === '-' && (i === leading.length || SPACE_RE.test(text[i - 1]))) {
      const dashes = /^-+/.exec(text.slice(i))[0];
      push(tokens, 'punctuation', dashes);
      i += dashes.length;
      continue;
    }
    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        if (text[j] === '\\') j++;
        j++;
      }
      j = Math.min(j + 1, text.length);
      push(tokens, 'string', text.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === ',' || ch === '|' || ch === '>' || ch === '*' || ch === '&' || ch === '!' || ch === '?') {
      if ((ch === '|' || ch === '>') && (nextNonSpace(text, i + 1) === '' || /[-+]?\d/.test(nextNonSpace(text, i + 1)))) {
        push(tokens, 'keyword', text.slice(i).match(/^[|>][-+]?\d*/)[0]);
        i += text.slice(i).match(/^[|>][-+]?\d*/)[0].length;
        continue;
      }
      push(tokens, 'punctuation', ch);
      i++;
      continue;
    }
    if (ch === ':') {
      push(tokens, 'punctuation', ':');
      i++;
      sawKey = true;
      continue;
    }
    if (isDigit(ch)) {
      const m = /^-?\d+(?:\.\d+)?/.exec(text.slice(i));
      push(tokens, 'number', m[0]);
      i += m[0].length;
      continue;
    }
    let j = i;
    while (j < text.length && !/[\s:#,[\]{}]/.test(text[j])) j++;
    const word = text.slice(i, j);
    if (!sawKey && j < text.length && text[j] === ':') push(tokens, 'property', word);
    else if (/^(true|false|null|yes|no|on|off|~)$/i.test(word)) push(tokens, 'constant', word);
    else if (/^\d/.test(word)) push(tokens, 'number', word);
    else push(tokens, 'plain', word);
    i = j || i + 1;
  }
  return { tokens, state: null };
}

/** 扫描一段 INI / properties / nginx 配置的行。 */
function scanIniLine(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '#' || ch === ';') { push(tokens, 'comment', text.slice(i)); break; }
    if (ch === '[') {
      const close = text.indexOf(']', i);
      const end = close < 0 ? text.length : close + 1;
      push(tokens, 'tag', text.slice(i, end));
      i = end;
      continue;
    }
    const at = text.slice(i).search(/[=:]/);
    if (at > 0) {
      const rawKey = text.slice(i, i + at);
      const key = rawKey.trimEnd();
      push(tokens, 'attr', key);
      push(tokens, 'plain', rawKey.slice(key.length));
      push(tokens, 'operator', text[i + at]);
      let cursor = i + at + 1;
      const gap = /^\s*/.exec(text.slice(cursor))[0];
      push(tokens, 'plain', gap);
      cursor += gap.length;
      const rest = text.slice(cursor);
      if (rest) {
        if (/^(true|false|yes|no|on|off)$/i.test(rest.trim())) push(tokens, 'constant', rest);
        else if (/^-?\d+(\.\d+)?$/.test(rest.trim())) push(tokens, 'number', rest);
        else push(tokens, 'string', rest);
      }
      break;
    }
    push(tokens, 'attr', text.slice(i));
    break;
  }
  return { tokens, state: null };
}

/** 扫描一段 diff / patch 的行。 */
function scanDiffLine(text) {
  const tokens = [];
  if (/^(diff|index|new file|deleted file|similarity|rename)\b/.test(text)) {
    push(tokens, 'keyword', text);
  } else if (text.startsWith('+++') || text.startsWith('---')) {
    push(tokens, 'meta', text);
  } else if (text.startsWith('@@')) {
    push(tokens, 'annotation', text);
  } else if (text.startsWith('+')) {
    push(tokens, 'inserted', text);
  } else if (text.startsWith('-')) {
    push(tokens, 'deleted', text);
  } else {
    push(tokens, 'plain', text);
  }
  return { tokens, state: null };
}

/** 扫描一段 Makefile / CMake / Dockerfile 的行。 */
function scanMakefileLine(text) {
  const tokens = [];
  if (/^\s*#/.test(text)) { push(tokens, 'comment', text); return { tokens, state: null }; }
  let i = 0;
  const recipe = /^\t/.test(text);
  if (recipe) push(tokens, 'punctuation', '\t');
  const directive = text.replace(/^\t/, '');
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*[:+?]?=/.test(directive)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)(\s*[:+?]?=)(.*)$/.exec(directive);
    push(tokens, 'variable', m[1]);
    push(tokens, 'operator', m[2]);
    push(tokens, 'string', m[3]);
    return { tokens, state: null };
  }
  if (/^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/i.test(directive)) {
    const m = /^([A-Za-z]+)(\s*)(.*)$/.exec(directive);
    push(tokens, 'keyword', m[1].toUpperCase() === m[1] ? m[1] : m[1]);
    push(tokens, 'plain', m[2]);
    push(tokens, 'string', m[3]);
    return { tokens, state: null };
  }
  let rest = directive;
  const targetMatch = /^([A-Za-z0-9_./%$(){}-]+)\s*:(?!=)/.exec(rest);
  if (targetMatch && !recipe) {
    push(tokens, 'function', targetMatch[1]);
    push(tokens, 'punctuation', ':');
    rest = rest.slice(targetMatch[0].length);
  }
  i = 0;
  while (i < rest.length) {
    if (rest[i] === '$' && (rest[i + 1] === '(' || rest[i + 1] === '{')) {
      const closeChar = rest[i + 1] === '(' ? ')' : '}';
      const close = rest.indexOf(closeChar, i + 2);
      const end = close < 0 ? rest.length : close + 1;
      push(tokens, 'variable', rest.slice(i, end));
      i = end;
      continue;
    }
    if (rest[i] === '#') { push(tokens, 'comment', rest.slice(i)); break; }
    let j = i;
    while (j < rest.length && rest[j] !== '$' && rest[j] !== '#') j++;
    if (j === i) j = i + 1;
    push(tokens, recipe ? 'builtin' : 'plain', rest.slice(i, j));
    i = j;
  }
  return { tokens, state: null };
}

/** 扫描一段 LaTeX 的行。 */
function scanLatexLine(text) {
  const tokens = [];
  let i = 0;
  if (/^\s*%/.test(text)) { push(tokens, 'comment', text); return { tokens, state: null }; }
  while (i < text.length) {
    const ch = text[i];
    if (ch === '%') { push(tokens, 'comment', text.slice(i)); break; }
    if (ch === '\\') {
      const m = /^\\([A-Za-z@]+|.)/.exec(text.slice(i));
      const name = m ? m[0] : '\\';
      push(tokens, 'keyword', name);
      i += name.length;
      if (name === '\\begin' || name === '\\end') {
        const env = /^\{([^}]*)\}/.exec(text.slice(i));
        if (env) {
          push(tokens, 'punctuation', '{');
          push(tokens, 'type', env[1]);
          push(tokens, 'punctuation', '}');
          i += env[0].length;
        }
      }
      continue;
    }
    if (ch === '$') {
      const close = text.indexOf('$', i + 1);
      const end = close < 0 ? text.length : close + 1;
      push(tokens, 'string', text.slice(i, end));
      i = end;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === '[' || ch === ']') { push(tokens, 'punctuation', ch); i++; continue; }
    if (SPACE_RE.test(ch)) {
      let j = i;
      while (j < text.length && SPACE_RE.test(text[j])) j++;
      push(tokens, 'plain', text.slice(i, j));
      i = j;
      continue;
    }
    let j = i;
    while (j < text.length && !/[\\$%{}[\]\s]/.test(text[j])) j++;
    push(tokens, 'plain', text.slice(i, j));
    i = j || i + 1;
  }
  return { tokens, state: null };
}

/** 扫描一段 CSV / TSV 的行。 */
function scanCsvLine(text, delimiter, header) {
  const tokens = [];
  let i = 0;
  while (i <= text.length) {
    const ch = text[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '"' && text[j + 1] === '"') j++;
        j++;
      }
      j = Math.min(j + 1, text.length);
      push(tokens, header ? 'attr' : 'string', text.slice(i, j));
      i = j;
      continue;
    }
    if (ch === undefined || ch === delimiter) {
      if (ch === delimiter) push(tokens, 'punctuation', ch);
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && text[j] !== delimiter && text[j] !== '"') j++;
    const value = text.slice(i, j);
    const kind = header ? 'attr'
      : /^-?\d+(\.\d+)?$/.test(value.trim()) ? 'number'
        : /^(true|false|null|yes|no)$/i.test(value.trim()) ? 'constant'
          : 'plain';
    push(tokens, kind, value);
    i = j;
  }
  return { tokens, state: null };
}

/** 扫描一段 HTTP 报文的行。 */
function scanHttpLine(text, index) {
  const tokens = [];
  if (index === 0 && /^[A-Z]+\s+\S+\s+HTTP\//.test(text)) {
    const m = /^(\S+)(\s+)(\S+)(\s+)(\S+)(.*)$/.exec(text);
    if (m) {
      push(tokens, 'keyword', m[1]);
      push(tokens, 'plain', m[2]);
      push(tokens, 'string', m[3]);
      push(tokens, 'plain', m[4]);
      push(tokens, 'type', m[5]);
      push(tokens, 'plain', m[6]);
      return { tokens, state: null };
    }
  }
  const header = /^([A-Za-z0-9-]+)(:)(\s*)(.*)$/.exec(text);
  if (header) {
    push(tokens, 'attr', header[1]);
    push(tokens, 'punctuation', ':');
    push(tokens, 'plain', header[3]);
    push(tokens, 'string', header[4]);
    return { tokens, state: null };
  }
  if (text === '') push(tokens, 'plain', '');
  else push(tokens, 'plain', text);
  return { tokens, state: null };
}

/** 扫描一行 Markdown 的块级标记（不含围栏嵌套）。 */
function scanMarkdownLine(text) {
  const tokens = [];
  const heading = /^(#{1,6})(\s*)(.*)$/.exec(text);
  if (heading) {
    push(tokens, 'keyword', heading[1]);
    push(tokens, 'plain', heading[2]);
    scanInlineMarkdown(heading[3], tokens, 'heading');
    return { tokens, state: null };
  }
  const quote = /^(\s*>+\s?)(.*)$/.exec(text);
  if (quote) {
    push(tokens, 'punctuation', quote[1]);
    scanInlineMarkdown(quote[2], tokens, 'emphasis');
    return { tokens, state: null };
  }
  const list = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/.exec(text);
  if (list) {
    push(tokens, 'punctuation', list[1]);
    scanInlineMarkdown(list[2], tokens, null);
    return { tokens, state: null };
  }
  if (/^\s*(?:[-*_]\s*){3,}$/.test(text)) {
    push(tokens, 'punctuation', text);
    return { tokens, state: null };
  }
  const table = /^\s*\|/.test(text);
  if (table) {
    if (/^\s*\|[\s:|-]+\|\s*$/.test(text)) { push(tokens, 'punctuation', text); return { tokens, state: null }; }
    const cells = text.split('|');
    for (let c = 0; c < cells.length; c++) {
      if (c) push(tokens, 'punctuation', '|');
      push(tokens, 'attr', cells[c]);
    }
    return { tokens, state: null };
  }
  scanInlineMarkdown(text, tokens, null);
  return { tokens, state: null };
}

/** 扫描 Markdown 行内语法。 */
function scanInlineMarkdown(text, tokens, base) {
  let i = 0;
  let buffer = '';
  const flush = () => { if (buffer) { push(tokens, base || 'plain', buffer); buffer = ''; } };
  while (i < text.length) {
    const ch = text[i];
    if (ch === '`') {
      const ticks = /^`+/.exec(text.slice(i))[0];
      const close = text.indexOf(ticks, i + ticks.length);
      if (close >= 0) {
        flush();
        push(tokens, 'code', text.slice(i, close + ticks.length));
        i = close + ticks.length;
        continue;
      }
    }
    if (ch === '*' || ch === '_') {
      const marks = /^[*_]{1,3}/.exec(text.slice(i))[0];
      const close = text.indexOf(marks, i + marks.length);
      if (close >= 0) {
        flush();
        push(tokens, 'punctuation', marks);
        push(tokens, 'emphasis', text.slice(i + marks.length, close));
        push(tokens, 'punctuation', marks);
        i = close + marks.length;
        continue;
      }
    }
    if (ch === '[') {
      const m = /^\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(i));
      if (m) {
        flush();
        push(tokens, 'punctuation', '[');
        push(tokens, 'link', m[1]);
        push(tokens, 'punctuation', '](');
        push(tokens, 'string', m[2]);
        push(tokens, 'punctuation', ')');
        i += m[0].length;
        continue;
      }
    }
    if (ch === '!' || ch === '<' || ch === '&' || ch === '\\') {
      const m = /^(!?\[[^\]]*\]\([^)]*\)|<[^>]+>|&[A-Za-z0-9#]+;|\\.)/.exec(text.slice(i));
      if (m) {
        flush();
        push(tokens, 'constant', m[0]);
        i += m[0].length;
        continue;
      }
    }
    buffer += ch;
    i++;
  }
  flush();
}

/** 扫描 Markdown 文档：围栏代码块交给对应语言的分词器。 */
function tokenizeMarkdownDocument(lines, tabSize) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const fence = /^\s*(`{3,}|~{3,})\s*(\S*)\s*$/.exec(lines[i]);
    if (fence) {
      const marker = fence[1][0];
      const length = fence[1].length;
      const head = [{ k: 'punctuation', v: fence[1] }];
      if (fence[2]) head.push({ k: 'type', v: fence[2] });
      out.push(head);
      i++;
      const body = [];
      const closeRe = new RegExp('^\\s*' + marker + '{' + length + ',}\\s*$');
      while (i < lines.length && !closeRe.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      const inner = fence[2] ? innerLanguage(fence[2]) : undefined;
      if (inner) {
        const nested = tokenizeLines(body.join('\n'), inner, { tabSize });
        for (const lineTokens of nested) out.push(lineTokens);
      } else {
        for (const line of body) out.push(line ? [{ k: 'plain', v: line }] : [{ k: 'plain', v: '' }]);
      }
      if (i < lines.length) {
        out.push([{ k: 'punctuation', v: lines[i].trim() }]);
        i++;
      }
      continue;
    }
    out.push(scanMarkdownLine(lines[i]).tokens);
    i++;
  }
  return out;
}

// 延迟绑定，避免 `languages.js` 与分词器相互导入。
let innerLanguage = () => undefined;

/**
 * 注入「语言名 → 定义」的解析函数（`markdown` 围栏复用）。
 * @param {Function} resolver 解析函数。
 */
export function setLanguageResolver(resolver) {
  innerLanguage = resolver;
}

/** 选择 CSV 的分隔符。 */
function pickDelimiter(code) {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = code.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

/**
 * 分词入口。
 * @param {string} code 源码文本。
 * @param {object} def 语言定义，来自 `resolveLanguage`。
 * @param {{tabSize?: number}} [options] 分词选项。
 * @returns {{k:string,v:string}[][]} 每行一组 token。
 */
export function tokenizeLines(code, def, options = {}) {
  const tabSize = Number.isInteger(options.tabSize) && options.tabSize > 0 ? Math.min(options.tabSize, 16) : 4;
  const source = String(code === undefined || code === null ? '' : code).replace(/\r\n?/g, '\n');
  const lines = source.split('\n').map((line) => expandTabs(line, tabSize));
  const language = def || { mode: 'plain', str: [], line: [], block: [], vars: [] };

  if (language.mode === 'markdown') return tokenizeMarkdownDocument(lines, tabSize);
  if (language.mode === 'plain') return lines.map((line) => (line ? [{ k: 'plain', v: line }] : [{ k: 'plain', v: '' }]));

  if (!language.strSorted) {
    language.strSorted = [...(language.str || [])].sort((a, b) => b.o.length - a.o.length);
  }

  const delimiter = language.mode === 'csv' ? pickDelimiter(source) : null;
  const out = [];
  let carry = null;
  let cssInBlock = false;

  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    if (carry) {
      if (carry.kind === 'comment') {
        const close = text.indexOf(carry.close);
        if (close < 0) {
          out.push([{ k: 'comment', v: text }]);
          continue;
        }
        const end = close + carry.close.length;
        const tokens = [{ k: 'comment', v: text.slice(0, end) }];
        carry = null;
        out.push(mergeTail(tokens, scanRemainder(text.slice(end), language, index, delimiter, cssInBlock)));
        continue;
      }
      if (carry.kind === 'string') {
        const s = carry.str;
        let j = 0;
        let closedAt = -1;
        while (j < text.length) {
          if (s.esc && text[j] === s.esc) { j += 2; continue; }
          if (text.startsWith(s.c, j)) { closedAt = j + s.c.length; break; }
          j++;
        }
        if (closedAt < 0) {
          out.push([{ k: 'string', v: text }]);
          continue;
        }
        const tokens = [{ k: 'string', v: text.slice(0, closedAt) }];
        carry = null;
        out.push(mergeTail(tokens, scanRemainder(text.slice(closedAt), language, index, delimiter, cssInBlock)));
        continue;
      }
      if (carry.kind === 'css-block') {
        cssInBlock = true;
        carry = null;
      }
    }

    let result;
    switch (language.mode) {
      case 'markup': result = scanMarkupLine(text); break;
      case 'css': result = scanCssLine(text, cssInBlock); cssInBlock = result.inBlock; break;
      case 'json': result = scanJsonLine(text); break;
      case 'yaml': result = scanYamlLine(text); break;
      case 'ini': result = scanIniLine(text); break;
      case 'diff': result = scanDiffLine(text); break;
      case 'makefile': result = scanMakefileLine(text); break;
      case 'latex': result = scanLatexLine(text); break;
      case 'csv': result = scanCsvLine(text, delimiter, index === 0); break;
      case 'http': result = scanHttpLine(text, index); break;
      default: result = scanCodeLine(text, language); break;
    }
    if (result.state) carry = result.state;
    out.push(result.tokens);
  }
  return out;
}

/** 扫描 carry 结束后的行内剩余部分。 */
function scanRemainder(text, language, index, delimiter, cssInBlock) {
  if (!text) return [];
  let result;
  switch (language.mode) {
    case 'markup': result = scanMarkupLine(text); break;
    case 'css': result = scanCssLine(text, cssInBlock); break;
    case 'json': result = scanJsonLine(text); break;
    case 'yaml': result = scanYamlLine(text); break;
    case 'ini': result = scanIniLine(text); break;
    case 'diff': result = scanDiffLine(text); break;
    case 'makefile': result = scanMakefileLine(text); break;
    case 'latex': result = scanLatexLine(text); break;
    case 'csv': result = scanCsvLine(text, delimiter, index === 0); break;
    case 'http': result = scanHttpLine(text, index); break;
    default: result = scanCodeLine(text, language); break;
  }
  return result.tokens;
}

/** 合并两段 token 列表。 */
function mergeTail(head, tail) {
  for (const token of tail) push(head, token.k, token.v);
  return head;
}

/**
 * 把每行 token 还原成纯文本，用于宽度计算与文本导出。
 * @param {{k:string,v:string}[][]} lines 分词结果。
 * @returns {string[]} 每行文本。
 */
export function linesToText(lines) {
  return lines.map((tokens) => tokens.map((token) => token.v).join(''));
}
