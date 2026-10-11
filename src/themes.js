/**
 * 主题配色表。
 *
 * 每个主题给出一套背景/前景/行号色，以及按 token kind 的取色。
 * 渲染器只通过 `colorFor` / `decorationsFor` 取色，不直接读具体字段，
 * 因此新增主题不需要改渲染器。
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
