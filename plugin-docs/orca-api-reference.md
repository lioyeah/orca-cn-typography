# Orca API 接口指南

本文档基于 `orca.d.ts` TypeScript 类型定义文件，提供了 Orca 插件开发的完整 API 参考。

## 目录

- [概述](#概述)
- [核心 API](#核心-api)
- [状态管理 (State)](#状态管理-state)
- [命令系统 (Commands)](#命令系统-commands)
- [快捷键管理 (Shortcuts)](#快捷键管理-shortcuts)
- [导航管理 (Navigation)](#导航管理-navigation)
- [插件管理 (Plugins)](#插件管理-plugins)
- [主题管理 (Themes)](#主题管理-themes)
- [渲染器管理 (Renderers)](#渲染器管理-renderers)
- [转换器 (Converters)](#转换器-converters)
- [广播系统 (Broadcasts)](#广播系统-broadcasts)
- [UI 组件 (Components)](#ui-组件-components)
- [顶部栏 (Headbar)](#顶部栏-headbar)
- [工具栏 (Toolbar)](#工具栏-toolbar)
- [斜杠命令 (Slash Commands)](#斜杠命令-slash-commands)
- [块菜单命令 (Block Menu Commands)](#块菜单命令-block-menu-commands)
- [标签菜单命令 (Tag Menu Commands)](#标签菜单命令-tag-menu-commands)
- [编辑器侧边栏工具 (Editor Sidetools)](#编辑器侧边栏工具-editor-sidetools)
- [工具函数 (Utils)](#工具函数-utils)
- [通知 (Notify)](#通知-notify)
- [后端 API (Backend API)](#后端-api-backend-api)
- [类型定义](#类型定义)

---

## 概述

Orca 插件系统通过全局 `orca` 对象提供完整的 API 访问。插件可以通过这个对象与 Orca 的核心功能进行交互。

```typescript
// 访问 Orca API
console.log(orca.state.locale)
```

### 快速入门

如果你是第一次开发 Orca 插件，建议先阅读快速入门指南，了解插件开发的基本概念、环境要求和项目结构。

**[Quick Start 快速入门指南](./documents/Quick-Start.md)**

快速入门指南包含：

- 环境要求和工具安装
- 项目结构和文件说明
- 插件生命周期（加载、启用、禁用）
- 插件设置管理
- API 概览和主要功能
- 开发约定和最佳实践
- 实用的代码示例

### 主要文档

除了本文档的 API 参考外，Orca 还提供了以下详细文档：

- **[Quick Start](./documents/Quick-Start.md)** - 插件开发快速入门指南
- **[Core Commands](./documents/Core-Commands.md)** - 核心命令完整列表
- **[Core Editor Commands](./documents/Core-Editor-Commands.md)** - 编辑器命令详细文档
- **[Backend API](./documents/Backend-API.md)** - 后端 API 详细文档
- **[Custom Renderers](./documents/Custom-Renderers.md)** - 自定义渲染器完整指南

---

## 核心 API

### `orca.invokeBackend`

调用后端 API 的核心方法，用于插件与 Orca 后端系统通信。

```typescript
invokeBackend(type: APIMsg, ...args: any[]): Promise<any>
```

**示例：**

```typescript
// 通过 ID 获取块
const block = await orca.invokeBackend("get-block", 12345)
console.log(`Block content: ${block.text}`)

// 获取带有特定标签的块
const taggedBlocks = await orca.invokeBackend(
  "get-blocks-with-tags",
  ["project", "active"]
)
console.log(`Found ${taggedBlocks.length} active projects`)
```

---

## 状态管理 (State)

`orca.state` 对象包含 Orca Note 应用程序的当前响应式状态。

### 核心状态属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `activePanel` | `string` | 当前活动（焦点）面板的 ID |
| `blocks` | `Record<string, Block>` | 内存中所有块的映射 |
| `commands` | `Record<string, Command>` | 所有已注册命令的注册表 |
| `dataDir` | `string` | 应用程序数据目录的绝对路径 |
| `repoDir` | `string` | 当前仓库目录的绝对路径 |
| `locale` | `string` | 当前语言环境（如 "en"、"zh-CN"） |
| `themeMode` | `"light" \| "dark"` | 当前主题模式 |
| `repo` | `string` | 当前仓库名称 |
| `panels` | `RowPanel` | 定义应用程序当前布局的根面板结构 |
| `plugins` | `Record<string, Plugin>` | 所有已安装插件的注册表 |
| `settings` | `Record<number, any>` | 应用程序和仓库设置 |
| `notifications` | `Notification[]` | 当前显示的活跃通知 |
| `shortcuts` | `Record<string, string>` | 键盘快捷键映射 |
| `themes` | `Record<string, string>` | 已安装主题的注册表 |

### 渲染器注册表

| 属性 | 类型 | 描述 |
|------|------|------|
| `blockRenderers` | `Record<string, any>` | 块渲染器组件注册表 |
| `inlineRenderers` | `Record<string, any>` | 内联内容渲染器组件注册表 |
| `panelRenderers` | `Record<string, any>` | 面板渲染器组件注册表 |

**使用说明：**

渲染器注册表存储了所有已注册的渲染器实例。注册表是一个键值对映射，其中：
- **键**：渲染器的唯一标识符（注册时使用的名称）
- **值**：渲染器实例对象

```typescript
// 遍历所有已注册的块渲染器
for (const [name, renderer] of Object.entries(orca.state.blockRenderers)) {
  console.log(`Block renderer: ${name}`, renderer)
}

// 查找特定渲染器
const myBlockRenderer = orca.state.blockRenderers["my-plugin.myBlock"]
if (myBlockRenderer) {
  console.log("Found my block renderer:", myBlockRenderer)
}

// 检查渲染器是否存在
if ("my-plugin.myBlock" in orca.state.blockRenderers) {
  console.log("My block renderer is registered")
}
```

**使用场景：**

- 检查渲染器是否已注册
- 获取渲染器实例进行调试或高级操作
- 列出所有可用渲染器
- 条件性渲染或处理特定渲染器

### 转换器注册表

| 属性 | 类型 | 描述 |
|------|------|------|
| `blockConverters` | `Record<string, Record<string, Function>>` | 块内容转换器注册表 |
| `inlineConverters` | `Record<string, Record<string, Function>>` | 内联内容转换器注册表 |

### UI 状态

| 属性 | 类型 | 描述 |
|------|------|------|
| `settingsOpened` | `boolean` | 设置面板是否打开 |
| `commandPaletteOpened` | `boolean` | 命令面板是否打开 |
| `globalSearchOpened` | `boolean` | 全局搜索面板是否打开 |
| `sidebarTab` | `string` | 侧边栏当前活动的标签 |
| `filterInTags` | `string` | 标签面板的可选过滤器 |
| `filterInPages` | `string` | 页面板的可选过滤器 |

### 导航历史

| 属性 | 类型 | 描述 |
|------|------|------|
| `panelBackHistory` | `PanelHistory[]` | 后退导航历史 |
| `panelForwardHistory` | `PanelHistory[]` | 前进导航历史 |

### 自定义 UI 元素注册表

| 属性 | 类型 | 描述 |
|------|------|------|
| `headbarButtons` | `Record<string, Function>` | 顶部栏自定义按钮 |
| `toolbarButtons` | `Record<string, ToolbarButton>` | 编辑器工具栏按钮 |
| `slashCommands` | `Record<string, SlashCommand>` | 编辑器斜杠命令 |
| `blockMenuCommands` | `Record<string, BlockMenuCommand>` | 块上下文菜单命令 |
| `tagMenuCommands` | `Record<string, TagMenuCommand>` | 标签上下文菜单命令 |
| `editorSidetools` | `Record<string, EditorSidetool>` | 编辑器侧边栏工具 |

**示例：**

```typescript
// 获取当前活动面板
const activePanelId = orca.state.activePanel

// 在当前活动面板中打开块
orca.nav.goTo("block", { blockId: 123 }, activePanelId)

// 获取特定块
const block = orca.state.blocks[123]
if (block) {
  console.log(`Block content: ${block.text}`)
}

// 检查语言环境
if (orca.state.locale === "zh-CN") {
  console.log("Chinese language is active")
}

// 获取应用程序设置
const themeMode = orca.state.settings[AppKeys.ThemeMode]
console.log(`Current theme mode: ${themeMode}`)

// 获取仓库设置
const defaultSortField = orca.state.settings[RepoKeys.DefaultSortField]
console.log(`Default sort field: ${defaultSortField}`)
```

### 设置键 (Settings Keys)

Orca 提供了两类设置键：应用程序级别设置（`AppKeys`）和仓库级别设置（`RepoKeys`）。这些键用于访问和修改各种配置选项。

#### AppKeys（应用程序级别设置）

应用程序级别设置存储在 `orca.state.settings` 中，适用于整个应用程序。

| 键名 | 值 | 描述 |
|------|-----|------|
| `SchemaVersion` | 1 | 数据库模式版本 |
| `Repos` | 2 | 仓库列表 |
| `LastOpenedRepo` | 3 | 最后打开的仓库 |
| `ThemeMode` | 4 | 主题模式（"light" 或 "dark"） |
| `ThemeColor` | 5 | 主题颜色 |
| `SidebarOpened` | 6 | 侧边栏是否打开 |
| `SidebarWidth` | 7 | 侧边栏宽度 |
| `FirstDayOfWeek` | 8 | 每周的第一天（0-6） |
| `HourSystem` | 9 | 时间系统（12 或 24 小时制） |
| `FirstWeekHasDay` | 10 | 第一周包含的天数 |
| `Theme` | 11 | 主题名称 |
| `JournalDateFormat` | 12 | 日记日期格式 |
| `CachedEditorNum` | 13 | 缓存的编辑器数量 |
| `TemplateTag` | 14 | 模板标签 |
| `MapProvider` | 15 | 地图提供商 |
| `SpellCheck` | 16 | 拼写检查 |
| `DefaultSortField` | 17 | 默认排序字段 |
| `DefaultSortOrder` | 18 | 默认排序顺序 |
| `AIBaseURL` | 19 | AI 基础 URL |
| `AIAPIKey` | 20 | AI API 密钥 |
| `AITag` | 21 | AI 标签 |
| `AIModel` | 22 | AI 模型 |
| `AIContinueWritingPresets` | 23 | AI 续写预设 |
| `AIRefinePresets` | 24 | AI 优化预设 |
| `AITranslateToPresets` | 25 | AI 翻译预设 |
| `AIChatBaseURL` | 26 | AI 聊天基础 URL |
| `AIChatAPIKey` | 27 | AI 聊天 API 密钥 |
| `AIChatModel` | 28 | AI 聊天模型 |
| `License` | 29 | 许可证信息 |
| `HelpShown` | 30 | 帮助是否已显示 |
| `ToCWidth` | 38 | 目录宽度 |
| `ColorPickerColors` | 39 | 颜色选择器颜色 |
| `ClassicStyle` | 40 | 经典样式 |
| `WhiteboardLibraryItems` | 41 | 白板库项目 |
| `AutoDownloadWebImages` | 42 | 自动下载网络图片 |
| `ShowTagPropsOnFocus` | 43 | 聚焦时显示标签属性 |
| `OutlineTag` | 45 | 大纲标签 |
| `ReminderAlertOffsets` | 46 | 提醒警报偏移量 |
| `CompactTagProps` | 47 | 紧凑标签属性 |
| `ReduceTooltips` | 48 | 减少工具提示 |
| `CompressImages` | 49 | 压缩图片 |
| `MCPServerToken` | 50 | MCP 服务器令牌 |
| `EnableVibrant` | 52 | 启用 Vibrant 效果 |
| `EnablePastePrompt` | 53 | 启用粘贴提示 |
| `UIFont` | 54 | UI 字体 |
| `EditorFont` | 55 | 编辑器字体 |
| `CodeFont` | 56 | 代码字体 |

#### RepoKeys（仓库级别设置）

仓库级别设置存储在 `orca.state.settings` 中，适用于特定仓库。除了包含所有 AppKeys 外，还增加了以下仓库特定的设置：

| 键名 | 值 | 描述 |
|------|-----|------|
| `Favorites` | 1003 | 收藏的块 |
| `LastOpenedBounds` | 1001 | 最后打开的边界 |
| `PanelLayouts` | 1002 | 面板布局 |
| `JournalCustomQueries` | 1004 | 日记自定义查询 |
| `JournalCustomQueriesOrder` | 1005 | 日记自定义查询顺序 |
| `GoToBlocks` | 1006 | 转到块列表 |

**示例：**

```typescript
// 获取应用程序级别的主题模式
const themeMode = orca.state.settings[AppKeys.ThemeMode]

// 设置应用程序级别的主题
await orca.invokeBackend("set-app-config", AppKeys.ThemeMode, "dark")

// 获取仓库级别的默认排序字段
const defaultSortField = orca.state.settings[RepoKeys.DefaultSortField]

// 设置仓库级别的默认排序字段
await orca.invokeBackend("set-config", RepoKeys.DefaultSortField, "modified")

// 获取仓库特定的收藏列表
const favorites = orca.state.settings[RepoKeys.Favorites]
```

---

## 命令系统 (Commands)

命令是向 Orca 添加功能的主要方式，可以绑定到快捷键、工具栏按钮、斜杠命令等。

### `orca.commands.registerCommand`

注册新命令。

```typescript
registerCommand(id: string, fn: CommandFn, label: string): void
```

**示例：**

```typescript
orca.commands.registerCommand(
  "myplugin.exportAsPDF",
  async () => {
    const result = await exportCurrentDocumentAsPDF()
    orca.notify("success", "Document exported as PDF successfully")
  },
  "Export as PDF"
)
```

### `orca.commands.unregisterCommand`

注销命令。

```typescript
unregisterCommand(id: string): void
```

### `orca.commands.registerEditorCommand`

注册可撤销/重做的编辑器命令。

```typescript
registerEditorCommand(
  id: string,
  doFn: EditorCommandFn,
  undoFn: CommandFn,
  opts: { label: string; hasArgs?: boolean; noFocusNeeded?: boolean }
): void
```

**示例：**

```typescript
orca.commands.registerEditorCommand(
  "myplugin.formatSelectedText",
  // Do 函数
  ([panelId, rootBlockId, cursor]) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return null

    const formattedText = formatText(selection.toString())

    return {
      ret: formattedText,
      undoArgs: { text: formattedText }
    }
  },
  // Undo 函数
  (panelId, { text }) => {
    // 恢复逻辑
  },
  {
    label: "Format Selected Text",
    hasArgs: false
  }
)
```

### `orca.commands.unregisterEditorCommand`

注销编辑器命令。

```typescript
unregisterEditorCommand(id: string): void
```

### `orca.commands.invokeCommand`

通过 ID 调用命令。

```typescript
invokeCommand(id: string, ...args: any[]): Promise<any>
```

**示例：**

```typescript
// 无参数调用命令
await orca.commands.invokeCommand("myplugin.refreshData")

// 带参数调用命令
const result = await orca.commands.invokeCommand(
  "myplugin.searchDocuments",
  "search query"
)
```

### `orca.commands.invokeEditorCommand`

调用编辑器命令。

```typescript
invokeEditorCommand(
  id: string,
  cursor: CursorData | null,
  ...args: any[]
): Promise<any>
```

### `orca.commands.invokeTopEditorCommand`

调用顶层编辑器命令。

```typescript
invokeTopEditorCommand(
  id: string,
  cursor: CursorData | null,
  ...args: any[]
): Promise<any>
```

### `orca.commands.invokeGroup`

将一组命令作为单个可撤销操作执行。

```typescript
invokeGroup(
  callback: () => Promise<void>,
  options?: {
    undoable?: boolean
    topGroup?: boolean
  }
): Promise<void>
```

**示例：**

```typescript
await orca.commands.invokeGroup(async () => {
  // 创建标题块
  const headingId = await orca.commands.invokeEditorCommand(
    "core.editor.insertBlock",
    null,
    null,
    null,
    null,
    { type: "heading", level: 1 }
  )

  // 添加内容块
  await orca.commands.invokeEditorCommand(
    "core.editor.insertBlock",
    null,
    orca.state.blocks[headingId],
    "lastChild",
    [{ t: "t", v: "This is the first paragraph." }],
    { type: "text" }
  )

  // 添加另一个内容块
  await orca.commands.invokeEditorCommand(
    "core.editor.insertBlock",
    null,
    orca.state.blocks[headingId],
    "lastChild",
    [{ t: "t", v: "This is the second paragraph." }],
    { type: "text" }
  )
})
```

### `orca.commands.registerBeforeCommand`

注册"命令前"钩子，以有条件地阻止命令执行。

```typescript
registerBeforeCommand(id: string, pred: BeforeHookPred): void
```

**示例：**

```typescript
orca.commands.registerBeforeCommand(
  "core.editor.deleteBlocks",
  (cmdId, blockIds) => {
    const hasLockedBlock = blockIds.some(id => isBlockLocked(id))

    if (hasLockedBlock) {
      orca.notify("error", "Cannot delete locked blocks")
      return false
    }

    return true
  }
)
```

### `orca.commands.unregisterBeforeCommand`

注销"命令前"钩子。

```typescript
unregisterBeforeCommand(id: string, pred: BeforeHookPred): void
```

### `orca.commands.registerAfterCommand`

注册"命令后"钩子，在命令完成后执行代码。

```typescript
registerAfterCommand(id: string, fn: AfterHook): void
```

**示例：**

```typescript
orca.commands.registerAfterCommand(
  "core.editor.deleteBlocks",
  (cmdId, blockIds) => {
    console.log(`Deleted blocks: ${blockIds.join(", ")}`)
    updateBlockCountDisplay()
  }
)
```

### `orca.commands.unregisterAfterCommand`

注销"命令后"钩子。

```typescript
unregisterAfterCommand(id: string, fn: AfterHook): void
```

### 核心命令列表

Orca 提供了丰富的核心命令，可以通过 `orca.commands.invokeCommand` 调用。以下是主要的核心命令分类：

#### 全局命令

| 命令 ID | 描述 |
|---------|------|
| `core.global.toggleWindow` | 切换应用程序窗口可见性 |
| `core.global.quickNote` | 显示窗口并在今天的日记中快速记录 |

#### 主题和 UI 命令

| 命令 ID | 描述 |
|---------|------|
| `core.toggleThemeMode` | 切换亮色/暗色主题模式 |

#### 侧边栏命令

| 命令 ID | 描述 |
|---------|------|
| `core.openSidebar` | 打开侧边栏 |
| `core.closeSidebar` | 关闭侧边栏 |
| `core.toggleSidebar` | 切换侧边栏可见性 |
| `core.sidebar.goFavorites` | 导航到侧边栏的收藏标签 |
| `core.sidebar.goTags` | 导航到侧边栏的标签标签 |
| `core.sidebar.goPages` | 导航到侧边栏的页面标签 |

#### 面板管理

| 命令 ID | 描述 |
|---------|------|
| `core.closePanel` | 关闭当前活动面板 |
| `core.closeOtherPanels` | 关闭除当前面板外的所有面板 |
| `core.switchToNextPanel` | 切换焦点到下一个面板 |
| `core.switchToPreviousPanel` | 切换焦点到上一个面板 |

#### 导航命令

| 命令 ID | 描述 | 参数 |
|---------|------|------|
| `core.goBack` | 导航回历史记录 | - |
| `core.goForward` | 导航前进到历史记录 | - |
| `core.goToday` | 转到今天的日记 | - |
| `core.goYesterday` | 转到昨天的日记 | `openAside?: boolean` |
| `core.goTomorrow` | 转到明天的日记 | `openAside?: boolean` |
| `core.openTodayInPanel` | 在新面板中打开今天的日记 | - |

#### 应用程序命令

| 命令 ID | 描述 | 参数 |
|---------|------|------|
| `core.closeWindow` | 关闭当前窗口 | - |
| `core.quitApp` | 退出应用程序 | - |
| `core.openSettings` | 打开设置面板 | - |
| `core.openSearch` | 打开全局搜索 | - |
| `core.openCommandPalette` | 打开命令面板 | - |
| `core.openWebViewModal` | 打开浏览器视图模态框 | `url?: string` |

#### 编辑器命令

| 命令 ID | 描述 |
|---------|------|
| `core.editor.toggleTOC` | 切换当前编辑器的目录 |
| `core.editor.goToReferrers` | 导航到引用者部分 |
| `core.editor.goToSameKind` | 导航到相同标签部分 |
| `core.editor.goToCandidates` | 导航到候选引用部分 |
| `core.editor.toggleFindReplace` | 切换查找和替换对话框 |
| `core.editor.undo` | 撤销最后的编辑器更改 |
| `core.editor.redo` | 重做最后的撤销操作 |
| `core.editor.goTop` | 滚动到当前编辑器的顶部 |
| `core.editor.goBottom` | 滚动到当前编辑器的底部 |
| `core.editor.createAndGoEmptyBlock` | 创建一个新的空块并导航到它 |
| `core.editor.stopAIStreaming` | 停止当前的 AI 输出流 |

#### 面板操作

| 命令 ID | 描述 | 参数 |
|---------|------|------|
| `core.panel.showRecents` | 在当前面板中显示最近的编辑器 | - |
| `core.panel.toggleLock` | 切换面板锁定 | `id?: string` |
| `core.panel.toggleWideView` | 切换面板的宽视图模式 | `id?: string` |

#### 资源管理

| 命令 ID | 描述 |
|---------|------|
| `core.assets.cleanUnused` | 清理未使用的资源 |

#### 搜索和索引

| 命令 ID | 描述 |
|---------|------|
| `core.rebuildIndex` | 重建搜索索引 |

#### S3 同步命令

| 命令 ID | 描述 | 参数 |
|---------|------|------|
| `core.s3.sync` | 执行 S3 同步 | `interruptive?: boolean`, `initial?: boolean`, `followMouse?: boolean` |

#### 布局命令

| 命令 ID | 描述 |
|---------|------|
| `core.layout._default` | 应用默认布局 |

#### 预览命令

| 命令 ID | 描述 |
|---------|------|
| `core.enableInteractivePreview` | 启用交互式预览模式 |

### 编辑器命令列表

Orca 提供了丰富的编辑器命令，用于操作块、文本和其他内容。这些命令可以通过 `orca.commands.invokeEditorCommand` 调用。

编辑器命令分为以下主要类别：

- **基础命令** - 用于操作块及其内容的基础功能
- **创建命令** - 用于创建各种类型的内容块
- **删除命令** - 用于处理块中内容的删除和修改
- **缩进/取消缩进命令** - 用于调整块的层级结构
- **合并/拆分命令** - 用于合并和拆分块
- **文本命令** - 用于文本操作
- **其他命令** - 其他各种编辑器操作

**详细文档：**

有关所有编辑器命令的完整文档，包括详细的参数说明、返回值类型和使用示例，请参阅：

**[Core Editor Commands 完整文档](./documents/Core-Editor-Commands.md)**

**示例：使用核心命令和编辑器命令**

```typescript
// 1. 使用核心命令
await orca.commands.invokeCommand("core.toggleThemeMode")
await orca.commands.invokeCommand("core.openSearch")

// 2. 使用编辑器命令
const cursor = orca.state.activePanel ? getCursorData(orca.state.activePanel) : null

// 插入新块
await orca.commands.invokeEditorCommand(
  "core.editor.insertBlock",
  cursor,
  referenceBlock,
  "after",
  [{ t: "t", v: "New block content" }],
)

// 删除块
await orca.commands.invokeEditorCommand(
  "core.editor.deleteBlocks",
  cursor,
  [blockId1, blockId2],
)

// 设置属性
await orca.commands.invokeEditorCommand(
  "core.editor.setProperties",
  cursor,
  [blockId],
  [
    { name: "status", value: "completed", type: PropType.Text },
    { name: "priority", value: 1, type: PropType.Number },
  ],
)
```

---

## 快捷键管理 (Shortcuts)

用于分配、重置和重新加载键盘快捷键。

### `orca.shortcuts.reload`

从数据库重新加载所有键盘快捷键。

```typescript
reload(): Promise<void>
```

### `orca.shortcuts.assign`

将键盘快捷键分配给命令。如果快捷键为空，则从命令中移除快捷键。

```typescript
assign(shortcut: string, command: string): Promise<void>
```

**示例：**

```typescript
// 分配快捷键
await orca.shortcuts.assign("ctrl+shift+k", "myplugin.myCommand")

// 移除快捷键
await orca.shortcuts.assign("", "myplugin.myCommand")
```

### `orca.shortcuts.reset`

将命令重置为其默认键盘快捷键。

```typescript
reset(command: string): Promise<void>
```

**示例：**

```typescript
await orca.shortcuts.reset("core.toggleThemeMode")
```

---

## 导航管理 (Navigation)

控制 Orca 的面板导航和布局。

### `orca.nav.addTo`

在现有面板旁边添加新面板。

```typescript
addTo(
  id: string,
  dir: "top" | "bottom" | "left" | "right",
  src?: Pick<ViewPanel, "view" | "viewArgs" | "viewState">
): string | null
```

**示例：**

```typescript
const newPanelId = orca.nav.addTo(orca.state.activePanel, "right")
```

### `orca.nav.move`

将面板从一个位置移动到另一个位置。

```typescript
move(
  from: string,
  to: string,
  dir: "top" | "bottom" | "left" | "right"
): void
```

**示例：**

```typescript
orca.nav.move("panel1", "panel2", "bottom")
```

### `orca.nav.close`

关闭面板。

```typescript
close(id: string): void
```

### `orca.nav.closeAllBut`

关闭除指定面板外的所有面板。

```typescript
closeAllBut(id: string): void
```

### `orca.nav.changeSizes`

从指定面板开始更改面板大小。

```typescript
changeSizes(startPanelId: string, values: number[]): void
```

### `orca.nav.switchFocusTo`

将焦点切换到指定面板。

```typescript
switchFocusTo(id: string): void
```

### `orca.nav.goBack`

导航回历史记录中的上一个面板状态。

```typescript
goBack(withRedo?: boolean): void
```

### `orca.nav.goForward`

导航前进到历史记录中的下一个面板状态。

```typescript
goForward(): void
```

### `orca.nav.goTo`

导航到指定面板或当前活动面板中的特定视图。

```typescript
goTo(
  view: PanelView,
  viewArgs?: Record<string, any>,
  panelId?: string
): void
```

**示例：**

```typescript
// 在当前面板中打开特定块
orca.nav.goTo("block", { blockId: 123 })

// 在特定面板中打开今天的日记
orca.nav.goTo("journal", { date: new Date() }, "panel1")
```

### `orca.nav.replace`

在不记录历史记录的情况下替换面板视图。

```typescript
replace(
  view: PanelView,
  viewArgs?: Record<string, any>,
  panelId?: string
): void
```

**示例：**

```typescript
// 用块视图替换活动面板
orca.nav.replace("block", { blockId: 123 })
```

### `orca.nav.openInLastPanel`

在最后使用的面板中打开视图，或根据需要创建新面板。

```typescript
openInLastPanel(view: PanelView, viewArgs?: Record<string, any>): void
```

**示例：**

```typescript
orca.nav.openInLastPanel("block", { blockId: 123 })
```

### `orca.nav.findViewPanel`

在面板结构中通过 ID 查找视图面板。

```typescript
findViewPanel(id: string, panels: RowPanel): ViewPanel | null
```

### `orca.nav.isThereMoreThanOneViewPanel`

检查是否有多个视图面板打开。

```typescript
isThereMoreThanOneViewPanel(): boolean
```

### `orca.nav.focusNext`

聚焦标签顺序中的下一个面板。

```typescript
focusNext(): void
```

### `orca.nav.focusPrev`

聚焦标签顺序中的上一个面板。

```typescript
focusPrev(): void
```

---

## 插件生命周期 (Plugin Lifecycle)

Orca 插件遵循明确的生命周期模式，理解这一模式对于正确管理插件资源至关重要。

### 入口函数

插件的入口文件需要暴露两个核心函数：

```typescript
export async function load(name: string): Promise<void> {
  // 插件加载时调用，用于初始化
}

export async function unload(): Promise<void> {
  // 插件卸载时调用，用于清理资源
}
```

**关于 `name` 参数：**

- `load` 函数接收一个字符串参数，表示插件的名称（即插件文件夹的名称）
- 参数名可以是任意的（常见命名：`name`、`pluginName`、`_name`）
- 这个名称在注册命令、渲染器等时用作前缀，避免与其他插件冲突

**最佳实践：**

```typescript
let pluginName: string

export async function load(name: string) {
  pluginName = name

  // 使用 pluginName 作为前缀注册组件
  orca.commands.registerCommand(`${pluginName}.myCommand`, fn, "My Command")
  orca.renderers.registerBlock(`${pluginName}.myBlock`, false, MyBlockRenderer)
}

export async function unload() {
  // 使用保存的 pluginName 清理注册的组件
  orca.commands.unregisterCommand(`${pluginName}.myCommand`)
  orca.renderers.unregisterBlock(`${pluginName}.myBlock`)
}
```

### 生命周期阶段

| 阶段 | 函数 | 描述 |
|------|------|------|
| 加载 | `load` | 插件被启用时调用，用于注册命令、渲染器等 |
| 卸载 | `unload` | 插件被禁用或应用关闭时调用，用于清理资源 |

### 生命周期管理最佳实践

1. **注册与注销配对**：每个注册操作都应有对应的注销操作

```typescript
export async function load(name: string) {
  // 注册命令
  orca.commands.registerCommand(`${name}.cmd`, handler, "Command")

  // 注册渲染器
  orca.renderers.registerBlock(`${name}.block`, false, BlockRenderer)

  // 注册钩子
  orca.commands.registerAfterCommand(`${name}.hook`, afterHandler)

  // 初始化状态
  initializePluginState()
}

export async function unload() {
  // 逆序清理，确保依赖关系正确解除
  orca.commands.unregisterAfterCommand(`${name}.hook`)
  orca.renderers.unregisterBlock(`${name}.block`)
  orca.commands.unregisterCommand(`${name}.cmd`)

  // 清理状态
  cleanupPluginState()
}
```

2. **使用 `invokeGroup` 处理复合操作**：将多个相关操作组合为单个可撤销操作

3. **避免内存泄漏**：在卸载时移除所有事件监听器和定时器

4. **状态持久化**：使用 `orca.plugins.setData` 和 `getData` 持久化必要状态

---

## 插件管理 (Plugins)

用于注册、启用、禁用和管理插件数据及设置。

### `orca.plugins.register`

向 Orca 注册插件。

```typescript
register(name: string): Promise<void>
```

### `orca.plugins.unregister`

从 Orca 注销插件。

```typescript
unregister(name: string): Promise<void>
```

### `orca.plugins.enable`

启用先前禁用的插件。

```typescript
enable(name: string): Promise<void>
```

### `orca.plugins.disable`

禁用插件而不注销它。

```typescript
disable(name: string): Promise<void>
```

### `orca.plugins.setSettingsSchema`

为插件设置设置架构，定义可用的设置及其在 UI 中的呈现方式。

```typescript
setSettingsSchema(name: string, schema: PluginSettingsSchema): Promise<void>
```

**示例：**

```typescript
await orca.plugins.setSettingsSchema("my-plugin", {
  apiKey: {
    label: "API Key",
    description: "Your API key for the service",
    type: "string"
  },
  enableFeature: {
    label: "Enable Feature",
    description: "Turn on advanced features",
    type: "boolean",
    defaultValue: false
  }
})
```

### `orca.plugins.setSettings`

在应用程序或仓库级别为插件设置设置。

```typescript
setSettings(
  to: "app" | "repo",
  name: string,
  settings: Record<string, any>
): Promise<void>
```

**示例：**

```typescript
// 保存应用程序级别的设置
await orca.plugins.setSettings("app", "my-plugin", {
  apiKey: "sk-123456789",
  theme: "dark"
})

// 保存仓库特定的设置
await orca.plugins.setSettings("repo", "my-plugin", {
  customTemplates: ["template1", "template2"]
})
```

### `orca.plugins.load`

加载具有给定架构和设置的插件。

```typescript
load(
  name: string,
  schema: PluginSettingsSchema,
  settings: Record<string, any>
): Promise<void>
```

### `orca.plugins.unload`

卸载插件。

```typescript
unload(name: string): Promise<void>
```

### `orca.plugins.getDataKeys`

获取插件存储的所有数据键。

```typescript
getDataKeys(name: string): Promise<string[]>
```

### `orca.plugins.getData`

检索插件存储的数据。

```typescript
getData(name: string, key: string): Promise<any>
```

**示例：**

```typescript
const userData = await orca.plugins.getData("my-plugin", "user-preferences")
console.log("User preferences:", userData)
```

### `orca.plugins.setData`

为插件存储数据。

```typescript
setData(
  name: string,
  key: string,
  value: string | number | ArrayBuffer | null
): Promise<void>
```

**示例：**

```typescript
await orca.plugins.setData(
  "my-plugin",
  "user-preferences",
  JSON.stringify({ theme: "dark", fontSize: 14 })
)
```

### `orca.plugins.removeData`

删除插件存储的特定数据。

```typescript
removeData(name: string, key: string): Promise<void>
```

### `orca.plugins.clearData`

删除插件存储的所有数据。

```typescript
clearData(name: string): Promise<void>
```

---

## 国际化 (Localization)

Orca 提供了内置的国际化支持，插件可以利用这一功能实现多语言支持。国际化系统使用键值对来管理翻译文本。

### `orca.l10n.setupL10N`

初始化插件的本地化配置。

```typescript
setupL10N(locale: string, builtinTranslations: Translations): void
```

**参数说明：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `locale` | `string` | 当前语言环境（如 "en"、"zh-CN"） |
| `builtinTranslations` | `Translations` | 包含翻译键值对的对象，键为语言代码，值为翻译映射 |

**Translations 类型定义：**

```typescript
type Translations = {
  [locale: string]: {
    [key: string]: string
  }
}
```

**示例：**

```typescript
import zhCN from "./translations/zhCN"

export async function load(pluginName: string) {
  // 初始化国际化，支持英文和中文
  orca.l10n.setupL10N(orca.state.locale, {
    "en": {
      "welcome": "Welcome to My Plugin",
      "settings": "Settings",
      "save": "Save"
    },
    "zh-CN": {
      "welcome": "欢迎使用我的插件",
      "settings": "设置",
      "save": "保存"
    }
  })

  // 使用翻译函数
  console.log(orca.l10n.t("welcome")) // 根据当前语言环境输出对应文本
}
```

### `orca.l10n.t`

获取翻译后的文本。

```typescript
t(key: string, args?: { [key: string]: string }, locale?: string): string
```

**参数说明：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `key` | `string` | 翻译键名，对应翻译文件中的键 |
| `args` | `{ [key: string]: string }` | 可选，用于替换翻译模板中的变量 |
| `locale` | `string` | 可选，指定语言环境，默认为当前语言环境 |

**返回值：** 翻译后的文本，如果找不到对应翻译则返回键名本身

**示例：**

```typescript
// 基础使用
const greeting = orca.l10n.t("welcome")
console.log(greeting) // "Welcome" 或 "欢迎"

// 带变量替换的翻译
orca.l10n.setupL10N(orca.state.locale, {
  "en": {
    "hello_user": "Hello, ${name}!",
    "items_count": "You have ${count} items"
  }
})

const message = orca.l10n.t("hello_user", { name: "John" })
console.log(message) // "Hello, John!"

const countMessage = orca.l10n.t("items_count", { count: "5" })
console.log(countMessage) // "You have 5 items"

// 指定语言环境
const zhMessage = orca.l10n.t("welcome", undefined, "zh-CN")
console.log(zhMessage) // "欢迎使用我的插件"
```

### 最佳实践

1. **使用常量定义翻译键**：避免在代码中直接使用字符串字面量作为翻译键

```typescript
// constants.ts
export const L10N_KEYS = {
  WELCOME: "welcome",
  SETTINGS: "settings",
  SAVE: "save",
  ERROR_LOADING: "error_loading",
} as const

// main.ts
console.log(orca.l10n.t(L10N_KEYS.WELCOME))
```

2. **按模块组织翻译文件**：将翻译文件按功能模块分开，便于维护

```
src/
├── l10n/
│   ├── index.ts
│   ├── constants.ts
│   └── messages/
│       ├── en.ts
│       ├── zh-CN.ts
│       └── ja.ts
```

3. **处理复数形式**：翻译键可以包含复数变体

```typescript
// 翻译文件
{
  "en": {
    "item_count_one": "You have ${count} item",
    "item_count_other": "You have ${count} items"
  }
}
```

4. **回退机制**：当指定语言没有翻译时，自动回退到默认语言

```typescript
// 设置翻译时提供默认语言
const translations = {
  "zh-CN": { ... },
  "en": { ... }
}
// 如果当前语言是 "fr"，且翻译文件中没有法语，会使用 "en" 的翻译
```

---

## 主题管理 (Themes)

用于注册、注销和管理视觉主题。

### `orca.themes.register`

向 Orca 注册主题。

```typescript
register(pluginName: string, themeName: string, themeFileName: string): void
```

**示例：**

```typescript
orca.themes.register("my-plugin", "Dark Ocean", "themes/dark-ocean.css")
```

### `orca.themes.unregister`

注销主题。

```typescript
unregister(themeName: string): void
```

### `orca.themes.injectCSSResource`

将 CSS 资源注入到应用程序中。

```typescript
injectCSSResource(url: string, role: string): void
```

**示例：**

```typescript
orca.themes.injectCSSResource("styles/my-plugin-styles.css", "my-plugin-ui")
```

### `orca.themes.removeCSSResources`

删除具有指定角色的先前注入的 CSS 资源。

```typescript
removeCSSResources(role: string): void
```

---

## 渲染器管理 (Renderers)

用于注册自定义块和内联内容渲染器。

### `orca.renderers.registerInline`

注册自定义内联内容渲染器。

```typescript
registerInline(type: string, isEditable: boolean, renderer: any): void
```

**示例：**

```typescript
import SpecialInline from "./SpecialInline"

orca.renderers.registerInline(
  "myplugin.special",
  true,
  SpecialInline
)
```

### `orca.renderers.unregisterInline`

注销先前注册的内联内容渲染器。

```typescript
unregisterInline(type: string): void
```

### `orca.renderers.registerBlock`

注册自定义块渲染器。

```typescript
registerBlock(
  type: string,
  isEditable: boolean,
  renderer: any,
  assetFields?: string[],
  useChildren: boolean = false
): void
```

**示例：**

```typescript
import DiagramBlock from "./DiagramBlock"

// 注册不带资源字段的块渲染器
orca.renderers.registerBlock(
  "myplugin.diagram",
  true,
  DiagramBlock
)

// 注册带资源字段的块渲染器
orca.renderers.registerBlock(
  "myplugin.attachment",
  true,
  AttachmentBlock,
  ["url", "thumbnailUrl"]
)

// 注册使用子元素进行自定义布局的块渲染器
orca.renderers.registerBlock(
  "myplugin.tabs",
  false,
  TabsBlock,
  undefined,
  true  // useChildren 标志
)
```

### `orca.renderers.unregisterBlock`

注销先前注册的块渲染器。

```typescript
unregisterBlock(type: string): void
```

### 自定义渲染器指南

Orca 提供了强大的自定义渲染器系统，允许你创建自定义块和内联内容渲染器。自定义渲染器是扩展 Orca 功能的重要方式。

#### 渲染器类型

Orca 支持两种类型的渲染器：

1. **块渲染器** - 用于占用自己块空间的元素，如标题、图片和表格
2. **内联渲染器** - 用于存在于文本行内的元素，如粗体、下划线和高亮

#### 渲染器与转换器的关系

每个渲染器（无论是块渲染器还是内联渲染器）都必须有一个对应的转换器来处理其内容到纯文本的转换。

- **块渲染器和转换器** - 每个块渲染器都应该有一个对应的块转换器
- **内联渲染器和转换器** - 内联渲染器需要对应的内联转换器

**详细文档：**

有关自定义渲染器的完整指南，包括详细的实现步骤、最佳实践和示例代码，请参阅：

**[Custom Renderers 完整指南](./documents/Custom-Renderers.md)**

该指南包含：

- 块渲染器的实现方法
- 内联渲染器的实现方法
- 渲染器与转换器的关系
- 注册和使用自定义渲染器
- 实用的代码示例
- 最佳实践和注意事项

**示例：创建自定义块渲染器**

```typescript
// 1. 创建块渲染器组件
const { useRef, useMemo } = window.React
const { useSnapshot } = window.Valtio
const { BlockShell, BlockChildren } = orca.components

function CustomImageBlockRenderer({
  panelId,
  blockId,
  rndId,
  blockLevel,
  indentLevel,
  mirrorId,
  initiallyCollapsed,
  renderingMode,
  src,
}: Props) {
  const { blocks } = useSnapshot(orca.state)
  const block = blocks[mirrorId ?? blockId]

  const childrenBlocks = useMemo(
    () => (
      <BlockChildren
        block={block as Block}
        panelId={panelId}
        blockLevel={blockLevel}
        indentLevel={indentLevel}
        renderingMode={renderingMode}
      />
    ),
    [block?.children],
  )

  return (
    <BlockShell
      panelId={panelId}
      blockId={blockId}
      rndId={rndId}
      mirrorId={mirrorId}
      blockLevel={blockLevel}
      indentLevel={indentLevel}
      initiallyCollapsed={initiallyCollapsed}
      renderingMode={renderingMode}
      reprClassName="myplugin-repr-image"
      contentClassName="myplugin-repr-image-content"
      contentAttrs={{ contentEditable: false }}
      contentJsx={<img src={src} />}
      childrenJsx={childrenBlocks}
    />
  )
}

// 2. 注册块渲染器
orca.renderers.registerBlock(
  "myplugin.image",
  false,
  CustomImageBlockRenderer,
  ["src"],
)

// 3. 注册对应的块转换器
orca.converters.registerBlock("plain", "myplugin.image", (block, repr) => {
  return `Image: ${repr.src}`
})

// 4. 创建自定义块类型的块
const newBlockId = await orca.commands.invokeEditorCommand(
  "core.editor.insertBlock",
  cursor,
  referenceBlock,
  "after",
  null,
  { type: "myplugin.image", src: "/path/to/image.png" },
)
```

**示例：创建自定义内联渲染器**

```typescript
// 1. 创建内联渲染器组件
const { useRef, useEffect } = window.React

function CustomMathInlineRenderer({
  blockId,
  data,
  index,
}: {
  blockId: string
  data: ContentFragment
  index: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      renderMathExpression(ref.current, data.v)
    }
  }, [data.v])

  return (
    <span ref={ref} className="orca-inline myplugin-inline-math">
      {data.v}
    </span>
  )
}

// 2. 注册内联渲染器
orca.renderers.registerInline(
  "myplugin.math",
  false,
  CustomMathInlineRenderer,
)

// 3. 注册对应的内联转换器
orca.converters.registerInline("plain", "myplugin.math", (content) => {
  return content.v.toString()
})

// 4. 使用自定义内联渲染器
const mathFragment = { t: "myplugin.math", v: "E = mc^2" }
await orca.commands.invokeEditorCommand(
  "core.editor.insertFragments",
  cursor,
  [mathFragment],
)
```

---

## 转换器 (Converters)

用于注册转换器，以便在不同格式（如 HTML、纯文本、Markdown）之间转换块和内联内容。

### `orca.converters.registerBlock`

注册块转换器，将块类型转换为特定格式。

```typescript
registerBlock(
  format: string,
  type: string,
  fn: (
    blockContent: BlockForConversion,
    repr: Repr,
    block?: Block,
    forExport?: boolean,
    context?: ConvertContext
  ) => string | Promise<string>
): void
```

**示例：**

```typescript
orca.converters.registerBlock(
  "html",
  "myplugin.countdown",
  (blockContent, repr, block, forExport, context) => {
    const date = new Date(repr.date)
    return `<div class="countdown" data-date="${date.toISOString()}">
      <span class="label">${repr.label}</span>
      <span class="date">${date.toLocaleDateString()}</span>
    </div>`
  }
)
```

### `orca.converters.registerInline`

注册内联内容转换器，将内联内容转换为特定格式。

```typescript
registerInline(
  format: string,
  type: string,
  fn: (
    content: ContentFragment,
    forExport?: boolean
  ) => string | Promise<string>
): void
```

**示例：**

```typescript
// 将自定义高亮内联内容转换为 Markdown
orca.converters.registerInline(
  "markdown",
  "myplugin.highlight",
  (content) => {
    return `==${content.v}==`
  }
)

// 将用户提及转换为 HTML
orca.converters.registerInline(
  "html",
  "myplugin.userMention",
  (content) => {
    return `<span class="user-mention" data-user-id="${content.id}">@${content.v}</span>`
  }
)
```

### `orca.converters.unregisterBlock`

注销块转换器。

```typescript
unregisterBlock(format: string, type: string): void
```

### `orca.converters.unregisterInline`

注销内联内容转换器。

```typescript
unregisterInline(format: string, type: string): void
```

### `orca.converters.blockConvert`

将块转换为特定格式。

```typescript
blockConvert(
  format: string,
  blockContent: BlockForConversion,
  repr: Repr,
  block?: Block,
  forExport?: boolean,
  context?: ConvertContext
): Promise<string>
```

### `orca.converters.inlineConvert`

将内联内容片段转换为特定格式。

```typescript
inlineConvert(
  format: string,
  type: string,
  content: ContentFragment,
  forExport?: boolean
): Promise<string>
```

---

## 广播系统 (Broadcasts)

用于在 Orca 的不同窗口之间进行应用程序范围的事件消息传递。

### `orca.broadcasts.isHandlerRegistered`

检查是否为特定广播类型注册了处理程序。

```typescript
isHandlerRegistered(type: string): boolean
```

### `orca.broadcasts.registerHandler`

为特定广播类型注册处理程序函数。

```typescript
registerHandler(type: string, handler: CommandFn): void
```

**示例：**

```typescript
orca.broadcasts.registerHandler("core.themeChanged", (theme) => {
  console.log("Theme changed to:", theme)
  updateUIForTheme(theme)
})
```

### `orca.broadcasts.unregisterHandler`

注销先前注册的特定广播类型的处理程序。

```typescript
unregisterHandler(type: string, handler: CommandFn): void
```

### `orca.broadcasts.broadcast`

向所有已注册的处理程序广播特定类型的事件。

```typescript
broadcast(type: string, ...args: any[]): void
```

**示例：**

```typescript
// 简单通知
orca.broadcasts.broadcast("myplugin.processCompleted")

// 带数据
orca.broadcasts.broadcast("myplugin.dataFetched", {
  items: dataItems,
  timestamp: Date.now()
})
```

---

## UI 组件 (Components)

Orca 提供的预构建 UI 组件，可用于插件开发。

### `orca.components.AliasEditor`

提供用于管理别名/标签的编辑器界面。

```typescript
AliasEditor: (props: {
  blockId: DbId
} & Partial<MenuProps & {
  children: (
    openMenu: (e: React.UIEvent, state?: any) => void,
    closeMenu: () => void,
  ) => ReactNode
}>) => JSX.Element | null
```

### `orca.components.Block`

渲染包含所有内容和子元素的块。

```typescript
Block: (props: {
  panelId: string
  blockId: DbId
  blockLevel: number
  indentLevel: number
  initiallyCollapsed?: boolean
  renderingMode?: BlockRenderingMode
} & React.HTMLAttributes<HTMLDivElement>) => JSX.Element | null
```

### `orca.components.BlockBreadcrumb`

渲染块的祖先面包屑轨迹。

```typescript
BlockBreadcrumb: (props: {
  blockId: DbId
  className?: string
  style?: React.CSSProperties
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本用法
<orca.components.BlockBreadcrumb blockId={123} />

// 带自定义样式
<orca.components.BlockBreadcrumb
  blockId={456}
  className="custom-breadcrumb"
  style={{ marginBottom: '10px' }}
/>
```

### `orca.components.BlockChildren`

渲染块的子元素。

```typescript
BlockChildren: (props: {
  block: Block
  panelId: string
  blockLevel: number
  indentLevel: number
  renderingMode?: BlockRenderingMode
}) => JSX.Element | null
```

**示例：**

```typescript
// 标准用法
<orca.components.BlockChildren
  block={blockObject}
  panelId="main-panel"
  blockLevel={1}
  indentLevel={1}
/>

// 使用简化渲染模式
<orca.components.BlockChildren
  block={blockObject}
  panelId="panel-2"
  blockLevel={2}
  indentLevel={3}
  renderingMode="simple"
/>
```

### `orca.components.BlockSelect`

提供块选择功能。

```typescript
BlockSelect: (
  props: {
    mode: "block" | "ref"
    scope?: string
    selected: DbId[]
    onChange?: (selected: string[]) => void | Promise<void>
  } & Omit<SelectProps, "options" | "selected" | "filter" | "filterPlaceholder" | "filterFunction" | "onChange">,
) => JSX.Element | null
```

**示例：**

```typescript
// 块选择
<orca.components.BlockSelect
  mode="block"
  selected={[123, 456]}
  onChange={async (selected) => {
    console.log("Selected blocks:", selected);
  }}
/>

// 带范围限制的引用选择
<orca.components.BlockSelect
  mode="ref"
  scope="project-blocks"
  selected={[789]}
  onChange={handleSelectionChange}
/>
```

### `orca.components.BlockShell`

块渲染的核心组件，提供标准块结构，包括手柄、折叠符号、标签和反向引用。

```typescript
BlockShell: (props: {
  panelId: string
  blockId: DbId
  rndId: string
  mirrorId?: DbId
  blockLevel: number
  indentLevel: number
  initiallyCollapsed?: boolean
  renderingMode?: BlockRenderingMode
  reprClassName?: string
  reprStyle?: React.CSSProperties
  reprAttrs?: Record<string, any>
  contentTag?: any
  contentClassName?: string
  contentStyle?: React.CSSProperties
  contentAttrs?: Record<string, any>
  contentJsx: React.ReactNode
  childrenJsx: React.ReactNode
  editable?: boolean
  droppable?: boolean
  selfFoldable?: boolean
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本文本块
<orca.components.BlockShell
  panelId="main-panel"
  blockId={123}
  rndId="unique-rand-id"
  blockLevel={0}
  indentLevel={0}
  reprClassName="orca-repr-text"
  contentJsx={<div>This is text content</div>}
  childrenJsx={<ChildrenComponent />}
/>

// 代码块示例
<orca.components.BlockShell
  panelId="code-panel"
  blockId={456}
  rndId="code-rand-id"
  blockLevel={1}
  indentLevel={2}
  reprClassName="orca-repr-code"
  contentClassName="orca-repr-code-content"
  contentAttrs={{ contentEditable: false }}
  contentJsx={<CodeEditor />}
  childrenJsx={childrenBlocks}
/>
```

### `orca.components.BlockPreviewPopup`

悬停时显示块预览的弹出窗口。

```typescript
BlockPreviewPopup: (
  props: {
    blockId: DbId
    delay?: number
    refElement?: React.RefObject<HTMLElement>
    visible?: boolean
    onClose?: () => void
    onClosed?: () => void
    className?: string
    style?: React.CSSProperties
    children?: React.ReactElement
  } & React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 链接悬停时的基本块预览
<BlockPreviewPopup blockId={123}>
  <a href="#block-123">Block Reference</a>
</BlockPreviewPopup>

// 带自定义延迟和事件处理程序
<BlockPreviewPopup
  blockId={456}
  delay={500}
  onClose={() => console.log("Preview closed")}
  className="custom-preview"
>
  <span>Hover me for block preview</span>
</BlockPreviewPopup>

// 以编程方式控制可见性
<BlockPreviewPopup
  blockId={789}
  visible={isPreviewOpen}
  onClosed={() => setPreviewOpen(false)}
>
  <button>Show Preview</button>
</BlockPreviewPopup>
```

### `orca.components.Breadcrumb`

渲染通用面包屑导航。

```typescript
Breadcrumb: (props: {
  items: React.ReactNode[]
  className?: string
  style?: React.CSSProperties
}) => JSX.Element | null
```

**示例：**

```typescript
// 简单面包屑
<orca.components.Breadcrumb
  items={["Home", "Projects", "Document"]}
/>

// 带链接和图标的面包屑
<orca.components.Breadcrumb
  items={[
    <a href="#home">Home <i className="ti ti-home" /></a>,
    <a href="#projects">Projects</a>,
    "Current Document"
  ]}
  className="custom-breadcrumb"
/>
```

### `orca.components.Button`

按钮组件，支持多种变体。

```typescript
Button: (
  props: React.HTMLAttributes<HTMLButtonElement> & {
    variant: "solid" | "soft" | "dangerous" | "outline" | "plain"
  },
) => JSX.Element | null
```

**示例：**

```typescript
// 基本按钮
<orca.components.Button variant="solid" onClick={handleClick}>
  Save
</orca.components.Button>

// 危险操作按钮
<orca.components.Button variant="dangerous" onClick={handleDelete}>
  <i className="ti ti-trash" /> Delete
</orca.components.Button>

// 禁用状态的轮廓按钮
<orca.components.Button variant="outline" disabled={true}>
  Edit
</orca.components.Button>

// 简单图标按钮
<orca.components.Button variant="plain" onClick={handleRefresh}>
  <i className="ti ti-refresh" />
</orca.components.Button>
```

### `orca.components.Checkbox`

复选框表单元素。

```typescript
Checkbox: (
  props: {
    checked?: boolean
    indeterminate?: boolean
    disabled?: boolean
    onChange?: (e: { checked: boolean }) => void | Promise<void>
  } & Omit<React.HTMLAttributes<HTMLSpanElement>, "onChange">,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本复选框
<orca.components.Checkbox
  checked={isChecked}
  onChange={({ checked }) => setIsChecked(checked)}
/>

// 禁用复选框
<orca.components.Checkbox checked={true} disabled={true} />

// 不确定状态复选框
<orca.components.Checkbox
  indeterminate={true}
  onChange={handleSelectionChange}
/>
```

### `orca.components.CompositionInput`

正确处理 IME 组合事件的输入框。

```typescript
CompositionInput: (
  props: React.HTMLAttributes<HTMLInputElement> & {
    pre?: React.ReactElement
    post?: React.ReactElement
    error?: React.ReactNode
  },
) => JSX.Element | null
```

**示例：**

```typescript
// 基本输入框
<orca.components.CompositionInput
  placeholder="Enter text"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
/>

// 带前缀和后缀的输入框
<orca.components.CompositionInput
  pre={<i className="ti ti-search" />}
  post={<Button onClick={clearInput}>Clear</Button>}
  placeholder="Search..."
/>

// 带验证错误的输入框
<orca.components.CompositionInput
  value={email}
  onChange={handleEmailChange}
  error={emailError ? <span className="error">{emailError}</span> : null}
/>
```

### `orca.components.CompositionTextArea`

正确处理 IME 组合事件的文本域。

```typescript
CompositionTextArea: (
  props: React.HTMLAttributes<HTMLTextAreaElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本多行文本输入
<orca.components.CompositionTextArea
  placeholder="Enter multiline text"
  value={textValue}
  onChange={(e) => setTextValue(e.target.value)}
/>

// 设置行数和自动增长
<orca.components.CompositionTextArea
  rows={5}
  style={{ minHeight: '100px' }}
  placeholder="Enter notes..."
/>
```

### `orca.components.ConfirmBox`

显示确认对话框。

```typescript
ConfirmBox: (
  props: {
    text: string
    onConfirm: (
      e: React.UIEvent,
      close: () => void,
      state?: any,
    ) => void | Promise<void>
    children: (
      openMenu: (e: React.UIEvent, state?: any) => void,
      closeMenu: () => void,
    ) => ReactNode
  } & Partial<MenuProps>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本确认对话框
<orca.components.ConfirmBox
  text="Are you sure you want to delete this item?"
  onConfirm={(e, close) => {
    deleteItem();
    close();
  }}
>
  {(open) => (
    <orca.components.Button variant="dangerous" onClick={open}>
      Delete
    </orca.components.Button>
  )}
</orca.components.ConfirmBox>

// 带状态的确认对话框
<orca.components.ConfirmBox
  text="Are you sure you want to move this block?"
  onConfirm={(e, close, state) => {
    moveBlock(state.blockId, state.destination);
    close();
  }}
>
  {(open) => (
    <orca.components.Button
      variant="soft"
      onClick={(e) => open(e, { blockId: 123, destination: 'section-1' })}
    >
      Move
    </orca.components.Button>
  )}
</orca.components.ConfirmBox>
```

### `orca.components.ContextMenu`

创建附加到元素的上下文菜单。

```typescript
ContextMenu: (props: {
  className?: string
  style?: React.CSSProperties
  menu: (close: () => void, state?: any) => React.ReactNode
  children: (
    openMenu: (e: React.UIEvent, state?: any) => void,
    closeMenu: () => void,
  ) => React.ReactNode
  container?: React.RefObject<HTMLElement>
  alignment?: "left" | "top" | "center" | "bottom" | "right"
  placement?: "vertical" | "horizontal"
  defaultPlacement?: "top" | "bottom" | "left" | "right"
  allowBeyondContainer?: boolean
  noPointerLogic?: boolean
  keyboardNav?: boolean
  navDirection?: "vertical" | "both"
  menuAttr?: Record<string, any>
  offset?: number
  crossOffset?: number
  escapeToClose?: boolean
  onOpened?: () => void
  onClosed?: () => void
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本上下文菜单
<orca.components.ContextMenu
  menu={(close) => (
    <orca.components.Menu>
      <orca.components.MenuText
        title="Edit"
        onClick={() => { editItem(); close(); }}
      />
      <orca.components.MenuText
        title="Delete"
        dangerous={true}
        onClick={() => { deleteItem(); close(); }}
      />
    </orca.components.Menu>
  )}
>
  {(open) => (
    <div onContextMenu={open}>Right-click here to show the menu</div>
  )}
</orca.components.ContextMenu>

// 自定义位置和对齐的菜单
<orca.components.ContextMenu
  placement="horizontal"
  alignment="top"
  defaultPlacement="right"
  menu={(close) => (
    <orca.components.Menu>
      <orca.components.MenuText title="Option 1" onClick={close} />
      <orca.components.MenuText title="Option 2" onClick={close} />
    </orca.components.Menu>
  )}
>
  {(open) => (
    <orca.components.Button variant="soft" onClick={open}>
      Show Menu
    </orca.components.Button>
  )}
</orca.components.ContextMenu>
```

### `orca.components.DatePicker`

日历日期选择器。

```typescript
DatePicker: (props: {
  mode?: "date" | "time" | "datetime"
  range?: boolean
  value: Date | [Date, Date]
  onChange: (v: Date | [Date, Date]) => void | Promise<void>
  alignment?: "left" | "center" | "right"
  menuContainer?: React.RefObject<HTMLElement>
  visible?: boolean
  refElement?: React.RefObject<HTMLElement>
  rect?: DOMRect
  onClose?: () => void | Promise<void>
  onClosed?: () => void | Promise<void>
  className?: string
  style?: React.CSSProperties
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本日期选择器
const [date, setDate] = useState(new Date());
<orca.components.DatePicker
  value={date}
  onChange={(newDate) => setDate(newDate)}
/>

// 日期时间选择器
<orca.components.DatePicker
  mode="datetime"
  value={dateTime}
  onChange={handleDateTimeChange}
/>

// 日期范围选择器
const [dateRange, setDateRange] = useState([new Date(), new Date(Date.now() + 86400000)]);
<orca.components.DatePicker
  range={true}
  value={dateRange}
  onChange={(newRange) => setDateRange(newRange)}
/>
```

### `orca.components.HoverContextMenu`

悬停时显示的上下文菜单。

```typescript
HoverContextMenu: (
  props: {
    children: React.ReactElement
  } & Omit<ContextMenuProps, "children">,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本悬停菜单
<orca.components.HoverContextMenu
  menu={(close) => (
    <orca.components.Menu>
      <orca.components.MenuText
        title="View"
        preIcon="ti ti-eye"
        onClick={close}
      />
      <orca.components.MenuText
        title="Edit"
        preIcon="ti ti-pencil"
        onClick={close}
      />
    </orca.components.Menu>
  )}
>
  <div className="hoverable-element">Hover to show menu</div>
</orca.components.HoverContextMenu>
```

### `orca.components.Image`

带加载状态的图片组件。

```typescript
Image: (props: React.HTMLAttributes<HTMLImageElement>) => JSX.Element | null
```

**示例：**

```typescript
// 基本图片
<orca.components.Image
  src="/path/to/image.jpg"
  alt="Description"
/>

// 带样式的图片
<orca.components.Image
  src="/path/to/image.png"
  alt="Logo"
  className="profile-image"
  style={{ width: 100, height: 100, borderRadius: '50%' }}
/>

// 处理加载事件
<orca.components.Image
  src="/path/to/large-image.jpg"
  alt="Large Image"
  onLoad={() => setImageLoaded(true)}
  onError={() => handleImageError()}
/>
```

### `orca.components.Input`

标准文本输入组件。

```typescript
Input: (
  props: React.HTMLAttributes<HTMLInputElement> & {
    pre?: React.ReactElement
    post?: React.ReactElement
    error?: React.ReactNode
  },
) => JSX.Element | null
```

**示例：**

```typescript
// 基本输入字段
<orca.components.Input
  placeholder="Enter text"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
/>

// 带前缀和后缀的输入字段
<orca.components.Input
  pre={<i className="ti ti-user" />}
  post={<orca.components.Button variant="plain">Clear</orca.components.Button>}
  placeholder="Username"
/>

// 带错误消息的输入字段
<orca.components.Input
  value={email}
  onChange={handleEmailChange}
  error={emailError ? "Please enter a valid email address" : undefined}
/>
```

### `orca.components.InputBox`

带标签和操作的输入对话框。

```typescript
InputBox: (
  props: {
    label: string
    onConfirm: (
      value: string | undefined,
      e: React.UIEvent,
      close: () => void,
    ) => void | Promise<void>
    defaultValue?: string
    error?: React.ReactNode
    children: (
      openMenu: (e: React.UIEvent, state?: any) => void,
      closeMenu: () => void,
    ) => ReactNode
  } & Partial<MenuProps>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本输入对话框
<orca.components.InputBox
  label="Enter name"
  defaultValue="Default value"
  onConfirm={(value, e, close) => {
    if (value) {
      saveName(value);
      close();
    }
  }}
>
  {(open) => (
    <orca.components.Button variant="soft" onClick={open}>
      Edit Name
    </orca.components.Button>
  )}
</orca.components.InputBox>

// 带验证的输入对话框
<orca.components.InputBox
  label="Enter URL"
  error={urlError}
  onConfirm={(url, e, close) => {
    if (isValidUrl(url)) {
      addUrl(url);
      close();
    } else {
      setUrlError("Please enter a valid URL");
    }
  }}
>
  {(open) => (
    <orca.components.Button variant="outline" onClick={open}>
      Add Link
    </orca.components.Button>
  )}
</orca.components.InputBox>
```

### `orca.components.LoadMore`

分页列表中加载更多项的组件。

```typescript
LoadMore: (
  props: {
    message?: string
    onLoadMore: () => void | Promise<void>
    debounceTime?: number
  } & React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本 Load More 组件
<orca.components.LoadMore
  onLoadMore={async () => {
    await fetchMoreItems();
  }}
/>

// 自定义消息和防抖时间
<orca.components.LoadMore
  message="Loading more results..."
  debounceTime={500}
  onLoadMore={loadMoreResults}
  className="custom-load-more"
/>
```

### `orca.components.MemoizedViews`

用于切换组件的高效视图容器。

```typescript
MemoizedViews: (props: {
  name: string
  active: string
  views: { [key: string]: React.ReactElement | null }
  orientation?: "horizontal" | "vertical"
  className?: string
  style?: React.CSSProperties
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本视图切换容器
<orca.components.MemoizedViews
  name="main-views"
  active="details"
  views={{
    "list": <ListView items={items} />,
    "details": <DetailsView itemId={123} />,
    "settings": <SettingsView />
  }}
/>

// 水平排列的视图
<orca.components.MemoizedViews
  name="side-views"
  active={currentTab}
  orientation="horizontal"
  className="side-panel"
  views={{
    "info": <InfoPanel />,
    "history": <HistoryPanel />,
    "comments": <CommentsPanel />
  }}
/>
```

### `orca.components.Menu`

标准菜单容器。

```typescript
Menu: (
  props: {
    children?: React.ReactNode
    keyboardNav?: boolean
    navDirection?: "vertical" | "both"
    onKeyboardNav?: (el: HTMLElement) => void | Promise<void>
    refocus?: boolean
    container?: React.RefObject<HTMLElement>
  } & React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本菜单
<orca.components.Menu>
  <orca.components.MenuText title="Option 1" onClick={() => handleOption(1)} />
  <orca.components.MenuText title="Option 2" onClick={() => handleOption(2)} />
  <orca.components.MenuSeparator />
  <orca.components.MenuText
    title="Exit"
    dangerous={true}
    onClick={() => handleExit(0)}
  />
</orca.components.Menu>

// 启用键盘导航的菜单
<orca.components.Menu
  keyboardNav={true}
  navDirection="both"
  onKeyboardNav={(el) => scrollToElement(el)}
  className="keyboard-nav-menu"
>
  <orca.components.MenuTitle title="Actions" />
  <orca.components.MenuText title="Edit" onClick={() => handleEdit(123)} />
  <orca.components.MenuText title="Copy" onClick={() => handleCopy(456)} />
  <orca.components.MenuText title="Delete" onClick={() => handleDelete(789)} />
</orca.components.Menu>
```

### `orca.components.MenuItem`

菜单项组件。

```typescript
MenuItem: (
  props: {
    jsx: React.ReactElement
    children?: React.ReactElement
    onClick?: (e: React.MouseEvent) => void | Promise<void>
    className?: string
    style?: React.CSSProperties
  } & React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本菜单项
<orca.components.MenuItem
  jsx={<div>Option 1</div>}
  onClick={() => handleOption(1)}
/>

// 带嵌套内容的菜单项
<orca.components.MenuItem
  jsx={<div className="menu-item-header">Display Settings</div>}
  onClick={() => handleSettingsClick(123)}
>
  <div className="submenu">
    <div>Theme: {currentTheme}</div>
    <div>Font Size: {fontSize}</div>
  </div>
</orca.components.MenuItem>
```

### `orca.components.MenuSeparator`

菜单的视觉分隔符。

```typescript
MenuSeparator: (props: {}) => JSX.Element | null
```

**示例：**

```typescript
<orca.components.Menu>
  <orca.components.MenuText title="Edit" onClick={() => handleEdit(123)} />
  <orca.components.MenuText title="Copy" onClick={() => handleCopy(456)} />
  <orca.components.MenuSeparator />
  <orca.components.MenuText
    title="Delete"
    dangerous={true}
    onClick={() => handleDelete(789)}
  />
</orca.components.Menu>
```

### `orca.components.MenuTitle`

菜单标题组件。

```typescript
MenuTitle: (props: { title: string }) => JSX.Element | null
```

**示例：**

```typescript
<orca.components.Menu>
  <orca.components.MenuTitle title="Actions" />
  <orca.components.MenuText title="Edit" onClick={() => handleEdit(123)} />
  <orca.components.MenuText title="Copy" onClick={() => handleCopy(456)} />
</orca.components.Menu>
```

### `orca.components.MenuText`

基于文本的菜单项。

```typescript
MenuText: (props: {
  title: string
  preIcon?: string
  postIcon?: string
  shortcut?: string
  dangerous?: boolean
  onClick?: (e: React.MouseEvent) => void | Promise<void>
  className?: string
  style?: React.CSSProperties
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本文本菜单项
<orca.components.MenuText
  title="Save Document"
  onClick={handleSave}
/>

// 带图标和快捷键的菜单项
<orca.components.MenuText
  title="Copy"
  preIcon="ti ti-copy"
  shortcut="⌘C"
  onClick={handleCopy}
/>

// 危险操作菜单项
<orca.components.MenuText
  title="Delete"
  preIcon="ti ti-trash"
  dangerous={true}
  onClick={handleDelete}
/>
```

### `orca.components.ModalOverlay`

模态叠加层组件。

```typescript
ModalOverlay: (props: {
  className?: string
  style?: React.CSSProperties
  blurred?: boolean
  visible: boolean
  canClose?: boolean
  onClose?: () => void | Promise<void>
  onClosed?: () => void
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) => JSX.Element | null
```

**示例：**

```typescript
// 基本模态窗口
<orca.components.ModalOverlay
  visible={isModalOpen}
  onClose={() => setIsModalOpen(false)}
>
  <div className="modal-content">
    <h2>Modal Title</h2>
    <p>Modal content goes here...</p>
    <orca.components.Button onClick={() => setIsModalOpen(false)}>
      Close
    </orca.components.Button>
  </div>
</orca.components.ModalOverlay>

// 带模糊背景的模态窗口
<orca.components.ModalOverlay
  visible={isImportant}
  blurred={true}
  canClose={false}
  className="important-modal"
>
  <div className="confirmation-dialog">
    <h3>Important Action Confirmation</h3>
    <p>Are you sure you want to proceed? This action cannot be undone.</p>
    <div className="actions">
      <orca.components.Button variant="outline" onClick={handleCancel}>
        Cancel
      </orca.components.Button>
      <orca.components.Button variant="dangerous" onClick={handleConfirm}>
        Confirm
      </orca.components.Button>
    </div>
  </div>
</orca.components.ModalOverlay>
```

### `orca.components.Popup`

附加到元素的弹出面板。

```typescript
Popup: (props: {
  container?: React.RefObject<HTMLElement>
  boundary?: React.RefObject<HTMLElement>
  boundaryTopOffset?: number
  boundaryBottomOffset?: number
  boundaryLeftOffset?: number
  boundaryRightOffset?: number
  refElement?: React.RefObject<HTMLElement>
  rect?: DOMRect
  relativePosition?: {
    top?: string
    left?: string
    bottom?: string
    right?: string
  }
  visible: boolean
  onClose?: () => void | Promise<void>
  onClosed?: () => void
  noPointerLogic?: boolean
  children?: React.ReactElement
  placement?: "vertical" | "horizontal"
  defaultPlacement?: "top" | "bottom" | "left" | "right"
  alignment?: "left" | "top" | "center" | "bottom" | "right"
  allowBeyondContainer?: boolean
  escapeToClose?: boolean
  className?: string
  style?: React.CSSProperties
  offset?: number
  crossOffset?: number
  replacement?: boolean
} & React.HTMLAttributes<HTMLDivElement>) => JSX.Element | null
```

**示例：**

```typescript
// 基本弹出面板
const [isVisible, setIsVisible] = useState(false);
const buttonRef = useRef(null);

<orca.components.Button
  ref={buttonRef}
  onClick={() => setIsVisible(true)}
>
  Show Popup
</orca.components.Button>

<orca.components.Popup
  refElement={buttonRef}
  visible={isVisible}
  onClose={() => setIsVisible(false)}
>
  <div className="popup-content">
    <p>This is the popup content</p>
  </div>
</orca.components.Popup>

// 自定义定位和对齐的弹出面板
<orca.components.Popup
  refElement={anchorRef}
  visible={showPopup}
  placement="horizontal"
  defaultPlacement="right"
  alignment="center"
  offset={10}
  onClose={closePopup}
  className="custom-popup"
>
  <div className="info-card">
    <h3>Details</h3>
    <p>Here is more detailed content...</p>
  </div>
</orca.components.Popup>
```

### `orca.components.Segmented`

用于从选项中进行选择的分段控件。

```typescript
Segmented: (
  props: {
    selected: string
    options: { label?: string; value: string; jsx?: React.ReactElement }[]
    onChange: (value: string) => void | Promise<void>
    className?: string
    style?: React.CSSProperties
  } & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本分段控件
const [selected, setSelected] = useState("list");
<orca.components.Segmented
  selected={selected}
  options={[
    { value: "list", label: "List" },
    { value: "grid", label: "Grid" },
    { value: "table", label: "Table" }
  ]}
  onChange={(value) => setSelected(value)}
/>

// 带自定义 JSX 的分段控件
<orca.components.Segmented
  selected={viewMode}
  options={[
    { value: "day", jsx: <i className="ti ti-calendar-day" /> },
    { value: "week", jsx: <i className="ti ti-calendar-week" /> },
    { value: "month", jsx: <i className="ti ti-calendar-month" /> }
  ]}
  onChange={setViewMode}
  className="calendar-mode-selector"
/>
```

### `orca.components.Select`

下拉选择组件。

```typescript
Select: (props: {
  selected: string[]
  options: { value: string; label: string; group?: string }[]
  onChange?: (
    selected: string[],
    filterKeyword?: string,
  ) => void | Promise<void>
  menuContainer?: React.RefObject<HTMLElement>
  width?: number | string
  placeholder?: string
  multiSelection?: boolean
  withClear?: boolean
  filter?: boolean
  filterPlaceholder?: string
  filterFunction?: (
    keyword: string,
  ) => Promise<{ value: string; label: string; group?: string }[]>
  alignment?: "left" | "center" | "right"
  pre?: React.ReactElement
  buttonClassName?: string
  menuClassName?: string
  disabled?: boolean
  readOnly?: boolean
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本下拉选择器
const [selected, setSelected] = useState(["option1"]);
<orca.components.Select
  selected={selected}
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" }
  ]}
  onChange={(newSelected) => setSelected(newSelected)}
/>

// 带过滤的多选下拉选择器
<orca.components.Select
  selected={selectedTags}
  options={availableTags}
  multiSelection={true}
  filter={true}
  filterPlaceholder="Search tags..."
  placeholder="Select tags"
  onChange={handleTagsChange}
/>

// 分组下拉选择器
<orca.components.Select
  selected={[selectedLanguage]}
  options={[
    { value: "js", label: "JavaScript", group: "Frontend" },
    { value: "ts", label: "TypeScript", group: "Frontend" },
    { value: "py", label: "Python", group: "Backend" },
    { value: "go", label: "Golang", group: "Backend" }
  ]}
  pre={<i className="ti ti-code" />}
  alignment="left"
  width="200px"
  onChange={(selected) => setSelectedLanguage(selected[0])}
/>
```

### `orca.components.Skeleton`

加载占位符。

```typescript
Skeleton: (props: {}) => JSX.Element | null
```

**示例：**

```typescript
// 基本加载占位符
<div className="loading-container">
  <orca.components.Skeleton />
</div>

// 内容加载期间的布局
<div className="content-card">
  <div className="header">
    {isLoading ? <orca.components.Skeleton /> : <h2>{title}</h2>}
  </div>
  <div className="body">
    {isLoading ? (
      <>
        <orca.components.Skeleton />
        <orca.components.Skeleton />
        <orca.components.Skeleton />
      </>
    ) : (
      <p>{content}</p>
    )}
  </div>
</div>
```

### `orca.components.Switch`

切换开关组件。

```typescript
Switch: (
  props: {
    on?: boolean
    unset?: boolean
    onChange?: (on: boolean) => void | Promise<void>
    readonly?: boolean
  } & Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange">,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本开关
const [isOn, setIsOn] = useState(false);
<orca.components.Switch
  on={isOn}
  onChange={(newValue) => setIsOn(newValue)}
/>

// 只读开关
<orca.components.Switch
  on={featureEnabled}
  readonly={true}
/>

// 未设置状态开关
<orca.components.Switch
  unset={true}
  onChange={handleInheritedSetting}
/>

// 带标签的开关
<div className="setting-row">
  <label>Enable Notifications</label>
  <orca.components.Switch
    on={notificationsEnabled}
    onChange={toggleNotifications}
  />
</div>
```

### `orca.components.Table`

数据表组件。

```typescript
Table: (
  props: {
    columns: { name: string; icon?: string }[]
    items: { _type: string; [key: string]: any }[]
    rowRenderer: (
      item: { _type: string; [key: string]: any },
      className: string,
      index: number,
    ) => React.ReactNode
    initialColumnSizes: string
    pinColumn?: boolean
    onColumnResize?: (value: string) => void | Promise<void>
  } & React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本数据表
<orca.components.Table
  columns={[
    { name: "Name", icon: "ti ti-file" },
    { name: "Size", icon: "ti ti-ruler" },
    { name: "Modified Date", icon: "ti ti-calendar" }
  ]}
  items={files}
  initialColumnSizes="2fr 1fr 1fr"
  rowRenderer={(item, className, index) => (
    <tr key={item.id} className={className}>
      <td>{item.name}</td>
      <td>{item.size}</td>
      <td>{item.modifiedDate}</td>
    </tr>
  )}
/>

// 带固定列和可调整列大小的表
<orca.components.Table
  columns={[
    { name: "ID" },
    { name: "Product Name" },
    { name: "Price" },
    { name: "Stock" }
  ]}
  items={products}
  initialColumnSizes="80px 2fr 1fr 1fr"
  pinColumn={true}
  onColumnResize={handleColumnResize}
  className="products-table"
  rowRenderer={(product, className, index) => (
    <tr key={product.id} className={className} onClick={() => selectProduct(product.id)}>
      <td>{product.id}</td>
      <td>{product.name}</td>
      <td>{formatCurrency(product.price)}</td>
      <td>{product.stock}</td>
    </tr>
  )}
/>
```

### `orca.components.TagPopup`

提供用于标签选择和创建的弹出菜单。

```typescript
TagPopup: (
  props: {
    blockId: DbId
    closeMenu: () => void
    onTagClick: (alias: string) => void | Promise<void>
    placeholder?: string
    children: (
      openMenu: (e: React.UIEvent, state?: any) => void,
      closeMenu: () => void,
    ) => ReactNode
  } & Partial<MenuProps>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本用法
<orca.components.TagPopup
  blockId={123}
  closeMenu={() => setMenuVisible(false)}
  onTagClick={(tag) => console.log(`Selected tag: ${tag}`)}
>
  {(open) => (
    <orca.components.Button variant="outline" onClick={open}>
      Add Tag
    </orca.components.Button>
  )}
</orca.components.TagPopup>

// 自定义占位符文本
<orca.components.TagPopup
  blockId={456}
  closeMenu={handleClose}
  onTagClick={handleTagSelect}
  placeholder="Search or create a new tag..."
  container={containerRef}
>
  {(open) => (
    <span onClick={open}>Manage Tags</span>
  )}
</orca.components.TagPopup>
```

### `orca.components.TagPropsEditor`

提供用于管理和配置标签属性的编辑器界面。

```typescript
TagPropsEditor: (
  props: {
    blockId: DbId
    children: (
      openMenu: (e: React.UIEvent, state?: any) => void,
      closeMenu: () => void,
    ) => ReactNode
  } & Partial<MenuProps>,
) => JSX.Element | null
```

**示例：**

```typescript
// 基本用法
<orca.components.TagPropsEditor
  blockId={123}
>
  {(open) => (
    <orca.components.Button variant="outline" onClick={open}>
      Edit Tag Properties
    </orca.components.Button>
  )}
</orca.components.TagPropsEditor>

// 带自定义容器
<orca.components.TagPropsEditor
  blockId={456}
  container={containerRef}
>
  {(open) => (
    <span onClick={open}>Configure Properties</span>
  )}
</orca.components.TagPropsEditor>
```

### `orca.components.Tooltip`

工具提示组件。

```typescript
Tooltip: (props: {
  text: React.ReactNode
  shortcut?: string
  image?: string
  children: React.ReactElement
  placement?: "vertical" | "horizontal"
  alignment?: "left" | "top" | "center" | "bottom" | "right"
  defaultPlacement?: "top" | "bottom" | "left" | "right"
  allowBeyondContainer?: boolean
  modifier?: "shift" | "ctrl" | "alt" | "meta"
  delay?: number
  [key: string]: any
}) => JSX.Element | null
```

**示例：**

```typescript
// 基本文本工具提示
<orca.components.Tooltip text="Delete this item">
  <button><i className="ti ti-trash" /></button>
</orca.components.Tooltip>

// 带快捷键的工具提示
<orca.components.Tooltip
  text="Save document"
  shortcut="⌘S"
  defaultPlacement="bottom"
>
  <orca.components.Button variant="solid">
    <i className="ti ti-device-floppy" />
  </orca.components.Button>
</orca.components.Tooltip>

// 带图片预览的工具提示
<orca.components.Tooltip
  text="View original image"
  image="/path/to/preview.jpg"
  placement="horizontal"
  alignment="top"
  delay={500}
>
  <div className="thumbnail">
    <img src="/path/to/thumbnail.jpg" alt="Thumbnail" />
  </div>
</orca.components.Tooltip>
```

---

## 顶部栏 (Headbar)

用于在应用程序的顶部栏中注册自定义按钮。

### `orca.headbar.registerHeadbarButton`

在 Orca 顶部栏中注册自定义按钮。

```typescript
registerHeadbarButton(id: string, render: () => React.ReactElement): void
```

**示例：**

```typescript
orca.headbar.registerHeadbarButton("myplugin.settingsButton", () => (
  <orca.components.Button
    variant="plain"
    onClick={() => orca.commands.invokeCommand("myplugin.openSettings")}
  >
    <i className="ti ti-settings-filled" />
  </orca.components.Button>
))
```

### `orca.headbar.unregisterHeadbarButton`

注销先前注册的顶部栏按钮。

```typescript
unregisterHeadbarButton(id: string): void
```

---

## 工具栏 (Toolbar)

用于在块编辑器工具栏中注册自定义按钮。

### `orca.toolbar.registerToolbarButton`

注册工具栏按钮或按钮组。

```typescript
registerToolbarButton(
  id: string,
  button: ToolbarButton | ToolbarButton[]
): void
```

**示例：**

```typescript
// 注册带有命令的单个按钮
orca.toolbar.registerToolbarButton("myplugin.formatButton", {
  icon: "ti ti-wand",
  tooltip: "Format text",
  command: "myplugin.formatText"
})

// 注册带有下拉菜单的按钮
const MenuText = orca.components.MenuText
orca.toolbar.registerToolbarButton("myplugin.insertButton", {
  icon: "ti ti-plus",
  tooltip: "Insert special content",
  menu: (close) => (
    <>
      <MenuText
        title="Insert Table"
        onClick={() => {
          close()
          orca.commands.invokeCommand("myplugin.insertTable")
        }}
      />
      <MenuText
        title="Insert Chart"
        onClick={() => {
          close()
          orca.commands.invokeCommand("myplugin.insertChart")
        }}
      />
    </>
  )
})

// 注册一组相关按钮
orca.toolbar.registerToolbarButton("myplugin.formattingTools", [
  {
    icon: "ti ti-bold",
    tooltip: "Bold",
    command: "myplugin.makeBold"
  },
  {
    icon: "ti ti-italic",
    tooltip: "Italic",
    command: "myplugin.makeItalic"
  }
])
```

### `orca.toolbar.unregisterToolbarButton`

注销先前注册的工具栏按钮或按钮组。

```typescript
unregisterToolbarButton(id: string): void
```

---

## 斜杠命令 (Slash Commands)

用于注册自定义命令，当用户在编辑器中输入 `/` 时，这些命令会出现。

### `orca.slashCommands.registerSlashCommand`

注册将在斜杠命令菜单中显示的斜杠命令。

```typescript
registerSlashCommand(id: string, command: SlashCommand): void
```

**示例：**

```typescript
orca.slashCommands.registerSlashCommand("myplugin.insertChart", {
  icon: "ti ti-chart-bar",
  group: "Insert",
  title: "Insert Chart",
  command: "myplugin.insertChartCommand"
})
```

### `orca.slashCommands.unregisterSlashCommand`

注销先前注册的斜杠命令。

```typescript
unregisterSlashCommand(id: string): void
```

---

## 块菜单命令 (Block Menu Commands)

用于向块上下文菜单添加自定义命令。

### `orca.blockMenuCommands.registerBlockMenuCommand`

在块上下文菜单中注册自定义命令。

```typescript
registerBlockMenuCommand(id: string, command: BlockMenuCommand): void
```

**示例：**

```typescript
// 适用于单个块选择的命令
orca.blockMenuCommands.registerBlockMenuCommand("myplugin.exportBlock", {
  worksOnMultipleBlocks: false,
  render: (blockId, rootBlockId, close) => (
    <orca.components.MenuText
      preIcon="ti ti-file-export"
      title="Export as JSON"
      onClick={() => {
        close()
        exportBlockAsJson(blockId)
      }}
    />
  )
})

// 适用于多个选定块的命令
orca.blockMenuCommands.registerBlockMenuCommand("myplugin.mergeBlocks", {
  worksOnMultipleBlocks: true,
  render: (blockIds, rootBlockId, close) => (
    <orca.components.MenuText
      preIcon="ti ti-combine"
      title={`Merge ${blockIds.length} Blocks`}
      onClick={() => {
        close()
        mergeSelectedBlocks(blockIds)
      }}
    />
  )
})
```

### `orca.blockMenuCommands.unregisterBlockMenuCommand`

注销先前注册的块菜单命令。

```typescript
unregisterBlockMenuCommand(id: string): void
```

---

## 标签菜单命令 (Tag Menu Commands)

用于向标签上下文菜单添加自定义命令。

### `orca.tagMenuCommands.registerTagMenuCommand`

在标签上下文菜单中注册自定义命令。

```typescript
registerTagMenuCommand(id: string, command: TagMenuCommand): void
```

**示例：**

```typescript
const MenuText = orca.components.MenuText
orca.tagMenuCommands.registerTagMenuCommand("myplugin.exportTaggedBlocks", {
  render: (tagBlock, close) => (
    <MenuText
      preIcon="ti ti-file-export"
      title="Export Tagged Blocks"
      onClick={() => {
        close()
        exportTaggedBlocks(tagBlock)
      }}
    />
  )
})
```

### `orca.tagMenuCommands.unregisterTagMenuCommand`

注销先前注册的标签菜单命令。

```typescript
unregisterTagMenuCommand(id: string): void
```

---

## 编辑器侧边栏工具 (Editor Sidetools)

用于向块编辑器的侧边栏添加自定义工具。

### `orca.editorSidetools.registerEditorSidetool`

在编辑器侧边栏中注册自定义工具。

```typescript
registerEditorSidetool(id: string, tool: EditorSidetool): void
```

**示例：**

```typescript
orca.editorSidetools.registerEditorSidetool("myplugin.outlineViewer", {
  render: (rootBlockId, panelId) => (
    <Tooltip
      text="Outline Viewer"
      shortcut={orca.state.shortcuts["toggleOutlineViewer"]}
      placement="horizontal"
    >
      <Button
        className={`orca-block-editor-sidetools-btn ${isViewerOpened ? "orca-opened" : ""}`}
        variant="plain"
        onClick={toggleOutlineViewer}
      >
        <i className="ti ti-align-justified" />
      </Button>
    </Tooltip>
  )
})
```

### `orca.editorSidetools.unregisterEditorSidetool`

注销先前注册的编辑器侧边栏工具。

```typescript
unregisterEditorSidetool(id: string): void
```

---

## 工具函数 (Utils)

帮助插件和扩展与编辑器的选择和光标状态进行交互的实用函数。

### `orca.utils.getCursorDataFromSelection`

将 DOM Selection 对象转换为 Orca 的内部 CursorData 格式。

```typescript
getCursorDataFromSelection(selection: Selection | null): CursorData | null
```

### `orca.utils.getCursorDataFromRange`

将 DOM Range 对象转换为 Orca 的内部 CursorData 格式。

```typescript
getCursorDataFromRange(range: Range | undefined): CursorData | null
```

### `orca.utils.setSelectionFromCursorData`

根据 Orca 的 CursorData 设置编辑器的选择和插入符号位置。

```typescript
setSelectionFromCursorData(cursorData: CursorData): Promise<void>
```

### `orca.utils.getAssetPath`

解析插件或应用程序使用的资源的绝对 URL 或文件路径。

```typescript
getAssetPath(assetPath: string): string
```

**示例：**

```typescript
const iconUrl = orca.utils.getAssetPath(iconSrc)
<img src={orca.utils.getAssetPath(iconSrc)} alt="Logo" />
```

---

## 通知 (Notify)

向用户显示通知。通知出现在应用程序的右下角，可用于通知用户有关事件、操作或状态更改。

```typescript
notify(
  type: "info" | "success" | "warn" | "error",
  message: string,
  options?: {
    title?: string
    action?: () => void | Promise<void>
  }
): void
```

**示例：**

```typescript
// 简单信息通知
orca.notify("info", "Processing complete")

// 带有标题的错误通知
orca.notify("error", "Failed to connect to API", {
  title: "Connection Error"
})

// 带有操作按钮的成功通知
orca.notify("success", "File exported successfully", {
  title: "Export Complete",
  action: () => {
    orca.commands.invokeCommand("myplugin.openExportedFile")
  }
})
```

---

## 后端 API (Backend API)

支持的后端 API 消息类型，用于与 Orca 后端通信。

| API 消息类型 | 描述 |
|-------------|------|
| `change-tag-property-choice` | 更改单选/多选属性值 |
| `export-png` | 将指定块导出为 PNG 图像 |
| `get-aliased-blocks` | 检索具有指定别名的所有块 |
| `get-aliases` | 检索仓库中的所有别名 |
| `get-aliases-ids` | 检索别名列表的块 ID |
| `get-block` | 通过 ID 检索块 |
| `get-block-by-alias` | 通过别名检索块 |
| `get-blockid-by-alias` | 通过别名检索块的 ID |
| `get-blocks` | 通过 ID 检索多个块 |
| `get-blocks-with-tags` | 检索带有特定标签的块 |
| `get-block-tree` | 检索块及其所有嵌套子块（树结构） |
| `get-children-tags` | 检索父标签块的子标签 |
| `get-journal-block` | 检索特定日期的日记块 |
| `get-remindings` | 检索特定日期范围的所有提醒 |
| `query` | 执行复杂查询以搜索和过滤块 |
| `search-aliases` | 搜索包含特定文本的别名 |
| `search-blocks-by-text` | 搜索包含特定文本的块 |
| `set-app-config` | 设置应用程序级别的配置选项 |
| `set-config` | 设置仓库级别的配置选项 |
| `shell-open` | 使用系统默认应用程序打开 URL 或文件 |
| `show-in-folder` | 在系统文件资源管理器中显示文件 |
| `upload-asset-binary` | 将二进制资源（如图像）上传到仓库 |
| `upload-assets` | 上传多个资源文件到仓库 |
| `image-ocr` | 对图像执行 OCR |

### 详细文档

有关所有后端 API 的完整文档，包括详细的参数说明、返回值类型和使用示例，请参阅：

**[Backend API 完整文档](./documents/Backend-API.md)**

该文档包含：

- 每个后端 API 的详细参数说明
- 返回值类型和格式
- 实用的代码示例
- 最佳实践和注意事项

**示例：使用后端 API**

```typescript
// 1. 获取块信息
const block = await orca.invokeBackend("get-block", 12345)

// 2. 执行复杂查询
const results = await orca.invokeBackend("query", {
  q: {
    kind: 1, // AND
    conditions: [
      { kind: 3, start: { t: 1, v: 7, u: "d" }, end: { t: 1, v: 0, u: "d" } },
      { kind: 8, text: "meeting" },
    ],
  },
  sort: [["modified", "DESC"]],
  pageSize: 20,
})

// 3. 上传图片资源
const imageData = new Uint8Array([...])
const assetPath = await orca.invokeBackend("upload-asset-binary", "image/png", imageData.buffer)

// 4. 执行 OCR
const ocrResult = await orca.invokeBackend("image-ocr", "./assets/document.png")

// 5. 导出为 PNG
const [ok, result] = await orca.invokeBackend("export-png", "my-repo", 12345, 1200)
if (ok) {
  console.log("Exported PNG:", result)
}

// 6. 设置配置
await orca.invokeBackend("set-app-config", AppKeys.AIModel, "gpt-4")
orca.broadcasts.broadcast(BroadcastMsgs.RefreshSettings, AppKeys.AIModel)
```

**常用场景示例：**

```typescript
// 场景 1：通过别名获取块
const [ok, block] = await orca.invokeBackend("get-block-by-alias", "my-alias")
if (ok && block) {
  console.log("Found block:", block)
}

// 场景 2：搜索包含特定文本的块
const searchResults = await orca.invokeBackend("search-blocks-by-text", "todo")
console.log("Found blocks:", searchResults)

// 场景 3：获取带有特定标签的块
const taggedBlocks = await orca.invokeBackend("get-blocks-with-tags", ["important", "urgent"])
console.log("Tagged blocks:", taggedBlocks)

// 场景 4：获取块树（包含所有子块）
const blockTree = await orca.invokeBackend("get-block-tree", 12345)
console.log("Block tree:", blockTree)

// 场景 5：批量获取多个块
const blocks = await orca.invokeBackend("get-blocks", [12345, 12346, 12347])
console.log("Blocks:", blocks)

// 场景 6：获取所有别名
const aliases = await orca.invokeBackend("get-aliases")
console.log("All aliases:", aliases)

// 场景 7：获取今天的日记块
const journalBlock = await orca.invokeBackend("get-journal-block", new Date())
console.log("Journal block:", journalBlock)

// 场景 8：上传多个资源文件
const assetPaths = await orca.invokeBackend("upload-assets", ["./photo1.jpg", "./photo2.png"])

// 场景 9：获取提醒
const today = new Date()
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
const reminders = await orca.invokeBackend("get-remindings", {
  start: today.toISOString(),
  end: nextWeek.toISOString()
})
```

---

## 类型定义

### 核心

#### `DbId`

数据库 ID 类型，用于唯一标识数据库中的块和其他实体。

```typescript
type DbId = number
```

#### `Block`

核心块数据结构，表示单个笔记、章节或其他内容单元。

```typescript
interface Block {
  id: DbId
  content?: ContentFragment[]
  text?: string
  created: Date
  modified: Date
  parent?: DbId
  left?: DbId
  children: DbId[]
  aliases: string[]
  properties: BlockProperty[]
  refs: BlockRef[]
  backRefs: BlockRef[]
}
```

#### `ContentFragment`

块内富文本内容的片段。

```typescript
type ContentFragment = {
  t: string
  v: any
  f?: string
  fa?: Record<string, any>
  [key: string]: any
}
```

#### `Repr`

表示块的结构和类型信息。

```typescript
type Repr = {
  type: string
  [key: string]: any
}
```

#### `BlockProperty`

表示附加到块的命名属性。

```typescript
interface BlockProperty {
  name: string
  type: number
  typeArgs?: any
  value?: any
  pos?: number
}
```

#### `BlockRef`

表示从一个块到另一个块的引用。

```typescript
interface BlockRef {
  id: DbId
  from: DbId
  to: DbId
  type: number
  alias?: string
  data?: BlockProperty[]
}
```

### 面板

#### `PanelView`

可在面板中显示的视图类型。

```typescript
type PanelView = string
```

#### `RowPanel`

以行方式排列其子元素的面板容器。

```typescript
interface RowPanel {
  id: string
  direction: "row"
  children: (ColumnPanel | ViewPanel)[]
  height: number
}
```

#### `ColumnPanel`

以列方式排列其子元素的面板容器。

```typescript
interface ColumnPanel {
  id: string
  direction: "column"
  children: (RowPanel | ViewPanel)[]
  width: number
}
```

#### `ViewPanel`

显示内容（日记或块）的视图面板。

```typescript
interface ViewPanel {
  id: string
  view: PanelView
  viewArgs: Record<string, any>
  viewState: Record<string, any>
  width?: number
  height?: number
  locked?: boolean
  wide?: boolean
}
```

#### `PanelHistory`

面板导航历史中的条目。

```typescript
interface PanelHistory {
  activePanel: string
  view: PanelView
  viewArgs?: Record<string, any>
}
```

### 命令

#### `CommandFn`

基本命令函数类型。

```typescript
type CommandFn = (...args: any[]) => void | Promise<void>
```

#### `EditorCommandFn`

编辑器命令函数类型，支持撤销/重做功能。

```typescript
type EditorCommandFn = (
  editor: EditorArg,
  ...args: any[]
) => { ret?: any; undoArgs: any } | null | Promise<{ ret?: any; undoArgs?: any } | null>
```

#### `Command`

定义命令的属性。

```typescript
interface Command {
  label: string
  fn: CommandFn | [EditorCommandFn, CommandFn]
  hasArgs?: boolean
  noFocusNeeded?: boolean
}
```

#### `CursorData`

表示编辑器中的当前光标位置。

```typescript
interface CursorData {
  anchor: CursorNodeData
  focus: CursorNodeData
  isForward: boolean
  panelId: string
  rootBlockId: DbId
}
```

#### `CursorNodeData`

特定块内的详细光标位置。

```typescript
interface CursorNodeData {
  blockId: DbId
  isInline: boolean
  index: number
  offset: number
}
```

### 通知

#### `Notification`

显示给用户的通知。

```typescript
interface Notification {
  id: number
  type: "info" | "success" | "warn" | "error"
  title?: string
  message: string
  action?: () => void | Promise<void>
}
```

### 插件

#### `Plugin`

表示在 Orca 中安装的插件。

```typescript
interface Plugin {
  enabled: boolean
  icon: string
  schema?: PluginSettingsSchema
  settings?: Record<string, any>
  module?: any
}
```

#### `PluginSettingsSchema`

定义插件可用设置的架构。

```typescript
interface PluginSettingsSchema {
  [key: string]: {
    label: string
    description?: string
    type: "string" | "number" | "boolean" | "date" | "time" | "datetime" |
         "dateRange" | "datetimeRange" | "color" | "singleChoice" |
         "multiChoices" | "array"
    defaultValue?: any
    choices?: { label: string; value: string }[]
    arrayItemSchema?: PluginSettingsSchema
  }
}
```

### 工具栏

#### `ToolbarButton`

编辑器工具栏中工具栏按钮的配置。

```typescript
interface ToolbarButton {
  icon: string
  tooltip: string
  command?: string
  menu?: (close: () => void, state?: any) => React.ReactNode
  color?: string
  background?: string
}
```

### 斜杠命令

#### `SlashCommand`

编辑器斜杠菜单中显示的斜杠命令的配置。

```typescript
interface SlashCommand {
  icon: string
  group: string
  title: string
  command: string
}
```

### 块菜单命令

#### `BlockMenuCommand`

块上下文菜单的命令配置。

```typescript
type BlockMenuCommand =
  | {
      worksOnMultipleBlocks: false
      render: (blockId: DbId, rootBlockId: DbId, close: () => void) => React.ReactNode
    }
  | {
      worksOnMultipleBlocks: true
      render: (blockIds: DbId[], rootBlockId: DbId, close: () => void) => React.ReactNode
    }
```

### 标签菜单命令

#### `TagMenuCommand`

标签上下文菜单的命令配置。

```typescript
type TagMenuCommand = {
  render: (tagBlock: Block, close: () => void, tagRef?: BlockRef) => React.ReactElement
}
```

### 编辑器侧边栏工具

#### `EditorSidetool`

出现在块编辑器侧边栏中的编辑器侧边栏工具的配置。

```typescript
type EditorSidetool = {
  render: (rootBlockId: DbId, panelId: string) => React.ReactNode
}
```

### 查询

#### `QueryDescription`

描述用于搜索和过滤块的查询。

```typescript
interface QueryDescription {
  q?: QueryGroup
  excludeId?: DbId
  sort?: QuerySort[]
  page?: number
  pageSize?: number
  tagName?: string
  groupBy?: string
  group?: string
  stats?: QueryStat[]
  asTable?: boolean
  asCalendar?: {
    field: "created" | "modified" | "journal"
    start: Date
    end: Date
  }
}
```

#### `QueryItem`

表示所有可能的查询条件项的联合类型。

```typescript
type QueryItem =
  | QueryGroup
  | QueryText
  | QueryTag
  | QueryRef
  | QueryJournal
  | QueryBlock
  | QueryNoText
  | QueryNoTag
  | QueryNoRef
```

#### `QueryGroup`

用逻辑运算符组合的查询条件组。

```typescript
interface QueryGroup {
  kind: QueryKindAnd | QueryKindOr
  conditions: QueryItem[]
  includeDescendants?: boolean
  subConditions?: QueryGroup
}
```

#### `QueryTag`

匹配带有特定标签的块的查询条件。

```typescript
interface QueryTag {
  kind: QueryKindTag
  name: string
  properties?: QueryTagProperty[]
  includeDescendants?: boolean
}
```

#### `QueryJournal`

匹配日期范围内的日记块的查询条件。

```typescript
interface QueryJournal {
  kind: QueryKindJournal
  start: QueryJournalDate
  end: QueryJournalDate
  includeDescendants?: boolean
}
```

#### `QueryRef`

匹配引用特定块的块的查询条件。

```typescript
interface QueryRef {
  kind: QueryKindRef
  blockId: DbId
  includeDescendants?: boolean
}
```

#### `QueryText`

匹配包含特定文本的块的查询条件。

```typescript
interface QueryText {
  kind: QueryKindText
  text: string
  raw?: boolean
  includeDescendants?: boolean
}
```

#### `QueryBlock`

匹配根据其属性的块的查询条件。

```typescript
interface QueryBlock {
  kind: QueryKindBlock
  types?: {
    op?: QueryHas | QueryNotHas
    value?: string[]
  }
  hasParent?: boolean
  hasChild?: boolean
  hasTags?: boolean
  hasBackRefs?: boolean
  hasAliases?: boolean
  created?: {
    op?: QueryEq | QueryNotEq | QueryGt | QueryLt | QueryGe | QueryLe
    value?: Date | QueryJournalDate
  }
  modified?: {
    op?: QueryEq | QueryNotEq | QueryGt | QueryLt | QueryGe | QueryLe
    value?: Date | QueryJournalDate
  }
  includeDescendants?: boolean
}
```

#### `QueryTask`

匹配任务块的查询条件。

```typescript
interface QueryTask {
  kind: QueryKindTask
  completed?: boolean
}
```

#### `QueryTagProperty`

用于查询具有特定值的标签属性的条件。

```typescript
interface QueryTagProperty {
  name: string
  type?: number
  typeArgs?: any
  op?: QueryEq | QueryNotEq | QueryIncludes | QueryNotIncludes | QueryHas | QueryNotHas | QueryGt | QueryLt | QueryGe | QueryLe | QueryNull | QueryNotNull
  value?: any
}
```

#### `QuerySort`

指定查询结果的排序。

```typescript
type QuerySort = [string, "ASC" | "DESC"]
```

#### `QueryStat`

可以对查询结果执行的统计操作类型。

```typescript
type QueryStat =
  | ""         // 无统计
  | "count"    // 所有项目的计数
  | "count_e"  // 具有非空值的项目计数
  | "count_ne" // 具有空值的项目计数
  | "sum"      // 所有值的总和
  | "avg"      // 所有值的平均值
  | "min"      // 最小值
  | "max"      // 最大值
  | "percent_e" // 具有非空值的项目百分比
  | "percent_ne" // 具有空值的项目百分比
```

### 查询 (版本 2)

#### `QueryDescription2`

描述用于搜索和过滤块的查询（版本 2）。

```typescript
interface QueryDescription2 {
  q?: QueryGroup2
  excludeId?: DbId
  sort?: QuerySort[]
  page?: number
  pageSize?: number
  tagName?: string
  groupBy?: string
  group?: string
  stats?: QueryStat[]
  asTable?: boolean
  asCalendar?: {
    field: "created" | "modified" | "journal"
    start: Date
    end: Date
  }
  randomSeed?: number
  useReferenceDate?: boolean
  referenceDate?: number
}
```

#### `QueryItem2`

表示所有可能的查询条件项的联合类型（版本 2）。

```typescript
type QueryItem2 =
  | QueryGroup2
  | QueryText2
  | QueryTag2
  | QueryRef2
  | QueryJournal2
  | QueryBlock2
  | QueryBlockMatch2
  | QueryTask
  | QueryFormat2
```

#### `QueryGroup2`

用逻辑运算符组合的查询条件组（版本 2）。

```typescript
interface QueryGroup2 {
  kind:
    | QueryKindSelfAnd
    | QueryKindSelfOr
    | QueryKindAncestorAnd
    | QueryKindAncestorOr
    | QueryKindDescendantAnd
    | QueryKindDescendantOr
    | QueryKindChainAnd
  conditions: QueryItem2[]
  negate?: boolean
}
```

#### `QueryText2`

匹配包含特定文本的块的查询条件（版本 2）。

```typescript
interface QueryText2 {
  kind: QueryKindText
  text: string
  raw?: boolean
}
```

#### `QueryTag2`

匹配带有特定标签的块的查询条件（版本 2）。

```typescript
interface QueryTag2 {
  kind: QueryKindTag
  name: string
  properties?: QueryTagProperty[]
  selfOnly?: boolean
}
```

#### `QueryRef2`

匹配引用特定块的块的查询条件（版本 2）。

```typescript
interface QueryRef2 {
  kind: QueryKindRef
  blockId?: DbId
  selfOnly?: boolean
}
```

#### `QueryJournal2`

匹配日期范围内的日记块的查询条件（版本 2）。

```typescript
interface QueryJournal2 {
  kind: QueryKindJournal
  start: QueryJournalDate
  end: QueryJournalDate
}
```

#### `QueryBlock2`

匹配根据其属性的块的查询条件（版本 2）。

```typescript
interface QueryBlock2 {
  kind: QueryKindBlock
  types?: {
    op?: QueryHas | QueryNotHas
    value?: string[]
  }
  hasParent?: boolean
  hasChild?: boolean
  hasTags?: boolean
  hasAliases?: boolean
  backRefs?: {
    op?: QueryEq | QueryNotEq | QueryGt | QueryLt | QueryGe | QueryLe
    value?: number
  }
  created?: {
    op?: QueryEq | QueryNotEq | QueryGt | QueryLt | QueryGe | QueryLe
    value?: Date | QueryJournalDate
  }
  modified?: {
    op?: QueryEq | QueryNotEq | QueryGt | QueryLt | QueryGe | QueryLe
    value?: Date | QueryJournalDate
  }
}
```

#### `QueryBlockMatch2`

匹配特定块的查询条件（版本 2）。

```typescript
interface QueryBlockMatch2 {
  kind: QueryKindBlockMatch
  blockId?: DbId
}
```

#### `QueryFormat2`

匹配具有特定格式的内容片段的查询条件。

```typescript
interface QueryFormat2 {
  kind: QueryKindFormat
  f: string
  fa?: Record<string, any>
}
```

### 查询常量

#### 查询类型常量

| 常量 | 值 | 描述 |
|------|-----|------|
| `QueryKindAnd` | 1 | AND 查询组类型 |
| `QueryKindOr` | 2 | OR 查询组类型 |
| `QueryKindJournal` | 3 | 日记查询类型 |
| `QueryKindTag` | 4 | 标签查询类型 |
| `QueryKindNoTag` | 5 | 无标签查询类型 |
| `QueryKindRef` | 6 | 引用查询类型 |
| `QueryKindNoRef` | 7 | 无引用查询类型 |
| `QueryKindText` | 8 | 文本查询类型 |
| `QueryKindBlock` | 9 | 块查询类型 |
| `QueryKindNoText` | 10 | 无文本查询类型 |
| `QueryKindTask` | 11 | 任务查询类型 |
| `QueryKindBlockMatch` | 12 | 块匹配查询类型 |
| `QueryKindFormat` | 13 | 内容格式查询类型 |

#### 查询类型常量（版本 2）

| 常量 | 值 | 描述 |
|------|-----|------|
| `QueryKindSelfAnd` | 100 | 自身 AND 查询组类型 |
| `QueryKindSelfOr` | 101 | 自身 OR 查询组类型 |
| `QueryKindAncestorAnd` | 102 | 祖先 AND 查询组类型 |
| `QueryKindAncestorOr` | 103 | 祖先 OR 查询组类型 |
| `QueryKindDescendantAnd` | 104 | 后代 AND 查询组类型 |
| `QueryKindDescendantOr` | 105 | 后代 OR 查询组类型 |
| `QueryKindChainAnd` | 106 | 链式 AND 查询组类型 |

#### 操作常量

| 常量 | 值 | 描述 |
|------|-----|------|
| `QueryEq` | 1 | 等于 |
| `QueryNotEq` | 2 | 不等于 |
| `QueryIncludes` | 3 | 包含 |
| `QueryNotIncludes` | 4 | 不包含 |
| `QueryHas` | 5 | 有属性 |
| `QueryNotHas` | 6 | 没有属性 |
| `QueryGt` | 7 | 大于 |
| `QueryLt` | 8 | 小于 |
| `QueryGe` | 9 | 大于或等于 |
| `QueryLe` | 10 | 小于或等于 |
| `QueryNull` | 11 | 为 null |
| `QueryNotNull` | 12 | 不为 null |

#### 日期类型常量

| 常量 | 值 | 描述 |
|------|-----|------|
| `QueryJournalRelative` | 1 | 相对日期规范 |
| `QueryJournalFull` | 2 | 绝对日期规范 |

### 其他

#### `IdContent`

包含块 ID 及其内容的简单结构。

```typescript
interface IdContent {
  id: DbId
  content: ContentFragment[] | null
}
```

#### `Choice`

表示带有可选颜色的选择。

```typescript
type Choice = { n: string; c?: string } | string
```

#### `BlockCustomQuery`

自定义查询的配置。

```typescript
interface BlockCustomQuery {
  q: QueryDescription2
  extraSql?: string
}
```

---

## 数据库常量

### PropType（属性类型）

属性类型常量用于定义块属性的数据类型。这些类型决定了属性值的存储和解释方式。

| 常量 | 值 | 描述 | 值类型 |
|------|-----|------|--------|
| `PropType.JSON` | 0 | JSON 对象或原始值 | 任何有效的 JSON 对象或原始值 |
| `PropType.Text` | 1 | 文本字符串 | `string` |
| `PropType.BlockRefs` | 2 | 块引用数组 | `DbId[]` |
| `PropType.Number` | 3 | 数字 | `number` |
| `PropType.Boolean` | 4 | 布尔值 | `true` 或 `false` |
| `PropType.DateTime` | 5 | 日期时间 | `Date` |
| `PropType.TextChoices` | 6 | 文本选择（多选） | `string[]` |

**示例：**

```typescript
// 设置不同类型的属性
const properties = [
  { name: "title", value: "My Document", type: PropType.Text },
  { name: "pageCount", value: 42, type: PropType.Number },
  { name: "isPublished", value: true, type: PropType.Boolean },
  { name: "publishDate", value: new Date(), type: PropType.DateTime },
  { name: "tags", value: ["important", "review"], type: PropType.TextChoices },
  { name: "relatedDocs", value: [123, 456, 789], type: PropType.BlockRefs },
  { name: "metadata", value: { author: "John", version: "1.0" }, type: PropType.JSON },
]

await orca.commands.invokeEditorCommand(
  "core.editor.setProperties",
  null,
  [blockId],
  properties,
)
```

### RefType（引用类型）

引用类型常量用于定义块之间的引用关系类型。

| 常量 | 值 | 描述 |
|------|-----|------|
| `RefType.Inline` | 1 | 内联引用 - 在文本中嵌入的引用 |
| `RefType.Property` | 2 | 属性引用 - 通过块属性建立的引用 |
| `RefType.RefData` | 3 | 引用数据 - 通过引用数据建立的引用 |
| `RefType.Media` | 4 | 媒体引用 - 白板、PDF 或 EPUB 等媒体文件 |

**示例：**

```typescript
// 创建不同类型的引用
// 1. 内联引用
const inlineRefId = await orca.commands.invokeEditorCommand(
  "core.editor.createRef",
  null,
  fromBlockId,
  toBlockId,
  RefType.Inline,
)

// 2. 属性引用（带别名）
const propertyRefId = await orca.commands.invokeEditorCommand(
  "core.editor.createRef",
  null,
  fromBlockId,
  toBlockId,
  RefType.Property,
  "relatedTask", // 属性别名
)

// 3. 媒体引用（例如白板）
const mediaRefId = await orca.commands.invokeEditorCommand(
  "core.editor.createRef",
  null,
  fromBlockId,
  whiteboardBlockId,
  RefType.Media,
)
```

### 使用引用数据

引用数据允许你在引用关系上存储额外的信息，通常与 `RefType.Property` 和 `RefType.RefData` 一起使用。

**示例：**

```typescript
// 创建属性引用并添加引用数据
const propertyRefId = await orca.commands.invokeEditorCommand(
  "core.editor.createRef",
  null,
  fromBlockId,
  toBlockId,
  RefType.Property,
  "dueDate",
)

// 获取引用对象
const ref = orca.state.blocks[fromBlockId]?.refs.find(r => r.id === propertyRefId)
if (ref) {
  // 设置引用数据
  await orca.commands.invokeEditorCommand(
    "core.editor.setRefData",
    null,
    ref,
    [
      { name: "date", value: new Date("2024-12-31") },
      { name: "notes", value: "Final deadline for the project" },
      { name: "priority", value: "high" },
    ],
  )
}

// 删除引用数据
await orca.commands.invokeEditorCommand(
  "core.editor.deleteRefData",
  null,
  propertyRefId,
  ["notes"], // 要删除的数据字段名称
)
```

---

## 附录

### 快速参考

#### 常用 API 调用

```typescript
// 获取当前活动面板
const panelId = orca.state.activePanel

// 获取块
const block = orca.state.blocks[blockId]

// 注册命令
orca.commands.registerCommand("my.command", () => {}, "My Command")

// 调用命令
await orca.commands.invokeCommand("my.command")

// 显示通知
orca.notify("info", "Message")

// 导航到块
orca.nav.goTo("block", { blockId: 123 })

// 获取插件设置
const settings = await orca.plugins.getData("my-plugin", "settings")

// 设置插件设置
await orca.plugins.setData("my-plugin", "settings", JSON.stringify({...}))

// 注册块渲染器
orca.renderers.registerBlock("my.type", true, MyComponent)

// 注册斜杠命令
orca.slashCommands.registerSlashCommand("my.id", {
  icon: "ti ti-icon",
  group: "My Group",
  title: "My Command",
  command: "my.command"
})
```

### 相关文档

- [Backend API](./documents/Backend-API.md)
- [Core Commands](./documents/Core-Commands.md)
- [Core Editor Commands](./documents/Core-Editor-Commands.md)
- [Custom Renderers](./documents/Custom-Renderers.md)
- [Quick Start](./documents/Quick-Start.md)

---

*本文档基于 Orca TypeScript 类型定义生成。*