/**
 * dsh-code-highlight —— 报告场景的多语言代码高亮工具。
 *
 * 注册一个 `highlight_code` 工具：接收代码片段，按目标文档格式产出带语法配色的产物。
 * 传 `output_file` 时直接落盘；`png` / `svg-png` 由内置的 Pillow 栅格化器生成，
 * 因此不依赖浏览器或 Office 进程也能拿到可直接插入文档的位图。
 *
 * @module @local/dsh-code-highlight
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { resolveLanguage } from './src/languages.js';
import { detectLanguage } from './src/detect.js';
import { tokenizeLines, setLanguageResolver } from './src/tokenize.js';
import { THEMES, THEME_IDS, resolveTheme, colorFor, decorationsFor } from './src/themes.js';
import {
  renderHtml,
  renderHtmlDocument,
  renderSvg,
  renderLatex,
  renderAnsi,
  renderMarkdown,
  blockGeometry,
} from './src/render.js';

// Markdown 围栏里的嵌套语言沿用同一张语言表。
setLanguageResolver(resolveLanguage);

/** 工具名。 */
const TOOL_NAME = 'highlight_code';

/** 支持的输出格式。 */
const FORMATS = ['html', 'html-file', 'svg', 'svg-png', 'png', 'latex', 'latex-minted', 'markdown', 'ansi', 'text'];

/** 必须写文件的格式。 */
const FILE_FORMATS = ['png', 'svg-png'];

/** 栅格化器脚本。 */
const RASTERIZER = fileURLToPath(new URL('./py/rasterize.py', import.meta.url));

/** Python 解释器候选，可用 `DSH_CODE_HIGHLIGHT_PYTHON` 覆盖。 */
const PYTHON_CANDIDATES = [process.env.DSH_CODE_HIGHLIGHT_PYTHON, 'python', 'py', 'python3'].filter(Boolean);

/** 取主题 id。 */
function themeIdOf(theme) {
  for (const id of THEME_IDS) if (THEMES[id] === theme) return id;
  return 'github-dark';
}

/** 归一化行高亮参数。 */
function normalizeHighlights(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.split(/[,，\s]+/).filter(Boolean);
}

/** 参数说明。 */
const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['code'],
  properties: {
    code: {
      type: 'string',
      description: 'The code to highlight. Fenced block markers and a trailing newline are tolerated.',
    },
    language: {
      type: 'string',
      description: 'Language id, alias, or file extension, such as `python`, `py`, `typescript`, `ts`, `c++`, `bash`, `sql`, `latex`. Omit to detect it from the code; an unrecognized value renders as plain text.',
    },
    format: {
      type: 'string',
      enum: FORMATS,
      description: 'Where the code will land; see the tool description for the destination of each value.',
    },
    theme: {
      type: 'string',
      enum: [...THEME_IDS, 'auto'],
      description: 'Color theme. `auto` picks a dark theme, or a light one when `dark` is false.',
    },
    dark: {
      type: 'boolean',
      description: 'Light/dark preference used only when `theme` is `auto`. Defaults to dark.',
    },
    title: {
      type: 'string',
      description: 'Caption shown above the block (HTML) or in its title bar (SVG). Typically the file name or snippet purpose.',
    },
    line_numbers: {
      type: 'boolean',
      description: 'Show a line-number gutter. Defaults to true.',
    },
    start_line: {
      type: 'integer',
      description: 'Number given to the first line. Defaults to 1; set it when the snippet is an excerpt.',
    },
    highlight_lines: {
      type: 'string',
      description: 'Lines to emphasize, as numbers and ranges, for example `3,7-9`.',
    },
    font_size: {
      type: 'number',
      description: 'Code font size in CSS pixels. Defaults to 13.',
    },
    tab_size: {
      type: 'integer',
      description: 'Spaces per tab when expanding the snippet. Defaults to 4.',
    },
    canvas: {
      type: 'string',
      description: 'Target canvas as `WIDTHxHEIGHT`, for example `960x540` (default slide size) or `1280x720`. When set, `svg` output becomes a full page-sized image with the code block centered and scaled to fit, ready for univer_compile_svg or a document illustration.',
    },
    show_title: {
      type: 'boolean',
      description: 'Show the `title` label inside the block. Defaults to true; set false to drop the file name from the artifact entirely.',
    },
    document_title: {
      type: 'string',
      description: 'Heading for `html-file`. Omitted by default, so a file name never appears as a document heading.',
    },
    line_height: {
      type: 'number',
      description: 'Line height as a multiple of the font size. Defaults to 1.5, which keeps CJK glyphs clear of the line below.',
    },
    font_size_pt: {
      type: 'number',
      description: 'Code font size in points; takes precedence over `font_size` (1 pt = 4/3 px).',
    },
    width_in: {
      type: 'number',
      description: 'Physical width in inches for a figure that fills a document column, for example 6.3. PNG pixels become `width_in x dpi` and the PNG records that DPI; SVG gets a matching `width="...in"` attribute.',
    },
    dpi: {
      type: 'integer',
      description: 'Raster resolution for `png` and `svg-png`. Defaults to 300.',
    },
    output_file: {
      type: 'string',
      description: 'Write the artifact to this path and return the path instead of the full text; relative paths resolve against the session workspace. Required for `png` and `svg-png`, which also writes the sibling `.svg` for `svg-png`.',
    },
    overwrite: {
      type: 'boolean',
      description: 'Allow `output_file` to replace an existing file. Defaults to false, so a name collision fails instead of silently overwriting.',
    },
    mono_font: {
      type: 'string',
      description: 'Font file used for ASCII glyphs when rasterizing, for example `consola.ttf`. Defaults to the first available monospace face.',
    },
    cjk_font: {
      type: 'string',
      description: 'Font file used for CJK and other wide glyphs when rasterizing, for example `simsun.ttc` or `msyh.ttc`. Defaults to the first available CJK face.',
    },
  },
};

/** 工具输出结构。 */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    language: { type: 'string', description: 'Resolved language id.' },
    languageName: { type: 'string', description: 'Human-readable language name.' },
    format: { type: 'string', description: 'Rendered format.' },
    theme: { type: 'string', description: 'Theme id actually used.' },
    lines: { type: 'integer', description: 'Number of rendered lines.' },
    characters: { type: 'integer', description: 'Length of the rendered content in characters.' },
    detected: { type: 'boolean', description: 'True when the language was detected from the code rather than given.' },
    recognized: { type: 'boolean', description: 'False when the language was unknown and the snippet was rendered as plain text.' },
    content: { type: 'string', description: 'The rendered artifact, when it was not written to a file: HTML fragment, HTML document, SVG, LaTeX, Markdown, ANSI text, or the code itself. Empty when everything went to `files`.' },
    files: {
      type: 'array',
      description: 'Artifacts written by this call.',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          path: { type: 'string', description: 'Absolute path written.' },
          kind: { type: 'string', description: 'Artifact kind, such as svg, png, html.' },
          width: { type: 'integer', description: 'Pixel width, for images.' },
          height: { type: 'integer', description: 'Pixel height, for images.' },
          dpi: { type: 'integer', description: 'Raster resolution recorded in the image.' },
          bytes: { type: 'integer', description: 'File size in bytes.' },
        },
      },
    },
    rasterizer: {
      type: 'object',
      additionalProperties: true,
      description: 'Rasterization diagnostics: the fonts used, the effective font size, and whether it was shrunk to fit the requested width.',
    },
  },
};

/** 构造工具定义。 */
function defineHighlightTool() {
  return {
    name: TOOL_NAME,
    description: [
      'Render a code snippet with real syntax colors for a report, and return that artifact as text or write it to a file.',
      'Use it whenever a report, document, slide deck or paper should show code with highlighting instead of plain text.',
      'Choose `format` by destination:',
      '- `html` (default): inline-styled fragment; paste into Markdown, HTML, email, or any rich-text field that accepts HTML.',
      '- `html-file`: a complete standalone HTML document; open it in a browser or print it to PDF.',
      '- `svg`: a vector code image; insert it into Word, PowerPoint or PDF, or compile it onto a Univer slide page with univer_compile_svg.',
      '- `png`: a raster image produced by the bundled Pillow rasterizer, so no browser or Office process is involved; the file records the DPI you asked for.',
      '- `svg-png`: writes both, laid out identically, so a document gets a scalable figure and a bitmap fallback.',
      '- `latex`: a `listings` environment for a .tex report; `latex-minted` emits the `minted` form instead.',
      '- `markdown`: a fenced block, for renderers that highlight on their own.',
      '- `ansi`: colored text for a terminal or log.',
      '- `text`: the snippet unchanged.',
      'Without `output_file` the artifact comes back as text; with it, the file path comes back instead and the text is left out.',
      'Languages are resolved by id, alias or file extension across 60+ grammars, and are detected from the code when `language` is omitted.',
    ].join('\n'),
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render(_args, value) {
        if (value.format === 'text') return [{ type: 'text', text: value.content }];
        const header = `Highlighted ${value.lines} line${value.lines === 1 ? '' : 's'} of ${value.languageName} as ${value.format} (${value.theme} theme).`;
        const notes = [];
        if (!value.recognized) notes.push('The language was not recognized, so the snippet is rendered as plain text.');
        for (const file of value.files || []) {
          const size = file.width ? `, ${file.width}x${file.height} px at ${file.dpi} dpi` : '';
          const bytes = file.bytes ? `, ${file.bytes} bytes` : '';
          notes.push(`Wrote ${file.kind} to ${file.path}${size}${bytes}.`);
        }
        const raster = value.rasterizer;
        if (raster && raster.fontSizePx) {
          notes.push(`Rasterized with ${raster.asciiFont || 'default font'} + ${raster.cjkFont || 'default CJK font'} at ${raster.fontSizePx}px${raster.scaled ? ', shrunk to fit the requested width' : ''}.`);
        }
        const body = value.content ? `\n\n${value.content}` : '';
        return [{ type: 'text', text: `${header}${notes.length ? `\n${notes.join('\n')}` : ''}${body}` }];
      },
    },
    isConcurrencySafe: () => true,
    presentCall(args) {
      const lines = String(args.code || '').split('\n').length;
      return {
        card: 'generic',
        title: `Highlight ${args.language || 'code'} → ${args.format || 'html'}`,
        kind: 'other',
        rawInput: {
          language: args.language,
          format: args.format,
          theme: args.theme,
          lines,
        },
      };
    },
    execute(args, exec) {
      const raw = typeof args.code === 'string' ? args.code : '';
      const code = stripFence(raw);
      if (!code.trim()) throw new Error(`${TOOL_NAME}: \`code\` must contain the snippet to highlight`);

      const requested = typeof args.language === 'string' ? args.language.trim() : '';
      let definition = requested ? resolveLanguage(requested) : undefined;
      let detected = false;
      if (!definition && !requested) {
        definition = detectLanguage(code);
        detected = !!definition;
      }
      const recognized = !!definition;
      const language = definition || resolveLanguage('text');
      const format = FORMATS.includes(args.format) ? args.format : 'html';
      const theme = resolveTheme(args.theme, { dark: args.dark });
      const themeId = themeIdOf(theme);

      const tabSize = Number.isInteger(args.tab_size) && args.tab_size > 0 ? Math.min(args.tab_size, 16) : 4;
      const options = {
        theme,
        language: language.id,
        title: typeof args.title === 'string' && args.title.trim() ? args.title.trim() : undefined,
        showTitle: args.show_title !== false,
        documentTitle: typeof args.document_title === 'string' && args.document_title.trim() ? args.document_title.trim() : undefined,
        lineNumbers: args.line_numbers !== false,
        startLine: Number.isInteger(args.start_line) && args.start_line > 0 ? args.start_line : 1,
        highlightLines: normalizeHighlights(args.highlight_lines),
        fontSize: resolveFontSize(args),
        lineHeight: Number.isFinite(args.line_height) && args.line_height >= 1 ? Math.min(args.line_height, 4) : 1.5,
        tabSize,
        latexBackend: format === 'latex-minted' ? 'minted' : 'listings',
        canvas: typeof args.canvas === 'string' && args.canvas.trim() ? args.canvas.trim() : undefined,
        widthIn: Number.isFinite(args.width_in) && args.width_in > 0 ? Math.min(args.width_in, 40) : undefined,
        monoFont: typeof args.mono_font === 'string' && args.mono_font.trim() ? args.mono_font.trim() : undefined,
        cjkFont: typeof args.cjk_font === 'string' && args.cjk_font.trim() ? args.cjk_font.trim() : undefined,
      };

      const requestedPath = typeof args.output_file === 'string' && args.output_file.trim() ? args.output_file.trim() : '';
      if (FILE_FORMATS.includes(format) && !requestedPath) {
        throw new Error(`${TOOL_NAME}: \`output_file\` is required for format "${format}"`);
      }
      const overwrite = args.overwrite === true;
      const target = requestedPath ? resolveOutput(requestedPath, exec) : undefined;
      const stem = target ? target.replace(/\.(png|svg|html?|tex|txt|md|ansi)$/i, '') : undefined;

      const lines = tokenizeLines(code, language, { tabSize });
      const files = [];
      let content = null;
      let rasterizer = null;

      switch (format) {
        case 'html':
          content = renderHtml(lines, options);
          break;
        case 'html-file':
          content = renderHtmlDocument([{ lines, language: language.id, title: options.title }], options);
          break;
        case 'svg':
          content = renderSvg(lines, options);
          break;
        case 'svg-png':
        case 'png': {
          if (format === 'svg-png') {
            files.push(writeArtifact(`${stem}.svg`, renderSvg(lines, options), overwrite, 'svg'));
          }
          const geometry = blockGeometry(lines, options);
          const widthIn = options.widthIn || 6.3;
          rasterizer = rasterize(lines, options, theme, {
            dpi: Number.isInteger(args.dpi) && args.dpi >= 72 && args.dpi <= 1200 ? args.dpi : 300,
            widthIn,
            scale: Math.min(1, (widthIn * 96) / geometry.width),
            blockWidth: geometry.width,
            blockHeight: geometry.height,
            showTitle: options.showTitle,
            title: options.title,
            startLine: options.startLine,
            lineNumbers: options.lineNumbers,
            path: `${stem}.png`,
            overwrite,
          });
          files.push(rasterizer.file);
          break;
        }
        case 'latex':
        case 'latex-minted':
          content = renderLatex(lines, options);
          break;
        case 'ansi':
          content = renderAnsi(lines, options);
          break;
        case 'markdown':
          content = renderMarkdown(code, recognized ? language.id : '');
          break;
        default:
          content = code;
          break;
      }

      let characters = 0;
      if (content !== null) {
        characters = content.length;
        if (target) {
          files.push(writeArtifact(target, content, overwrite, format));
          content = null;
        }
      }

      const value = {
        language: language.id,
        languageName: language.name,
        format,
        theme: themeId,
        lines: lines.length,
        characters,
        detected,
        recognized,
        content: content === null ? '' : content,
        files,
      };
      if (rasterizer) value.rasterizer = rasterizer.info;
      return value;
    },
  };
}

/**
 * 解析字号：`font_size_pt` 优先，其次 `font_size`（CSS 像素）。
 * @param {object} args 工具参数。
 * @returns {number} CSS 像素字号。
 */
function resolveFontSize(args) {
  if (Number.isFinite(args.font_size_pt) && args.font_size_pt > 0) {
    return Math.min(Math.round(((args.font_size_pt * 4) / 3) * 100) / 100, 64);
  }
  if (Number.isFinite(args.font_size) && args.font_size > 0) return Math.min(args.font_size, 48);
  return 13;
}

/**
 * 解析输出路径：绝对路径原样使用，相对路径基于会话工作区。
 * @param {string} value 调用方给出的路径。
 * @param {object} exec 工具运行上下文。
 * @returns {string} 规范化后的绝对路径。
 */
function resolveOutput(value, exec) {
  if (path.isAbsolute(value)) return path.normalize(value);
  const cwd = exec?.agent?.session?.header?.cwd || exec?.agent?.session?.cwd || exec?.agent?.cwd;
  if (!cwd) {
    throw new Error(`${TOOL_NAME}: cannot resolve "${value}" because the session working directory is unknown; pass an absolute path`);
  }
  return path.resolve(cwd, value);
}

/**
 * 写一个文本产物。
 * @param {string} filePath 目标路径。
 * @param {string} content 内容。
 * @param {boolean} overwrite 是否允许覆盖已有文件。
 * @param {string} kind 产物类型，用于结果描述。
 * @returns {object} 文件描述。
 */
function writeArtifact(filePath, content, overwrite, kind) {
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`${TOOL_NAME}: ${filePath} already exists; pass overwrite: true to replace it`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { path: filePath, kind, bytes: Buffer.byteLength(content, 'utf8') };
}

/**
 * 构造栅格化 spec 并调用 Python 出图。
 * @param {Array} lines 分词结果。
 * @param {object} options 渲染选项。
 * @param {object} theme 主题。
 * @param {object} request 栅格化请求（尺寸与目标路径）。
 * @returns {{info: object, file: object}} 诊断信息与文件描述。
 */
function rasterize(lines, options, theme, request) {
  const spec = {
    widthIn: request.widthIn,
    dpi: request.dpi,
    blockWidth: request.blockWidth,
    blockHeight: request.blockHeight,
    scale: request.scale,
    fontSizePx: options.fontSize,
    lineHeightRatio: options.lineHeight,
    padding: 18,
    startLine: request.startLine,
    lineNumbers: request.lineNumbers,
    showTitle: request.showTitle,
    title: request.title || '',
    background: theme.background,
    border: theme.border,
    titleBar: theme.titleBar,
    lineNumber: theme.lineNumber,
    monoFont: options.monoFont,
    cjkFont: options.cjkFont,
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

  if (fs.existsSync(request.path) && !request.overwrite) {
    throw new Error(`${TOOL_NAME}: ${request.path} already exists; pass overwrite: true to replace it`);
  }
  fs.mkdirSync(path.dirname(request.path), { recursive: true });

  const stamp = `${process.pid}-${Date.now()}`;
  const specPath = path.join(os.tmpdir(), `dsh-code-highlight-${stamp}.json`);
  const infoPath = path.join(os.tmpdir(), `dsh-code-highlight-${stamp}.out.json`);
  fs.writeFileSync(specPath, JSON.stringify(spec), 'utf8');
  try {
    const info = runRasterizer(specPath, request.path, infoPath);
    return {
      info,
      file: {
        path: request.path,
        kind: 'png',
        width: info.width,
        height: info.height,
        dpi: info.dpi,
        bytes: fs.statSync(request.path).size,
      },
    };
  } finally {
    for (const file of [specPath, infoPath]) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* temp files are best-effort cleanup */
      }
    }
  }
}

/**
 * 依次尝试可用的 Python 解释器。
 * @param {string} specPath spec 文件路径。
 * @param {string} outputPath PNG 输出路径。
 * @returns {object} 栅格化器报告的诊断信息。
 */
function runRasterizer(specPath, outputPath, infoPath) {
  const failures = [];
  for (const candidate of PYTHON_CANDIDATES) {
    try {
      fs.rmSync(infoPath, { force: true });
    } catch {
      /* a stale info file is discarded; a fresh one is read below */
    }
    const result = spawnSync(candidate, [RASTERIZER, specPath, outputPath, infoPath], {
      stdio: 'ignore',
      windowsHide: true,
      timeout: 120000,
    });
    if (result.error) {
      failures.push(`${candidate}: ${result.error.code === 'ENOENT' ? 'not found' : result.error.message}`);
      continue;
    }
    const info = readJsonFile(infoPath);
    if (info && info.ok === false) throw new Error(`${TOOL_NAME}: rasterizer error: ${info.error}`);
    if (result.status === 0 && info && info.ok) return info;
    failures.push(`${candidate}: exit ${result.status}`);
  }
  throw new Error(`${TOOL_NAME}: PNG output needs Python with Pillow. Tried ${PYTHON_CANDIDATES.join(', ')}. ${failures.join('; ')}`);
}

/** 读取一个 JSON 文件，失败时返回 null。 */
function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** 去掉包住整段代码的 Markdown 围栏。 */
function stripFence(code) {
  const match = /^(?:\uFEFF)?\s*`{3,}[^\n]*\n([\s\S]*?)\n?\s*`{3,}\s*$/.exec(code);
  return match ? match[1] : code;
}

/**
 * 挂载插件：注册 `highlight_code` 工具。
 * @param {object} ctx 插件上下文。
 */
export function apply(ctx) {
  ctx.effect(() => ctx.tools.register(defineHighlightTool()));
}

/** 硬依赖：工具注册表。 */
export const inject = ['tools'];

/** 插件显示名。 */
export const name = 'code-highlight';
