# Changelog

本项目所有值得记录的变更都写在这里。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-10-25

SyntaxHighlighter 经典主题（codeinword.com 同款）、高亮 HTML 导入导出、Word 友好的表格版式输出。

### 新增

- 导入 [codeinword.com](https://www.codeinword.com/) 导出的 SyntaxHighlighter 高亮 HTML：直接把它作为 `code` 传入
  （默认自动识别，或 `input_format: "sh-html"` 强制），解析回 token 后可重渲为行内样式 HTML、SVG、PNG、LaTeX 等
  任意格式，`theme` 可顺手换肤；`&nbsp;` 缩进、HTML 实体、元素间空格、`numberN` 起始行号与 brush 语言名都会被正确还原。
- 新增 `sh-html` 输出格式：导出 SyntaxHighlighter 3 的 class 标记（`div.line` + `code.<语言>`，颜色由消费方页面的
  shTheme 样式表决定），与 codeinword.com 的产物同构。
- 新增 8 套 SyntaxHighlighter 3.0.83 经典主题（[codeinword.com](https://www.codeinword.com/) 演示的同款高亮方式）：
  `sh-default`、`sh-django`、`sh-eclipse`、`sh-emacs`、`sh-fadetogrey`、`sh-mdultra`、`sh-midnight`、`sh-rdark`，
  色值取自官方 `shTheme*.css`；另支持 `django`、`eclipse`、`emacs`、`midnight`、`rdark`、`codeinword` 等别名。
- HTML 输出还原 SyntaxHighlighter 的标志性外观：行号列右侧彩色竖条（`gutterEdge`）、
  强调行整行底色（`highlightLine`）与强调行行号底色（`gutterHighlight`）；旧主题输出不变。
- `npm test` 现在先跑编码守卫（`tests/encoding.mjs`）：仓库文本文件必须是合法 UTF-8、不带 BOM、且不含乱码特征字。

### 修复

- `format: latex`（listings 后端）的标题改走 `caption={…}` 选项：此前 `\caption` 位于 `\end{lstlisting}`
  之后的浮动体外部，单独编译会报 "Caption outside float"。
- `format: text` 配合 `output_file` 时不再返回空反馈：文件照写，同时返回头部与落盘提示
  （此前文件写入成功但调用方拿不到任何文本）。
- `format: html` 改为表格版式（每行一个 `tr`，行号与代码各占一格，title 在代码格外且不可选中）。
  原 `<span style="display:block">` 的分行只对浏览器成立，Word / LibreOffice 会把整块挤成一段连续文字；
  行号原为行内 span，栏宽不足折行时错位。表格版式已验证 LibreOffice 逐行渲染正常（SyntaxHighlighter 原版即此形态，真 Word 未实测）。
- 代码以换行结尾时不再多渲染一行：工具入口剥掉单个尾换行（此前 27 行代码报 28 行、PNG 底部多一条空带）。
  剥在入口而非分词器，分词保持往返无损。
- `title` 不再进入代码内容：此前文件名 span 位于 `<code>` 内且可选中，复制代码首行会带上文件名。
- 行首缩进输出为 `&nbsp;`，防止粘贴到 Word / 富文本时被折叠。
- 等宽字体栈首项从 CSS 系统关键字 `ui-monospace` 改为具体字体 `Consolas`：Word、邮件、PDF 打印器不认系统关键字，会回退到非等宽字体导致缩进错位。
- 写文件的格式（`png`、`svg-png` 以及带 `output_file` 的其他格式）返回的 `content` 为空，
  与输出 schema 声明的字符串类型冲突，导致工具结果被判为无效输出。现在 `content` 返回空串，
  `rasterizer` 字段只在真正发生栅格化时出现。

## [1.0.0] - 2026-10-11

首个发布版本。

### 新增

- `highlight_code` 工具：68 种语言、7 套主题、10 种输出格式。
- 语言自动识别：按特征打分，分数低于阈值时按纯文本处理，不猜测。
- 渲染器：HTML 片段、独立 HTML 文档、SVG、LaTeX（`listings` 与 `minted` 两种后端）、Markdown 围栏、ANSI、纯文本。
- 落盘：`output_file` 直接写文件并返回路径，`overwrite` 控制是否允许覆盖。
- 位图输出：`png` 与 `svg-png`，由内置的 `py/rasterize.py` 用 Pillow 绘制，无需浏览器或 Office。
- 文档排版参数：`width_in`、`dpi`、`font_size_pt`、`line_height`、`show_title`、`document_title`、`mono_font`、`cjk_font`。
- 幻灯片画布：`canvas: "960x540"`，产物可直接交给 `univer_compile_svg`。
- `paper-light` 主题：纯白底、低饱和配色，面向打印报告。
- 冒烟测试：112 项断言，覆盖分词往返不变式、渲染矩阵、语言识别与排版几何。

### 修复

- `html-file` 不再重复输出文件名——此前 `<h1>`、小节标题与代码块标签会各出现一次。
- SVG 与 PNG 的物理尺寸不再不一致：两者改为共用同一套几何，由 Node 侧计算后传给栅格化器。
- 行基线不再相对 SVG 漂移：Python 的银行家舍入改为与 JavaScript `Math.round` 一致的舍入。
- 栅格化不再依赖被捕获的管道：子进程以 `stdio: ignore` 启动，诊断经临时文件回传。
