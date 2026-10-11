/**
 * 语言自动识别：按特征打分，取分数最高的语言。
 *
 * 只在调用方没有给出 `language` 时使用。分数低于阈值就返回 `undefined`，
 * 让调用方按纯文本处理——宁可不高亮，也不要猜一个错误的语法。
 *
 * @module dsh-code-highlight/detect
 */

import { resolveLanguage } from './languages.js';

/** 判定阈值：低于它认为无法判断。 */
const MIN_SCORE = 3;

/** 采样上限：只看开头这一段，避免为识别扫描整个文件。 */
const SAMPLE_LIMIT = 8000;

/**
 * 打分规则：`[语言 id, 特征, 权重]`。
 * 同一语言可以有多条规则，命中即累加。
 * @type {Array<[string, RegExp, number]>}
 */
export const DETECT_RULES = [
  ['python', /^\s*#!.*\bpython[0-9.]*\b/m, 6],
  ['shell', /^\s*#!\s*\S*\b(?:bash|zsh|sh|ksh)\b/m, 6],
  ['perl', /^\s*#!.*\bperl\b/m, 6],
  ['ruby', /^\s*#!.*\bruby\b/m, 6],
  ['php', /<\?php/, 8],
  ['html', /<!DOCTYPE\s+html/i, 8],
  ['html', /<html[\s>]/i, 6],
  ['xml', /^\s*<\?xml/m, 8],
  ['xml', /<[A-Za-z][\w:-]*(\s[^<>]*)?\/>/m, 2],
  ['diff', /^diff --git /m, 8],
  ['diff', /^@@ -\d+/m, 6],
  ['dockerfile', /^\s*FROM\s+\S+/m, 6],
  ['dockerfile', /^\s*(?:RUN|CMD|ENTRYPOINT|WORKDIR|COPY|ADD)\s+\S+/m, 2],
  ['go', /^\s*package\s+\w+\s*$/m, 5],
  ['go', /^\s*func\s+.*\{/m, 4],
  ['go', /:=/, 2],
  ['rust', /\bfn\s+\w+\s*\(/, 4],
  ['rust', /\b(?:let\s+mut|impl\s|pub\s+fn|println!|use\s+std::)/, 5],
  ['python', /^\s*(?:def|class)\s+\w+.*:\s*$/m, 4],
  ['python', /^\s*(?:from\s+[\w.]+\s+)?import\s+[\w.,\s*]+$/m, 3],
  ['python', /^\s*if\s+__name__\s*==/, 8],
  ['java', /public\s+static\s+void\s+main/, 8],
  ['java', /^\s*import\s+java\./m, 6],
  ['java', /^\s*package\s+[\w.]+;/m, 5],
  ['java', /\bSystem\.out\.print/, 6],
  ['csharp', /^\s*using\s+System(?:\.\w+)*;/m, 6],
  ['csharp', /\bConsole\.WriteLine\b/, 6],
  ['csharp', /^\s*namespace\s+[\w.]+/m, 3],
  ['cpp', /^\s*#include\s*<(?:iostream|vector|string|memory|algorithm|map|unordered_map)>/m, 6],
  ['cpp', /\bstd::/, 5],
  ['cpp', /\b(?:cout|cin|endl|template\s*<)/, 4],
  ['c', /^\s*#include\s*</m, 5],
  ['c', /\bprintf\s*\(/, 3],
  ['typescript', /\b(?:interface|type)\s+\w+\s*(?:=|\{)/, 4],
  ['typescript', /:\s*(?:string|number|boolean|void|any|unknown)\b\s*[)=,;]/m, 4],
  ['typescript', /^\s*(?:import|export)\s+.*\bfrom\s+['"]/m, 2],
  ['javascript', /\b(?:const|let)\s+\w+\s*=/, 2],
  ['javascript', /=>\s*[{(]/, 2],
  ['javascript', /\bfunction\s*\w*\s*\(/, 2],
  ['javascript', /\brequire\s*\(\s*['"]/, 3],
  ['javascript', /\bconsole\.log\s*\(/, 3],
  ['sql', /\bSELECT\b[\s\S]*\bFROM\b/i, 5],
  ['sql', /^\s*(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX|VIEW))\b/im, 6],
  ['json', /^\s*[{[]\s*"/m, 4],
  ['yaml', /^---\s*$/m, 4],
  ['yaml', /^\s*[\w.-]+:\s*(?:\S.*)?$/m, 2],
  ['toml', /^\s*\[\[?[\w.]+\]\]?\s*$/m, 2],
  ['ini', /^\s*\[[^\]]+\]\s*$/m, 2],
  ['latex', /\\documentclass/, 8],
  ['latex', /\\begin\{/, 4],
  ['css', /@media\b/, 4],
  ['css', /^\s*[.#]?[\w-]+[^{}\n]*\{[^}]*:[^}]*\}/m, 3],
  ['markdown', /^\s*```/m, 5],
  ['markdown', /^\s*#{1,6}\s+\S/m, 3],
  ['markdown', /\[[^\]]+\]\([^)]+\)/, 2],
  ['powershell', /\b(?:Get|Set|New|Write|Select|Where|ForEach)-\w+/, 5],
  ['ruby', /\bputs\s+/, 3],
  ['ruby', /^\s*(?:def|class|module)\s+\w+/m, 2],
  ['kotlin', /\bfun\s+\w+\s*\(/, 3],
  ['kotlin', /\bval\s+\w+\s*=/, 2],
  ['swift', /\bfunc\s+\w+\s*\(/, 3],
  ['swift', /\bguard\s+let\b/, 3],
  ['scala', /\bdef\s+\w+.*[:=]/, 2],
  ['r', /<-\s*/, 3],
  ['matlab', /^\s*function\s+.*=.*\(/m, 3],
  ['lua', /\blocal\s+\w+/, 3],
  ['haskell', /^\s*(?:module|import)\s+[\w.]+/m, 3],
  ['haskell', /::\s*\[?\w+\]?\s*->/, 4],
  ['elixir', /^\s*defmodule\s+/m, 6],
  ['erlang', /^\s*-module\(/m, 6],
  ['clojure', /^\s*\(ns\s+/m, 6],
  ['protobuf', /^\s*(?:syntax|message|service)\s+=?\s*\w*/m, 4],
  ['graphql', /\b(?:query|mutation|type)\s+\w+\s*\{/, 3],
  ['terraform', /^\s*(?:resource|variable|provider)\s+"/m, 5],
  ['solidity', /\bpragma\s+solidity\b/, 6],
  ['verilog', /\b(?:module|endmodule|always\s*@)\b/, 4],
  ['assembly', /^\s*(?:mov|push|pop|call|jmp|lea)\s+/m, 4],
  ['fortran', /^\s*(?:program|subroutine)\b/im, 4],
  ['pascal', /\b(?:procedure|begin\b[\s\S]*\bend\.)/i, 2],
  ['vb', /\b(?:Dim|Sub|End\s+Sub|Module)\b/, 3],
  ['http', /^(?:GET|POST|PUT|DELETE|PATCH|HEAD)\s+\S+\s+HTTP\//m, 6],
  ['csv', /^[^,\n]+,[^,\n]+,[^,\n]+$/m, 2],
];

/**
 * 从代码内容猜测语言。
 * @param {string} code 源码。
 * @returns {object|undefined} 语言定义；置信度不足时返回 `undefined`。
 */
export function detectLanguage(code) {
  const sample = String(code === undefined || code === null ? '' : code).slice(0, SAMPLE_LIMIT);
  const scores = new Map();
  for (const [id, pattern, weight] of DETECT_RULES) {
    if (!pattern.test(sample)) continue;
    scores.set(id, (scores.get(id) || 0) + weight);
  }
  let bestId;
  let bestScore = 0;
  for (const [id, score] of scores) {
    if (score > bestScore) {
      bestId = id;
      bestScore = score;
    }
  }
  return bestId !== undefined && bestScore >= MIN_SCORE ? resolveLanguage(bestId) : undefined;
}
