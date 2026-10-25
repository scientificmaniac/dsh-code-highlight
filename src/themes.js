/**
 * 主题配色表。
 *
 * 每个主题给出一套背景/前景/行号色，以及按 token kind 的取色。
 * 渲染器只通过 `colorFor` / `decorationsFor` 取色，不直接读具体字段，
 * 因此新增主题不需要改渲染器。
 *
 * 可选字段（SyntaxHighlighter 系主题使用，其余渲染器按缺省处理）：
 * - `highlightLine`：`highlight_lines` 强调行的底色（缺省用 `titleBar`）。
 * - `gutterEdge`：行号列右侧竖条颜色。
 * - `gutterHighlight`：强调行行号的 `{background, color}`。
 */

/** 所有主题。键为对外暴露的主题 id。 */
export const THEMES = {
  'github-dark': {
    label: 'GitHub Dark',
    dark: true,
    background: '#0d1117',
    border: '#30363d',
    lineNumber: '#6e7681',
    titleBar: '#161b22',
    colors: {
      plain: '#c9d1d9', keyword: '#ff7b72', string: '#a5d6ff', comment: '#8b949e',
      number: '#79c0ff', function: '#d2a8ff', type: '#ffa657', builtin: '#79c0ff',
      constant: '#79c0ff', operator: '#ff7b72', punctuation: '#c9d1d9', variable: '#ffa657',
      property: '#79c0ff', tag: '#7ee787', attr: '#79c0ff', meta: '#8b949e',
      annotation: '#d2a8ff', inserted: '#aff5b4', deleted: '#ffdcd7', heading: '#58a6ff',
      link: '#a5d6ff', emphasis: '#c9d1d9', code: '#a5d6ff',
    },
    backgrounds: { inserted: '#033a16', deleted: '#67060c' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  'github-light': {
    label: 'GitHub Light',
    dark: false,
    background: '#ffffff',
    border: '#d0d7de',
    lineNumber: '#8c959f',
    titleBar: '#f6f8fa',
    colors: {
      plain: '#24292f', keyword: '#cf222e', string: '#0a3069', comment: '#6e7781',
      number: '#0550ae', function: '#8250df', type: '#953800', builtin: '#0550ae',
      constant: '#0550ae', operator: '#cf222e', punctuation: '#24292f', variable: '#953800',
      property: '#0550ae', tag: '#116329', attr: '#0550ae', meta: '#6e7781',
      annotation: '#8250df', inserted: '#116329', deleted: '#cf222e', heading: '#0969da',
      link: '#0a3069', emphasis: '#24292f', code: '#0a3069',
    },
    backgrounds: { inserted: '#dafbe1', deleted: '#ffebe9' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  'paper-light': {
    label: 'Paper Light',
    dark: false,
    background: '#ffffff',
    border: '#e4e7eb',
    lineNumber: '#9aa3ad',
    titleBar: '#f4f6f8',
    colors: {
      plain: '#1f2328', keyword: '#8250df', string: '#0a5c36', comment: '#6b7280',
      number: '#a15000', function: '#0a4b8c', type: '#8a5a00', builtin: '#0a4b8c',
      constant: '#a15000', operator: '#4a5568', punctuation: '#4a5568', variable: '#8a5a00',
      property: '#0a4b8c', tag: '#0a5c36', attr: '#0a4b8c', meta: '#9aa3ad',
      annotation: '#8250df', inserted: '#0a5c36', deleted: '#b31d28', heading: '#0a4b8c',
      link: '#0a4b8c', emphasis: '#1f2328', code: '#0a5c36',
    },
    backgrounds: { inserted: '#e8f5ec', deleted: '#fdecee' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  'one-dark': {
    label: 'One Dark',
    dark: true,
    background: '#282c34',
    border: '#3b4048',
    lineNumber: '#5c6370',
    titleBar: '#21252b',
    colors: {
      plain: '#abb2bf', keyword: '#c678dd', string: '#98c379', comment: '#5c6370',
      number: '#d19a66', function: '#61afef', type: '#e5c07b', builtin: '#56b6c2',
      constant: '#d19a66', operator: '#56b6c2', punctuation: '#abb2bf', variable: '#e06c75',
      property: '#e06c75', tag: '#e06c75', attr: '#d19a66', meta: '#5c6370',
      annotation: '#c678dd', inserted: '#98c379', deleted: '#e06c75', heading: '#e06c75',
      link: '#61afef', emphasis: '#abb2bf', code: '#98c379',
    },
    backgrounds: { inserted: '#2c3b28', deleted: '#3b2828' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  monokai: {
    label: 'Monokai',
    dark: true,
    background: '#272822',
    border: '#3e3d32',
    lineNumber: '#75715e',
    titleBar: '#1e1f1c',
    colors: {
      plain: '#f8f8f2', keyword: '#f92672', string: '#e6db74', comment: '#75715e',
      number: '#ae81ff', function: '#a6e22e', type: '#66d9ef', builtin: '#66d9ef',
      constant: '#ae81ff', operator: '#f92672', punctuation: '#f8f8f2', variable: '#fd971f',
      property: '#a6e22e', tag: '#f92672', attr: '#a6e22e', meta: '#75715e',
      annotation: '#a6e22e', inserted: '#a6e22e', deleted: '#f92672', heading: '#a6e22e',
      link: '#66d9ef', emphasis: '#f8f8f2', code: '#e6db74',
    },
    backgrounds: { inserted: '#2b3a1f', deleted: '#3d1f22' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  'solarized-light': {
    label: 'Solarized Light',
    dark: false,
    background: '#fdf6e3',
    border: '#eee8d5',
    lineNumber: '#93a1a1',
    titleBar: '#eee8d5',
    colors: {
      plain: '#657b83', keyword: '#859900', string: '#2aa198', comment: '#93a1a1',
      number: '#d33682', function: '#268bd2', type: '#b58900', builtin: '#268bd2',
      constant: '#d33682', operator: '#859900', punctuation: '#657b83', variable: '#cb4b16',
      property: '#268bd2', tag: '#268bd2', attr: '#b58900', meta: '#93a1a1',
      annotation: '#6c71c4', inserted: '#859900', deleted: '#dc322f', heading: '#cb4b16',
      link: '#268bd2', emphasis: '#657b83', code: '#2aa198',
    },
    backgrounds: { inserted: '#e6f0d4', deleted: '#f8e0dd' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    dark: true,
    background: '#002b36',
    border: '#073642',
    lineNumber: '#586e75',
    titleBar: '#073642',
    colors: {
      plain: '#839496', keyword: '#859900', string: '#2aa198', comment: '#586e75',
      number: '#d33682', function: '#268bd2', type: '#b58900', builtin: '#268bd2',
      constant: '#d33682', operator: '#859900', punctuation: '#839496', variable: '#cb4b16',
      property: '#268bd2', tag: '#268bd2', attr: '#b58900', meta: '#586e75',
      annotation: '#6c71c4', inserted: '#859900', deleted: '#dc322f', heading: '#cb4b16',
      link: '#268bd2', emphasis: '#839496', code: '#2aa198',
    },
    backgrounds: { inserted: '#0b3d2c', deleted: '#4a1f1f' },
    decorations: { comment: 'italic', heading: 'bold', meta: 'italic', annotation: 'italic' },
  },

  // ------------------------------------------------------------------
  // SyntaxHighlighter 3.0.83 经典主题（codeinword.com 演示的同款高亮方式）。
  // 色值取自官方 shTheme*.css；`highlightLine` / `gutterEdge` /
  // `gutterHighlight` 分别对应被强调行、行号列右侧竖条与强调行的行号底色。
  // 类名映射：keyword←keyword、string←string、comments←comment、value←number、
  // functions←function/builtin、constants←constant、variable←variable、
  // preprocessor←meta、color1←property/attr、color2←type/annotation、
  // tag←keyword（Eclipse 采用其 xml 覆盖色）、operator/punctuation←plain。
  // ------------------------------------------------------------------
  'sh-default': {
    label: 'SyntaxHighlighter Default',
    dark: false,
    background: '#ffffff',
    border: '#d0d0d0',
    lineNumber: '#afafaf',
    titleBar: '#f0f0f0',
    highlightLine: '#e0e0e0',
    gutterEdge: '#6ce26c',
    gutterHighlight: { background: '#6ce26c', color: '#ffffff' },
    colors: {
      plain: '#000000', keyword: '#006699', string: '#0000ff', comment: '#008200',
      number: '#009900', function: '#ff1493', type: '#ff1493', builtin: '#ff1493',
      constant: '#0066cc', operator: '#000000', punctuation: '#000000', variable: '#aa7700',
      property: '#808080', tag: '#006699', attr: '#808080', meta: '#808080',
      annotation: '#ff1493', inserted: '#009900', deleted: '#ff0000', heading: '#006699',
      link: '#0066cc', emphasis: '#000000', code: '#0000ff',
    },
    backgrounds: { inserted: '#e0f2e0', deleted: '#f9e3e3' },
    decorations: { keyword: 'bold' },
  },
  'sh-django': {
    label: 'SyntaxHighlighter Django',
    dark: true,
    background: '#0a2b1d',
    border: '#123c2a',
    lineNumber: '#497958',
    titleBar: '#0e3826',
    highlightLine: '#233729',
    gutterEdge: '#41a83e',
    gutterHighlight: { background: '#41a83e', color: '#0a2b1d' },
    colors: {
      plain: '#f8f8f8', keyword: '#96dd3b', string: '#9df39f', comment: '#336442',
      number: '#f7e741', function: '#ffaa3e', type: '#91bb9e', builtin: '#ffaa3e',
      constant: '#e0e8ff', operator: '#f8f8f8', punctuation: '#f8f8f8', variable: '#ffaa3e',
      property: '#91bb9e', tag: '#96dd3b', attr: '#91bb9e', meta: '#91bb9e',
      annotation: '#eb939a', inserted: '#9df39f', deleted: '#eb939a', heading: '#96dd3b',
      link: '#e0e8ff', emphasis: '#f8f8f8', code: '#9df39f',
    },
    backgrounds: { inserted: '#14351f', deleted: '#3d1a24' },
    decorations: { keyword: 'bold', comment: 'italic' },
  },
  'sh-eclipse': {
    label: 'SyntaxHighlighter Eclipse',
    dark: false,
    background: '#ffffff',
    border: '#d4d0c8',
    lineNumber: '#787878',
    titleBar: '#f0f0f0',
    highlightLine: '#c3defe',
    gutterEdge: '#d4d0c8',
    gutterHighlight: { background: '#d4d0c8', color: '#ffffff' },
    colors: {
      plain: '#000000', keyword: '#7f0055', string: '#2a00ff', comment: '#3f5fbf',
      number: '#009900', function: '#ff1493', type: '#ff1493', builtin: '#ff1493',
      constant: '#0066cc', operator: '#000000', punctuation: '#000000', variable: '#aa7700',
      property: '#808080', tag: '#3f7f7f', attr: '#7f007f', meta: '#646464',
      annotation: '#ff1493', inserted: '#009900', deleted: '#ff0000', heading: '#7f0055',
      link: '#0066cc', emphasis: '#000000', code: '#2a00ff',
    },
    backgrounds: { inserted: '#e0f0e0', deleted: '#fbe4e4' },
    decorations: { keyword: 'bold' },
  },
  'sh-emacs': {
    label: 'SyntaxHighlighter Emacs',
    dark: true,
    background: '#000000',
    border: '#2a2a2a',
    lineNumber: '#d3d3d3',
    titleBar: '#141414',
    highlightLine: '#2a3133',
    gutterEdge: '#990000',
    gutterHighlight: { background: '#990000', color: '#000000' },
    colors: {
      plain: '#d3d3d3', keyword: '#00ffff', string: '#ff9e7b', comment: '#ff7d27',
      number: '#009900', function: '#81cef9', type: '#ff7d27', builtin: '#81cef9',
      constant: '#ff9e7b', operator: '#d3d3d3', punctuation: '#d3d3d3', variable: '#ffaa3e',
      property: '#aec4de', tag: '#00ffff', attr: '#aec4de', meta: '#aec4de',
      annotation: '#ebdb8d', inserted: '#00cc00', deleted: '#ff5555', heading: '#00ffff',
      link: '#aec4de', emphasis: '#d3d3d3', code: '#ff9e7b',
    },
    backgrounds: { inserted: '#0c2b0c', deleted: '#3d0d0d' },
  },
  'sh-fadetogrey': {
    label: 'SyntaxHighlighter FadeToGrey',
    dark: true,
    background: '#121212',
    border: '#2c2c29',
    lineNumber: '#afafaf',
    titleBar: '#1a1a1a',
    highlightLine: '#2c2c29',
    gutterEdge: '#3185b9',
    gutterHighlight: { background: '#3185b9', color: '#121212' },
    colors: {
      plain: '#ffffff', keyword: '#d01d33', string: '#e3e658', comment: '#696854',
      number: '#009900', function: '#aaaaaa', type: '#4a8cdb', builtin: '#aaaaaa',
      constant: '#96daff', operator: '#ffffff', punctuation: '#ffffff', variable: '#898989',
      property: '#ffc074', tag: '#d01d33', attr: '#ffc074', meta: '#435a5f',
      annotation: '#4a8cdb', inserted: '#e3e658', deleted: '#d01d33', heading: '#d01d33',
      link: '#96daff', emphasis: '#ffffff', code: '#e3e658',
    },
    backgrounds: { inserted: '#242713', deleted: '#331418' },
    decorations: { function: 'bold' },
  },
  'sh-mdultra': {
    label: 'SyntaxHighlighter MDUltra',
    dark: true,
    background: '#222222',
    border: '#333333',
    lineNumber: '#38566f',
    titleBar: '#2a2a2a',
    highlightLine: '#253e5a',
    gutterEdge: '#435a5f',
    gutterHighlight: { background: '#435a5f', color: '#222222' },
    colors: {
      plain: '#00ff00', keyword: '#aaaaff', string: '#00ff00', comment: '#428bdd',
      number: '#f7e741', function: '#ff8000', type: '#ffff00', builtin: '#ff8000',
      constant: '#ffff00', operator: '#00ff00', punctuation: '#00ff00', variable: '#00ffff',
      property: '#ff0000', tag: '#aaaaff', attr: '#ff0000', meta: '#8aa6c1',
      annotation: '#ffff00', inserted: '#00ff00', deleted: '#ff0000', heading: '#aaaaff',
      link: '#ffff00', emphasis: '#00ff00', code: '#00ff00',
    },
    backgrounds: { inserted: '#1c3a1c', deleted: '#3a1c1c' },
  },
  'sh-midnight': {
    label: 'SyntaxHighlighter Midnight',
    dark: true,
    background: '#0f192a',
    border: '#1f2f45',
    lineNumber: '#afafaf',
    titleBar: '#16243a',
    highlightLine: '#253e5a',
    gutterEdge: '#435a5f',
    gutterHighlight: { background: '#435a5f', color: '#0f192a' },
    colors: {
      plain: '#d1edff', keyword: '#b43d3d', string: '#1dc116', comment: '#428bdd',
      number: '#f7e741', function: '#ffaa3e', type: '#ffffff', builtin: '#ffaa3e',
      constant: '#e0e8ff', operator: '#d1edff', punctuation: '#d1edff', variable: '#ffaa3e',
      property: '#f8bb00', tag: '#b43d3d', attr: '#f8bb00', meta: '#8aa6c1',
      annotation: '#f8bb00', inserted: '#1dc116', deleted: '#ff5555', heading: '#b43d3d',
      link: '#e0e8ff', emphasis: '#d1edff', code: '#1dc116',
    },
    backgrounds: { inserted: '#15301a', deleted: '#38191c' },
  },
  'sh-rdark': {
    label: 'SyntaxHighlighter RDark',
    dark: true,
    background: '#1b2426',
    border: '#2b3436',
    lineNumber: '#afafaf',
    titleBar: '#232d2f',
    highlightLine: '#323e41',
    gutterEdge: '#435a5f',
    gutterHighlight: { background: '#435a5f', color: '#1b2426' },
    colors: {
      plain: '#b9bdb6', keyword: '#5ba1cf', string: '#5ce638', comment: '#878a85',
      number: '#009900', function: '#ffaa3e', type: '#ffffff', builtin: '#ffaa3e',
      constant: '#e0e8ff', operator: '#b9bdb6', punctuation: '#b9bdb6', variable: '#ffaa3e',
      property: '#e0e8ff', tag: '#5ba1cf', attr: '#e0e8ff', meta: '#435a5f',
      annotation: '#e0e8ff', inserted: '#5ce638', deleted: '#ff5555', heading: '#5ba1cf',
      link: '#e0e8ff', emphasis: '#b9bdb6', code: '#5ce638',
    },
    backgrounds: { inserted: '#1d3a22', deleted: '#3a1f1f' },
  },
};

/** 主题 id 列表。 */
export const THEME_IDS = Object.keys(THEMES);

/** 深色主题 id 列表。 */
export const DARK_THEME_IDS = THEME_IDS.filter((id) => THEMES[id].dark);

/** 浅色主题 id 列表。 */
export const LIGHT_THEME_IDS = THEME_IDS.filter((id) => !THEMES[id].dark);

const DEFAULT_DARK = 'github-dark';
const DEFAULT_LIGHT = 'github-light';

const ALIASES = new Map(Object.entries({
  github: DEFAULT_DARK,
  default: DEFAULT_DARK,
  dark: DEFAULT_DARK,
  light: DEFAULT_LIGHT,
  'github-dark-default': DEFAULT_DARK,
  githubdark: DEFAULT_DARK,
  githublight: DEFAULT_LIGHT,
  onedark: 'one-dark',
  'atom-one-dark': 'one-dark',
  solarized: 'solarized-light',
  solarizedlight: 'solarized-light',
  solarizeddark: 'solarized-dark',
  vscode: DEFAULT_DARK,
  'vscode-dark': DEFAULT_DARK,
  'vscode-light': DEFAULT_LIGHT,
  night: 'one-dark',
  // SyntaxHighlighter 经典主题（codeinword.com 同款）。
  sh: 'sh-default',
  shdefault: 'sh-default',
  'syntax-highlighter': 'sh-default',
  syntaxhighlighter: 'sh-default',
  codeinword: 'sh-default',
  django: 'sh-django',
  eclipse: 'sh-eclipse',
  emacs: 'sh-emacs',
  fadetogrey: 'sh-fadetogrey',
  'fade-to-grey': 'sh-fadetogrey',
  mdultra: 'sh-mdultra',
  'md-ultra': 'sh-mdultra',
  midnight: 'sh-midnight',
  rdark: 'sh-rdark',
  'r-dark': 'sh-rdark',
}));

/**
 * 解析主题名。
 * @param {unknown} name 主题 id、别名，或 `auto`。
 * @param {{dark?: boolean}} [preference] `auto` 时使用的明暗偏好。
 * @returns {object} 主题定义。
 */
export function resolveTheme(name, preference = {}) {
  const raw = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (!raw || raw === 'auto') {
    return THEMES[preference.dark === false ? DEFAULT_LIGHT : DEFAULT_DARK];
  }
  if (THEMES[raw]) return THEMES[raw];
  const alias = ALIASES.get(raw);
  if (alias && THEMES[alias]) return THEMES[alias];
  return THEMES[preference.dark === false ? DEFAULT_LIGHT : DEFAULT_DARK];
}

/** 主题 id 与别名，供工具描述展示。 */
export const THEME_LIST = THEME_IDS.join(', ');

/**
 * 取一个 token kind 的前景色。
 * @param {object} theme 主题定义。
 * @param {string} kind token 类型。
 * @returns {string} CSS 颜色。
 */
export function colorFor(theme, kind) {
  if (theme.colors[kind]) return theme.colors[kind];
  return theme.colors.plain;
}

/**
 * 取一个 token kind 的背景色（多数 kind 没有）。
 * @param {object} theme 主题定义。
 * @param {string} kind token 类型。
 * @returns {string|undefined} CSS 颜色。
 */
export function backgroundFor(theme, kind) {
  return theme.backgrounds ? theme.backgrounds[kind] : undefined;
}

/**
 * 取一个 token kind 的装饰（粗体/斜体）。
 * @param {object} theme 主题定义。
 * @param {string} kind token 类型。
 * @returns {{bold:boolean, italic:boolean}} 装饰开关。
 */
export function decorationsFor(theme, kind) {
  const value = theme.decorations ? theme.decorations[kind] : undefined;
  return { bold: value === 'bold', italic: value === 'italic' };
}

/** 判断一个主题是否为深色。 */
export function isDarkTheme(theme) {
  return !!theme.dark;
}
