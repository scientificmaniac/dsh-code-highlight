# 贡献指南

感谢你愿意改进这个项目。下面是让改动顺利合入的几条约定。

## 环境

- Node.js ≥ 20（仓库自带的测试与脚本都用 ESM）
- Python 3 + Pillow —— 只有 PNG 相关的工作需要（`npm run test:raster`）

```bash
git clone https://github.com/your-name/dsh-code-highlight.git
cd dsh-code-highlight
npm test
```

仓库没有第三方运行时依赖，因此不需要 `npm install` 就能跑测试。

## 提交前

```bash
npm test            # 必须全绿
npm run test:raster # 改了 py/ 或几何相关代码时也要跑
```

`npm test` 会打印 `checks: N failures: 0`，并把完整报告写到 `smoke-report.txt`。
如果新增了行为，请在 `tests/smoke.mjs` 里补一条断言——这个项目的每个修复都对应一条断言。

## 代码约定

- 源码、注释与文档使用简体中文；标识符、命令、路径保持英文。
- 模块一律 ESM，`node:` 前缀导入内置模块。
- 渲染器保持纯函数：只读 `token` 与主题，不改输入、不写文件。
- 输出产物必须自包含：HTML 用内联样式，SVG 用内联属性，LaTeX 自带宏包注释。
- 保持零运行时依赖。需要新能力时优先扩展现有模块，而不是引入 npm 包。
- `.editorconfig` 已规定缩进与换行，请勿提交 CRLF。
- 所有文本文件一律 **UTF-8 无 BOM**。不要用 Windows PowerShell 5.1 的 `Get-Content` / `Set-Content` 做文本替换：它会把 UTF-8 当 ANSI 读、并写入 BOM，中文会整体变成乱码；`npm test` 的编码守卫会直接拦下这类提交。

## 新增一种语言

在 `src/languages.js` 里用 `lang()` 工厂登记，然后加进 `CODE_LANGUAGES` 或 `DATA_LANGUAGES`：

```js
lang('mylang', 'MyLang', {
  a: ['mylang', 'ml'],          // 别名
  e: ['mylang'],                // 扩展名
  line: ['//'],                 // 行注释前缀
  block: [['/*', '*/']],        // 块注释起止
  str: ['"', "'"],              // 字符串；首尾不同写 ['r"', { to: '"', esc: null }]
  kw: 'if else while return',   // 关键字，空格分隔
  t: 'int float string',        // 类型
  b: 'print len',               // 内置函数
  c: 'true false null',         // 常量
  ci: false,                    // 关键字是否不区分大小写
});
```

不需要写扫描器：`mode` 默认 `code`，通用分词器会处理注释、字符串、数字、关键字与标识符。
只有当这门语言的语法结构真的不同（标签、缩进块、配置表等）时才新增一种 `mode`。

加完后 `npm test` 会自动把新语言纳入往返不变式与渲染矩阵检查。

## 新增一套主题

在 `src/themes.js` 的 `THEMES` 里加一项，颜色需覆盖 `src/tokenize.js` 中 `KINDS` 列出的全部
token 类型；确有需要时用 `backgrounds` 与 `decorations` 补充背景色和粗斜体。
`THEME_IDS`、`DARK_THEME_IDS`、`LIGHT_THEME_IDS` 与渲染矩阵会自动包含新主题。

## 新增一种输出格式

1. 在 `src/render.js` 里加渲染函数，签名与既有的 `renderHtml` / `renderSvg` 保持一致。
2. 在 `index.js` 的 `FORMATS` 里登记，并在 `execute` 的 `switch` 中分派；需要写文件时加入 `FILE_FORMATS`。
3. 在 `tests/smoke.mjs` 的 `formatFunctions` 里加一条，让渲染矩阵覆盖它。
4. 更新两份 README 的参数表与格式表。

## 改动几何或栅格化

SVG 与 PNG 的尺寸必须一致，这条由 `blockGeometry()`（`src/render.js`）作为唯一来源保证：
Node 侧算出 `blockWidth` / `blockHeight` / `scale` 交给 `py/rasterize.py`。改其中任何一侧，
都要重跑 `npm run test:raster`，并确认 `examples/doc-figure.svg` 的 `width`/`height` 与
`examples/doc-figure.png` 的像素尺寸换算成英寸后相等。

## 提交与 PR

- 提交信息用祈使句，说明改了什么：`fix: keep CJK baselines aligned with SVG`。
- 一个 PR 只做一件事；行为变化请同步更新 `CHANGELOG.md` 的 `Unreleased` 段。
- PR 描述里写清：动机、做法、验证方式（跑了哪些命令、看到了什么结果）。

## 许可证

提交贡献即表示同意以 [MIT](LICENSE) 许可证发布你的改动。
