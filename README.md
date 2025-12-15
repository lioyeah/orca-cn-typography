# OrcaNote 高级排版增强插件 (OrcaNote Typography Enhancer)

本插件为 [OrcaNote](https://orca-studio.com) (虎鲸笔记) 提供符合中文写作规范的高级排版增强能力，覆盖自动空格、单位空格、标点与引号规范、数字对齐与连字等显示层优化。同时保留全局基础字号与行高控制，避免与 OrcaNote 内置字体选择冲突。

## ✨ 主要功能

* 自动空格：中文与英文/数字之间自动加空格；支持单位空格增强与例外处理（°、%）。
* 标点与引号规范化：移除中文全角标点前后多余空格；支持引号风格转换（`mainland`／`tw-hk`／`tech`）。
* 自定义规则：提供 JSON 规则扩展空格/标点行为，按序执行到显示层，不改动原文。
* 数字对齐与连字：启用 `font-variant-numeric: tabular-nums` 提升表格数字对齐；可配置正文/代码连字。
* 作用范围与性能：通过选择器限定变换作用范围（默认 `.markdown-body`），并支持防抖（默认 75ms）。
* 基础视觉控制：保留 `--orca-fontsize-base` 全局基础字号与 `--orca-lineheight-md` 全局行高。
* 严格跳过代码区：自动跳过 `code/pre/kbd/samp`、高亮容器（`hljs` 等）、编辑器容器（`CodeMirror/Monaco` 等）、链接与可编辑区域。

## 🚀 安装与使用

1. 从 Releases 下载 ZIP（ https://github.com/lioyeah/orca-cn-typography/releases ），解压得到插件目录（例如 `orca-cn-typography`），放入 OrcaNote 插件目录后启用。
2. 在插件设置中按需配置上述选项；变更通常会实时生效。
3. 若未生效，请尝试重启 OrcaNote 或重新启用插件。

## ⚙️ 设置项一览

- `baseFontSize`：全局基础字号
- `globalLineHeight`：全局行高
- `enableAutoSpacing`：智能中英数字间距
- `enableEnhancedSpacing`：数字-单位空格增强与例外处理
- `customSpacingRules`：自定义空格规则（JSON）
- `enablePunctuationPreview`：标点/引号规范预览
- `enablePunctuationEnhanced`：增强标点规则
- `punctuationStyle`：引号风格（`mainland` | `tw-hk` | `tech`）
- `customPunctuationRules`：自定义标点规则（JSON）
- `bodyLigatures`：正文连字
- `codeLigatures`：代码连字
- `numericTabular`：表格数字对齐
- `transformRootSelector`：变换作用范围选择器（默认 `.markdown-body`）
- `transformDebounceMs`：变换防抖毫秒（默认 `75`）
- `unitWhitelist`：单位白名单（CSV，默认含常见单位）
- `debugLogs`：调试日志

注：为避免与 OrcaNote 内置字体选择冲突，本插件已移除字体族选择项。

## 🧪 测试与验证

- 仓库内提供 `typography-test.md`，包含场景化示例与判定标准，便于他人复核。
- 代码区不会被显示层变换影响（已覆盖常见容器与编辑器类名）。

## 🤝 反馈与贡献 (Feedback & Contributing)

如果你在使用过程中遇到任何问题、有功能建议，或者发现了 Bug，欢迎通过本仓库的 [**Issues**](https://github.com/lioyeah/orca-cn-typography/issues) 页面提交。

如果你有兴趣为本项目贡献代码，也欢迎提交 Pull Request。

## 📄 许可证 (License)

本项目采用 [MIT 许可证](LICENSE) 。

---
