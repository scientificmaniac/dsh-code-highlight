# Changelog

本项目所有值得记录的变更都写在这里。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- `npm test` 现在先跑编码守卫（`tests/encoding.mjs`）：仓库文本文件必须是合法 UTF-8、不带 BOM、且不含乱码特征字。

### 修复

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
