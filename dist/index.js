// orca-cn-typography/dist/index.js
// OrcaNote 中文排版插件：字体大小、行高、中英文空格、标点规范化、Preview/Auto 双模式格式化

// --- 全局变量 ---
let currentPluginName = "orca-cn-typography";
let unsubscribeFromSettings = null; // 用于保存 Valtio 设置订阅的取消函数
let debugLogsEnabled = false;
const originalConsoleLog = console.log.bind(console);
function toBool(v) {
  return v === true || (typeof v === 'string' && v.toLowerCase() === 'true');
}
function setDebugLogging(enabled) {
  debugLogsEnabled = !!enabled;
  console.log = function(...args) {
    const first = args[0];
    const isOurLog = typeof first === 'string' && first.startsWith(`[${currentPluginName}]`);
    if (!isOurLog) return originalConsoleLog(...args);
    if (debugLogsEnabled) return originalConsoleLog(...args);
  };
}
function notifyInfo(message) {
  if (debugLogsEnabled) {
    orca.notify("info", message);
  }
}

// --- 常量定义 ---
// 全局基础字体大小的像素值范围 (用于验证)
const MIN_BASE_FONT_SIZE_PX = 10;
const MAX_BASE_FONT_SIZE_PX = 18;
const DEFAULT_BASE_FONT_SIZE_STRING = "16px"; // schema 中 baseFontSize 的默认字符串值

// 全局行高变量的默认值 (对应 --orca-lineheight-md)
const DEFAULT_GLOBAL_LINE_HEIGHT = "1.6";

// CSS 自定义属性名称常量 (方便管理和避免拼写错误)
const CSS_VAR_BASE_FONT_SIZE = '--orca-fontsize-base';
const CSS_VAR_GLOBAL_LINE_HEIGHT = '--orca-lineheight-md'; // 我们用这个变量实现全局行高

// --- 插件设置的结构定义 (Schema) ---
const settingsSchema = {
  baseFontSize: {
    label: `全局基础字体大小`,
    type: "string",
    defaultValue: DEFAULT_BASE_FONT_SIZE_STRING,
    description: `设置全局字体大小（如 16px）。建议范围：${MIN_BASE_FONT_SIZE_PX}px-${MAX_BASE_FONT_SIZE_PX}px`
  },
  globalLineHeight: {
    label: "全局行高",
    type: "string",
    defaultValue: DEFAULT_GLOBAL_LINE_HEIGHT,
    description: `设置全局行高（如 1.6、1.8）。数值越大，行间距越大。`
  },
  formattingMode: {
    label: "排版模式",
    type: "string",
    defaultValue: "auto",
    description: "• preview: 预览模式 - 仅视觉显示优化，不修改原文\n• auto: 自动模式 - 按 Enter 时自动应用格式化（可撤销）"
  },
  autoProcessing: {
    label: "自动处理总开关",
    type: "boolean",
    defaultValue: true,
    description: "开启后实时应用排版规则。关闭则只能通过命令手动格式化。"
  },
  enableAutoSpacing: {
    label: "中英文自动空格",
    type: "boolean",
    defaultValue: true,
    description: "在中文与英文/数字之间自动添加空格。例如：「测试test」→「测试 test」"
  },
  enableEnhancedSpacing: {
    label: "   ↳ 增强空格规则",
    type: "boolean",
    defaultValue: true,
    description: "数字与单位间加空格（如「10GB」→「10 GB」），但保留特殊符号（如「233°」「15%」不加空格）"
  },
  customSpacingRules: {
    label: "   ↳ 自定义空格规则 (高级)",
    type: "string",
    defaultValue: '[{"pattern":"([\u4e00-\u9fff])[(]","replacement":"$1 ("},{"pattern":"[)]([\u4e00-\u9fff])","replacement":") $1"},{"pattern":"([\u4e00-\u9fff])\\\\[","replacement":"$1 ["},{"pattern":"\\\\]([\u4e00-\u9fff])","replacement":"] $1"}]',
    description: "JSON 格式补充空格规则（可删除或修改）。默认：中文与半角括号间加空格"
  },
  enablePunctuationPreview: {
    label: "标点符号规范化",
    type: "boolean",
    defaultValue: true,
    description: "规范化标点符号：去除多余空格、统一引号样式"
  },
  enablePunctuationEnhanced: {
    label: "   ↳ 增强标点规则",
    type: "boolean",
    defaultValue: true,
    description: "移除全角标点前后的不必要空格"
  },
  punctuationStyle: {
    label: "   ↳ 引号风格",
    type: "string",
    defaultValue: "mainland",
    description: '• mainland: 中文用\u201c\u201d和\u2018\u2019（大陆）\n• tw-hk: 中文用「」和『』（港台）\n• tech: 中英文混排优化'
  },
  customPunctuationRules: {
    label: "   ↳ 自定义标点规则 (高级)",
    type: "string",
    defaultValue: '[{"pattern":"[.]{3,}","replacement":"……"},{"pattern":"[-]{2,}","replacement":"——"},{"pattern":"([\u4e00-\u9fff])!([\u4e00-\u9fff])","replacement":"$1！$2"},{"pattern":"([\u4e00-\u9fff])[?]([\u4e00-\u9fff])","replacement":"$1？$2"},{"pattern":"([\u4e00-\u9fff]),([\u4e00-\u9fff])","replacement":"$1，$2"},{"pattern":"([\u4e00-\u9fff])[.]([\u4e00-\u9fff])","replacement":"$1。$2"},{"pattern":"([\u4e00-\u9fff]);([\u4e00-\u9fff])","replacement":"$1；$2"},{"pattern":"([\u4e00-\u9fff]):([\u4e00-\u9fff])","replacement":"$1：$2"}]',
    description: '自定义标点补充规则（可删除或修改）。默认：省略号/破折号规范化、中文间半角标点转全角'
  },
  bodyLigatures: {
    label: "正文连字",
    type: "boolean",
    defaultValue: true,
    description: "在正文中启用字体连字，优化西文排版（如 fi、fl 连字）"
  },
  codeLigatures: {
    label: "代码连字",
    type: "boolean",
    defaultValue: false,
    description: "在代码块中启用连字。默认关闭以避免符号混淆（如 != 和 ≠）"
  },
  numericTabular: {
    label: "表格数字对齐",
    type: "boolean",
    defaultValue: true,
    description: "使用等宽数字，在表格和数据对齐场景更清晰"
  },
  transformRootSelector: {
    label: "作用范围选择器 (高级)",
    type: "string",
    defaultValue: ".markdown-body",
    description: "CSS 选择器，限定排版规则的作用范围。默认值适用于大多数情况"
  },
  transformDebounceMs: {
    label: "变换防抖延迟 (高级)",
    type: "string",
    defaultValue: "5000",
    description: "文档变化后延迟多少毫秒再应用排版（单位：毫秒）。数值越大性能越好但响应越慢"
  },
  pauseOnTyping: {
    label: "输入时暂停处理",
    type: "boolean",
    defaultValue: true,
    description: "打字时暂停排版处理，停止输入后再应用，避免干扰输入"
  },
  typingIdleMs: {
    label: "   ↳ 输入停止延迟",
    type: "string",
    defaultValue: "3000",
    description: "停止输入后延迟多少毫秒再应用排版（单位：毫秒）"
  },
  previewIncremental: {
    label: "预览增量处理 (高级)",
    type: "boolean",
    defaultValue: true,
    description: "仅处理发生变化的 DOM 子树；大幅降低预览模式全量扫描开销"
  },
  previewFullScanThreshold: {
    label: "   ↳ 预览全量回退阈值",
    type: "string",
    defaultValue: "200",
    description: "单轮变更节点数超过该值时执行全量扫描（单位：节点数）"
  },
  autoBatchFlushMs: {
    label: "Auto 批处理间隔 (高级)",
    type: "string",
    defaultValue: "16",
    description: "Auto 模式批量处理脏块的间隔（毫秒）"
  },
  autoMinWriteIntervalMs: {
    label: "Auto 最小写回间隔 (高级)",
    type: "string",
    defaultValue: "80",
    description: "两次 setBlocksContent 之间的最小间隔（毫秒）"
  },
  unitWhitelist: {
    label: "单位白名单 (高级)",
    type: "string",
    defaultValue: "GB,Gbps,TB,MB,KB,px,ms,s,GHz,MHz,B,KiB,MiB,GiB,TiB,ns,us,µs,min,h",
    description: "逗号分隔的单位列表，用于数字与单位间自动加空格"
  },
  debugLogs: {
    label: "调试日志",
    type: "boolean",
    defaultValue: false,
    description: "启用后在浏览器控制台显示详细的调试信息。仅供开发调试使用"
  },
  hardFormatToClipboard: {
    label: "一次性格式化到剪贴板",
    type: "boolean",
    defaultValue: false,
    description: "将当前文档的格式化结果复制到剪贴板（一次性操作）"
  }
};

// --- 辅助函数 ---

/**
 * 从已保存的设置或 Schema 的默认值中获取特定设置项的值。
 * @param {string} settingKey - 要获取的设置项的键名。
 * @param {object | undefined | null} savedSettings - 从 orca.state 中获取的已保存设置对象。
 * @returns {string | number | boolean} 设置项的值，如果找不到则返回空字符串或 schema 定义的默认值类型。
 */
function getSettingValue(settingKey, savedSettings) {
  const settingsToUse = savedSettings || {}; // 确保 savedSettings 不是 null/undefined 以安全访问
  // 优先使用已保存的设置值 (即使是空字符串，也表示用户有意设置为空)
  if (settingsToUse[settingKey] !== undefined && settingsToUse[settingKey] !== null) {
    return settingsToUse[settingKey];
  }
  // 如果没有已保存的值，则使用 schema 中定义的默认值
  if (settingsSchema[settingKey] && settingsSchema[settingKey].defaultValue !== undefined) {
    return settingsSchema[settingKey].defaultValue;
  }
  // 如果 schema 中也没有默认值（理论上我们都应该定义），则对于字符串类型返回空字符串
  // 对于其他类型（如 boolean 或 number, 如果以后用到），可能需要不同的后备逻辑
  return "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms || 0)));
}

/**
 * 通用的 CSS 变量应用或移除函数。
 * @param {string} variableName - 要设置的 CSS 变量名 (例如 '--my-color')。
 * @param {string} value - 要设置的值。如果值为空字符串、null 或 undefined，则移除该变量。
 */
function applyOrRemoveCssVar(variableName, value) {
  if (value && typeof value === 'string' && value.trim() !== '') {
    document.documentElement.style.setProperty(variableName, value, 'important');
    console.log(`[${currentPluginName}] Applied ${variableName}: ${value}`);
  } else {
    document.documentElement.style.removeProperty(variableName);
    console.log(`[${currentPluginName}] Removed ${variableName}`);
  }
}

const TYPO_STYLE_ID = currentPluginName + '-typography';
function ensureTypoStyle(){
  let el = document.getElementById(TYPO_STYLE_ID);
  if(!el){ el = document.createElement('style'); el.id = TYPO_STYLE_ID; document.head.appendChild(el); }
  return el;
}
function updateTypographyStyles({ bodyLigatures, codeLigatures, numericTabular }){
  const el = ensureTypoStyle();
  const bodyLiga = toBool(bodyLigatures) ? 'normal' : 'none';
  const codeLiga = toBool(codeLigatures) ? 'normal' : 'none';
  const numeric = toBool(numericTabular) ? 'tabular-nums lining-nums' : 'normal';
  el.textContent = `body{font-variant-ligatures:${bodyLiga}}code,pre,kbd,samp,.code,.code-block{font-variant-ligatures:${codeLiga}}body,.markdown-body,main,article{font-variant-numeric:${numeric}}`;
}

let hardFormatOnceUsed = false;

// PreviewFormatter 实例
let previewFormatter = null;

// AutoFormatter 实例
let autoFormatter = null;
function compileRules(json, label){
  const raw = String(json||'').trim();
  if(!raw) return [];
  try{
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)){
      orca.notify('warn', `[${currentPluginName}] ${label||'自定义规则'}：JSON 格式错误，需要数组格式 [...]`);
      return [];
    }
    return arr.map(r=>{
      try{ return {p:new RegExp(r.pattern,'g'),rep:String(r.replacement||'')}; }
      catch(e){
        orca.notify('warn', `[${currentPluginName}] ${label||'自定义规则'}：正则表达式 "${r.pattern}" 无效 - ${e.message}`);
        return null;
      }
    }).filter(Boolean);
  }catch(e){
    orca.notify('warn', `[${currentPluginName}] ${label||'自定义规则'}：JSON 语法错误 - ${e.message}`);
    return [];
  }
}
const CJK_RANGE='[\\u2E80-\\u2EFF\\u2F00-\\u2FDF\\u3040-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]';
const reCjkThenLat=new RegExp('('+CJK_RANGE+')([A-Za-z0-9])','g');
const reLatThenCjk=new RegExp('([A-Za-z0-9])('+CJK_RANGE+')','g');
function buildUnitRegex(csv){
  const units = String(csv||'').split(',').map(s=>s.trim()).filter(Boolean);
  const pattern = units.length ? units.map(u=>u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') : 'GB|Gbps|TB|MB|KB|ms|s|GHz|MHz|px';
  return new RegExp(`([0-9]+)(?=(?:${pattern})\\b)`,'g');
}
const defaultExceptionRe=/([0-9]+)\\s*(°C|°F|°|%)/g;
const beforeFullWidth=/\s+([，。；：？！、)”’】》〕〉）])/g;
const afterOpening=/([（［｛【《〔〈“‘])\s+/g;
function shouldSkipTextNode(n,cfg){
  const el=n.parentElement; if(!el) return true;
  const skip=['CODE','PRE','KBD','SAMP','SCRIPT','STYLE','A'];
  if(skip.includes(el.tagName)) return true;
  if(el.closest('[contenteditable="true"], textarea, input')) return true;
  if(el.closest('code, pre, kbd, samp')) return true;
  if(el.closest('.code, .code-block, .inline-code')) return true;
  if(el.closest('[class*="hljs"], [class*="code"], [role="code"], [data-code-block], [data-lang], [data-language]')) return true;
  if(!cfg?.detached && el.closest('.cm-content, .cm-line, .CodeMirror, .monaco-editor, .ace_editor')) return true;
  return false;
}
function applySpacing(s,cfg){
  s=String(s).replace(reCjkThenLat,'$1 $2').replace(reLatThenCjk,'$1 $2');
  if(cfg.enhanced){
    const uRe = cfg.unitRe || buildUnitRegex('');
    const exRe = cfg.exceptionRe || defaultExceptionRe;
    s=s.replace(uRe,'$1 ').replace(exRe,'$1$2');
  }
  for(const r of (cfg.customSpacing||[])){ try{ s=s.replace(r.p,r.rep);}catch(_){}}
  return s;
}
function applyPunctuation(s,cfg){
  if(!cfg.enabled) return s;
  s=String(s);
  if(cfg.enhanced){ s=s.replace(beforeFullWidth,'$1').replace(afterOpening,'$1'); }
  const style=(cfg.style||'mainland').toLowerCase();
  if(style==='mainland'){
    s=s.replace(/『([^』]+)』/g,'‘$1’').replace(/「([^「]+)」/g,'“$1”');
    s=s.replace(new RegExp('('+CJK_RANGE+')\\s*"([^"]+)"\\s*('+CJK_RANGE+')','g'),'$1“$2”$3');
    s=s.replace(new RegExp('('+CJK_RANGE+")\\s*'([^']+)'\\s*("+CJK_RANGE+')','g'),'$1‘$2’$3');
  } else if(style==='tw-hk'){
    s=s.replace(/“([^”]+)”/g,'「$1」').replace(/‘([^’]+)’/g,'『$1』');
  } else if(style==='tech'){
    s=s.replace(/『([^』]+)』/g,'‘$1’').replace(/「([^「]+)」/g,'“$1”');
  }
  for(const r of (cfg.customPunc||[])){ try{ s=s.replace(r.p,r.rep);}catch(_){}}
  return s;
}
/**
 * 对 ContentFragment[] 应用格式化规则，保留每个 fragment 的格式信息（bold/italic 等）
 * @param {ContentFragment[]} fragments - 块的 content 数组
 * @param {object} cfg - 格式化配置
 * @returns {ContentFragment[]} 格式化后的 content 数组
 */
function formatContentFragments(fragments, cfg) {
  if (!fragments || !Array.isArray(fragments)) return fragments;
  let changed = false;
  const result = fragments.map(frag => {
    // 只处理文本类型的 fragment，跳过引用、代码等
    if (frag.t !== 't' || typeof frag.v !== 'string') return frag;
    let s = frag.v;
    s = applySpacing(s, cfg);
    s = applyPunctuation(s, {
      enabled: cfg.puncEnabled,
      enhanced: cfg.puncEnhanced,
      style: cfg.puncStyle,
      customPunc: cfg.customPunc
    });
    if (s !== frag.v) {
      changed = true;
      return { ...frag, v: s };
    }
    return frag;
  });
  return changed ? result : null; // null 表示无变化
}

function processTree(root,cfg){
  try{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:(n)=>{
      if(!n.nodeValue||!/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      if(shouldSkipTextNode(n,cfg)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    let node;
    while((node=walker.nextNode())){
      const t=node.nodeValue;
      let s=applySpacing(t,cfg);
      s=applyPunctuation(s,{enabled:cfg.puncEnabled, enhanced:cfg.puncEnhanced, style:cfg.puncStyle, customPunc:cfg.customPunc});
      if(s!==t){
        node.nodeValue=s;
        if(cfg.highlight){ const p=node.parentElement; if(p) p.setAttribute('data-typo-touched',''); }
      }
    }
  }catch(_){}
}
function getTransformRoot(selector){
  if(selector){
    try { const el=document.querySelector(selector); if(el) return el; } catch(_){}
  }
  const md = document.querySelector('.markdown-body');
  return md || document.body;
}
function getEffectiveRootForSelection(selector){
  const base=getTransformRoot(selector);
  try{
    const sel=window.getSelection && window.getSelection();
    if(sel && sel.rangeCount){
      const anc=sel.getRangeAt(0).commonAncestorContainer;
      const md=document.querySelector('.markdown-body');
      if(md && md.contains(anc)) return md;
      if(base && base.contains(anc)) return base;
      if(md) return md;
    }
  }catch(_){}
  return base;
}
function isBlockEl(el){
  if(!el) return false;
  const t=el.tagName;
  return ['P','DIV','LI','UL','OL','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','SECTION','ARTICLE','HEADER','FOOTER','MAIN'].includes(t);
}
function findBlockAncestor(el){
  let cur=el;
  while(cur && !isBlockEl(cur)) cur=cur.parentElement;
  return cur;
}
async function copyText(text){
  try{
    if(navigator && navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      orca.notify('info', `[${currentPluginName}] 已复制硬格式化文本到剪贴板`);
      return true;
    }
  }catch(_){}
  try{
    const ta=document.createElement('textarea');
    ta.value=text; document.body.appendChild(ta); ta.select();
    const ok=document.execCommand && document.execCommand('copy');
    ta.remove();
    if(ok){ orca.notify('info', `[${currentPluginName}] 已复制硬格式化文本到剪贴板`); return true; }
  }catch(_){}
  orca.notify('warn', `[${currentPluginName}] 无法复制到剪贴板，请手动复制。`);
  return false;
}
function collectFormattedText(root){
  let out='';
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:(n)=>{
    if(!n.nodeValue||!/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
    if(shouldSkipTextNode(n)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  let node; let prevBlock=null;
  while((node=walker.nextNode())){
    const blk=findBlockAncestor(node.parentElement);
    if(blk && blk!==prevBlock){
      if(out && !out.endsWith('\n')) out+='\n';
      prevBlock=blk;
    }
    out+=node.nodeValue;
  }
  out=out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  return out;
}
async function exportHardFormatToClipboard(cfg){
  const root=getEffectiveRootForSelection(cfg.rootSelector);
  const holder=getSelectionHolder(root);
  processTree(holder,{...cfg, detached:true});
  const text=collectFormattedText(holder);
  await copyText(text);
}
function getSelectionHolder(root){
  const sel=window.getSelection && window.getSelection();
  let holder=null;
  if(sel && sel.rangeCount){
    const range=sel.getRangeAt(0);
    if(!sel.isCollapsed && range){
      const frag=range.cloneContents();
      holder=document.createElement('div');
      holder.appendChild(frag);
    }else if(sel.anchorNode){
      const blk=findBlockAncestor(sel.anchorNode.parentElement||sel.anchorNode);
      if(blk && root.contains(blk)){
        holder=blk.cloneNode(true);
      }
    }
  }
  if(!holder){
    const prefer = root;
    holder=document.createElement('div');
    holder.appendChild(prefer.cloneNode(true));
  }
  return holder;
}
/**
 * 从 DOM 节点向上查找 Orca 块 ID
 */
function findBlockIdFromNode(node) {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el) {
    const bid = el.getAttribute('data-block-id') || el.getAttribute('data-id');
    if (bid) return bid;
    if (el.id?.startsWith('block-')) return el.id.replace('block-', '');
    el = el.parentElement;
  }
  return null;
}

/**
 * 从当前选区收集涉及的所有块 ID（去重、保序）
 */
function getSelectedBlockIds() {
  const sel = window.getSelection?.();
  if (!sel || !sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  const ids = new Set();

  // 起点和终点块
  const startId = findBlockIdFromNode(range.startContainer);
  const endId = findBlockIdFromNode(range.endContainer);
  if (startId) ids.add(startId);

  // 如果选区跨块，遍历中间节点
  if (startId !== endId) {
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ELEMENT,
      { acceptNode: n => {
        const bid = n.getAttribute('data-block-id') || n.getAttribute('data-id');
        return bid ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }}
    );
    let n;
    while ((n = walker.nextNode())) {
      if (range.intersectsNode(n)) {
        const bid = n.getAttribute('data-block-id') || n.getAttribute('data-id');
        if (bid) ids.add(bid);
      }
    }
  }

  if (endId) ids.add(endId);
  return [...ids];
}

/**
 * 硬格式化写回：通过 Orca API 持久化，保留富文本格式
 */
async function hardFormatSelectionWriteback(cfg) {
  const blockIds = getSelectedBlockIds();

  // 如果找不到块 ID，降级到剪贴板
  if (!blockIds.length) {
    const root = getEffectiveRootForSelection(cfg.rootSelector);
    const holder = getSelectionHolder(root);
    processTree(holder, { ...cfg, detached: true });
    await copyText(collectFormattedText(holder));
    return;
  }

  const updates = [];
  for (const bid of blockIds) {
    const block = orca.state.blocks?.[bid];
    if (!block?.content) continue;
    const newContent = formatContentFragments(block.content, cfg);
    if (newContent) {
      updates.push({ id: parseInt(bid), content: newContent });
    }
  }

  if (!updates.length) {
    orca.notify('info', `[${currentPluginName}] 选区内容无需格式化`);
    return;
  }

  await orca.commands.invokeEditorCommand(
    "core.editor.setBlocksContent",
    null,
    updates,
    false
  );
  orca.notify('info', `[${currentPluginName}] 已格式化并写回 ${updates.length} 个块`);
}

/**
 * 应用并验证全局基础字体大小设置。
 * @param {string} baseFontSizeSetting - 从设置中获取的原始 baseFontSize 值。
 */
function applyBaseFontSizeSetting(baseFontSizeSetting) {
  let finalBaseFontSizeToApplyPx = DEFAULT_BASE_FONT_SIZE_STRING; // 初始化为 schema 的默认字符串值
  let validationNotification = null;

  if (baseFontSizeSetting && typeof baseFontSizeSetting === 'string' && baseFontSizeSetting.trim() !== '') {
    const trimmedUserInput = baseFontSizeSetting.trim();
    if (trimmedUserInput.toLowerCase().endsWith('px')) {
      const numericValue = parseFloat(trimmedUserInput.replace(/px/i, ''));
      if (!isNaN(numericValue)) {
        if (numericValue < MIN_BASE_FONT_SIZE_PX) {
          validationNotification = `输入的基础字体大小 "${trimmedUserInput}" 小于允许的最小值 ${MIN_BASE_FONT_SIZE_PX}px。已应用默认大小 "${DEFAULT_BASE_FONT_SIZE_STRING}"。`;
        } else if (numericValue > MAX_BASE_FONT_SIZE_PX) {
          validationNotification = `输入的基础字体大小 "${trimmedUserInput}" 大于允许的最大值 ${MAX_BASE_FONT_SIZE_PX}px。已应用默认大小 "${DEFAULT_BASE_FONT_SIZE_STRING}"。`;
        } else {
          finalBaseFontSizeToApplyPx = trimmedUserInput; // 输入值在允许的 px 范围内
        }
      } else { // 'px' 后不是有效数字
        validationNotification = `基础字体大小 "${trimmedUserInput}" 不是有效的像素值。已应用默认大小 "${DEFAULT_BASE_FONT_SIZE_STRING}"。`;
      }
    } else { // 不是 'px' 单位 (例如 'em', 'rem', '%')，则直接应用
      finalBaseFontSizeToApplyPx = trimmedUserInput;
      console.log(`[${currentPluginName}] Applying non-px baseFontSize: ${finalBaseFontSizeToApplyPx}`);
    }
  } else { // baseFontSizeSetting 为空字符串、null 或 undefined
    console.log(`[${currentPluginName}] baseFontSizeSetting was empty. Using schema default: ${DEFAULT_BASE_FONT_SIZE_STRING}`);
    // finalBaseFontSizeToApplyPx 此时已经是 DEFAULT_BASE_FONT_SIZE_STRING
  }

  if (validationNotification) {
    orca.notify("warn", `[${currentPluginName}] ${validationNotification}`);
    console.warn(`[${currentPluginName}] ${validationNotification} (Original input: "${baseFontSizeSetting}", Effective value for ${CSS_VAR_BASE_FONT_SIZE}: "${finalBaseFontSizeToApplyPx}")`);
  }
  applyOrRemoveCssVar(CSS_VAR_BASE_FONT_SIZE, finalBaseFontSizeToApplyPx);
}

/**
 * 应用全局行高设置。
 * @param {string} globalLineHeightSetting - 从设置中获取的 globalLineHeight 值。
 */
function applyGlobalLineHeightSetting(globalLineHeightSetting) {
  // 对于行高，我们暂时不加复杂验证，直接应用用户输入或默认值
  // 空值会通过 applyOrRemoveCssVar 被处理为移除属性
  applyOrRemoveCssVar(CSS_VAR_GLOBAL_LINE_HEIGHT, globalLineHeightSetting);
}


// --- 核心样式应用函数 (现在更为简洁) ---
function applyCustomStyles(savedSettings) {
  const baseFontSize = getSettingValue('baseFontSize', savedSettings);
  const globalLineHeight = getSettingValue('globalLineHeight', savedSettings);
  const bodyLigatures = getSettingValue('bodyLigatures', savedSettings);
  const codeLigatures = getSettingValue('codeLigatures', savedSettings);
  const numericTabular = getSettingValue('numericTabular', savedSettings);
  const formattingMode = String(getSettingValue('formattingMode', savedSettings) || 'preview');
  const enableAutoProcessing = toBool(getSettingValue('autoProcessing', savedSettings));
  const enableAutoSpacing = toBool(getSettingValue('enableAutoSpacing', savedSettings));
  const enableEnhancedSpacing = toBool(getSettingValue('enableEnhancedSpacing', savedSettings));
  const customSpacingRulesRaw = getSettingValue('customSpacingRules', savedSettings);
  const compiledSpacingRules = compileRules(customSpacingRulesRaw, '自定义空格规则');
  const enablePunctuationPreview = toBool(getSettingValue('enablePunctuationPreview', savedSettings));
  const enablePunctuationEnhanced = toBool(getSettingValue('enablePunctuationEnhanced', savedSettings));
  const punctuationStyle = String(getSettingValue('punctuationStyle', savedSettings) || 'mainland');
  const customPunctuationRulesRaw = getSettingValue('customPunctuationRules', savedSettings);
  const compiledPuncRules = compileRules(customPunctuationRulesRaw, '自定义标点规则');
  const transformRootSelector = getSettingValue('transformRootSelector', savedSettings);
  const transformDebounceMsStr = getSettingValue('transformDebounceMs', savedSettings);
  const unitWhitelistCsv = getSettingValue('unitWhitelist', savedSettings);
  const debounceMsParsed = parseInt(String(transformDebounceMsStr||'5000'),10);
  const debounceMs = isNaN(debounceMsParsed) ? 5000 : Math.max(0, debounceMsParsed);
  const unitRegex = buildUnitRegex(unitWhitelistCsv);
  const hardFormatToClipboard = toBool(getSettingValue('hardFormatToClipboard', savedSettings));
  const pauseTyping = toBool(getSettingValue('pauseOnTyping', savedSettings));
  const typingIdleMsStr = getSettingValue('typingIdleMs', savedSettings);
  const typingIdleMsParsed = parseInt(String(typingIdleMsStr||'3000'),10);
  const typingIdleMs = isNaN(typingIdleMsParsed) ? 3000 : Math.max(0, typingIdleMsParsed);
  const previewIncremental = toBool(getSettingValue('previewIncremental', savedSettings));
  const previewFullScanThresholdStr = getSettingValue('previewFullScanThreshold', savedSettings);
  const previewFullScanThresholdParsed = parseInt(String(previewFullScanThresholdStr||'200'),10);
  const previewFullScanThreshold = isNaN(previewFullScanThresholdParsed) ? 200 : Math.max(1, previewFullScanThresholdParsed);
  const autoBatchFlushMsStr = getSettingValue('autoBatchFlushMs', savedSettings);
  const autoBatchFlushMsParsed = parseInt(String(autoBatchFlushMsStr||'16'),10);
  const autoBatchFlushMs = isNaN(autoBatchFlushMsParsed) ? 16 : Math.max(0, autoBatchFlushMsParsed);
  const autoMinWriteIntervalMsStr = getSettingValue('autoMinWriteIntervalMs', savedSettings);
  const autoMinWriteIntervalMsParsed = parseInt(String(autoMinWriteIntervalMsStr||'80'),10);
  const autoMinWriteIntervalMs = isNaN(autoMinWriteIntervalMsParsed) ? 80 : Math.max(0, autoMinWriteIntervalMsParsed);

  applyBaseFontSizeSetting(baseFontSize);
  applyGlobalLineHeightSetting(globalLineHeight);
  updateTypographyStyles({ bodyLigatures, codeLigatures, numericTabular });
  
  // 根据 formattingMode 决定使用哪种格式化模式
  if (formattingMode === 'preview') {
    if (autoFormatter) autoFormatter.stop();
    // Preview Mode: 显示层格式化
    if (enableAutoProcessing && (enableAutoSpacing || enablePunctuationPreview)) {
      // 使用 PreviewFormatter
      if (!previewFormatter) {
        previewFormatter = new PreviewFormatter();
      }
      previewFormatter.start({
        enhanced: enableEnhancedSpacing,
        customSpacing: compiledSpacingRules,
        unitRe: unitRegex,
        exceptionRe: defaultExceptionRe,
        puncEnabled: enablePunctuationPreview,
        puncEnhanced: enablePunctuationEnhanced,
        puncStyle: punctuationStyle,
        customPunc: compiledPuncRules,
        rootSelector: String(transformRootSelector||''),
        debounceMs,
        highlight: false,
        pauseTyping,
        typingIdleMs,
        incremental: previewIncremental,
        fullScanThreshold: previewFullScanThreshold
      });
    } else {
      if (previewFormatter) {
        previewFormatter.stop();
      }
    }
  } else if (formattingMode === 'auto') {
    if (previewFormatter) previewFormatter.stop();
    // Auto Mode: 编辑层格式化
    if (enableAutoProcessing && (enableAutoSpacing || enablePunctuationPreview)) {
      // 使用 AutoFormatter
      if (!autoFormatter) {
        autoFormatter = new AutoFormatter();
      }
      autoFormatter.start({
        enhanced: enableEnhancedSpacing,
        customSpacing: compiledSpacingRules,
        unitRe: unitRegex,
        exceptionRe: defaultExceptionRe,
        puncEnabled: enablePunctuationPreview,
        puncEnhanced: enablePunctuationEnhanced,
        puncStyle: punctuationStyle,
        customPunc: compiledPuncRules,
        autoBatchFlushMs,
        autoMinWriteIntervalMs
      });
    } else {
      if (autoFormatter) {
        autoFormatter.stop();
      }
    }
  } else {
    if (previewFormatter) previewFormatter.stop();
    if (autoFormatter) autoFormatter.stop();
  }
  if(hardFormatToClipboard && !hardFormatOnceUsed){
    exportHardFormatToClipboard({
      enhanced: enableEnhancedSpacing,
      customSpacing: compiledSpacingRules,
      unitRe: unitRegex,
      exceptionRe: defaultExceptionRe,
      puncEnabled: true,
      puncEnhanced: enablePunctuationEnhanced,
      puncStyle: punctuationStyle,
      customPunc: compiledPuncRules,
      rootSelector: String(transformRootSelector||''),
      debounceMs,
      highlight: false,
      pauseTyping,
      typingIdleMs
    });
    hardFormatOnceUsed = true;
  }
  if(!hardFormatToClipboard){ hardFormatOnceUsed = false; }
}

/**
 * 从当前设置构建硬格式化配置对象
 */
function buildHardFormatConfig() {
  const settings = orca.state.plugins[currentPluginName]?.settings;
  const unitWhitelistCsv = getSettingValue('unitWhitelist', settings);
  const debounceMsStr = getSettingValue('transformDebounceMs', settings);
  const debounceMsParsed = parseInt(String(debounceMsStr||'5000'),10);
  return {
    enhanced: toBool(getSettingValue('enableEnhancedSpacing', settings)),
    customSpacing: compileRules(getSettingValue('customSpacingRules', settings), '自定义空格规则'),
    unitRe: buildUnitRegex(unitWhitelistCsv),
    exceptionRe: defaultExceptionRe,
    puncEnabled: true,
    puncEnhanced: toBool(getSettingValue('enablePunctuationEnhanced', settings)),
    puncStyle: String(getSettingValue('punctuationStyle', settings) || 'mainland'),
    customPunc: compileRules(getSettingValue('customPunctuationRules', settings), '自定义标点规则'),
    rootSelector: String(getSettingValue('transformRootSelector', settings)||''),
    debounceMs: isNaN(debounceMsParsed) ? 5000 : Math.max(0, debounceMsParsed),
    highlight: false
  };
}

// --- 插件生命周期函数 ---

/**
 * 插件加载时执行。
 * 负责注册设置、加载初始设置、应用样式、订阅设置变化。
 */
export async function load(pluginName) {
  currentPluginName = pluginName;
  try {
    const initialSettings = orca.state.plugins[currentPluginName]?.settings;
    const debugSetting = getSettingValue('debugLogs', initialSettings);
    setDebugLogging(toBool(debugSetting));
    console.log(`[${currentPluginName}] Plugin loading...`);

    await orca.plugins.setSettingsSchema(currentPluginName, settingsSchema);
    console.log(`[${currentPluginName}] Settings schema registered.`);

    applyCustomStyles(initialSettings);
    const cmdId = `${currentPluginName}.hardFormatClipboard`;
    orca.commands.registerCommand(cmdId, async () => {
      try{
        await exportHardFormatToClipboard(buildHardFormatConfig());
      }catch(e){
        console.error(`[${currentPluginName}] hardFormatClipboard error`, e);
        orca.notify('error', `[${currentPluginName}] 硬格式化失败：${e?.message||e}`);
      }
    }, "硬格式化到剪贴板");

    const cmdIdWrite = `${currentPluginName}.hardFormatWriteback`;
    orca.commands.registerCommand(cmdIdWrite, async () => {
      try{
        await hardFormatSelectionWriteback(buildHardFormatConfig());
      }catch(e){
        console.error(`[${currentPluginName}] hardFormatWriteback error`, e);
        orca.notify('error', `[${currentPluginName}] 硬格式化写回失败：${e?.message||e}`);
      }
    }, "硬格式化并写回选区");

    if (window.Valtio && typeof window.Valtio.subscribe === 'function') {
      const pluginSettingsPathRoot = ['plugins', currentPluginName, 'settings'];
      unsubscribeFromSettings = window.Valtio.subscribe(orca.state, (ops) => {
        const changedRelevantSettings = ops.some(opChange => {
          const path = opChange[1];
          return (
            Array.isArray(path) &&
            path.length >= pluginSettingsPathRoot.length &&
            path[0] === pluginSettingsPathRoot[0] &&
            path[1] === pluginSettingsPathRoot[1] &&
            path[2] === pluginSettingsPathRoot[2]
          );
        });

        if (changedRelevantSettings) {
          const newSettings = orca.state.plugins[currentPluginName]?.settings;
          console.log(`[${currentPluginName}] Settings changed via subscription`);
          const debugSetting2 = getSettingValue('debugLogs', newSettings);
          setDebugLogging(toBool(debugSetting2));
          applyCustomStyles(newSettings);
        }
      });
      console.log(`[${currentPluginName}] Subscribed to settings changes.`);
    } else {
      console.warn(`[${currentPluginName}] Valtio.subscribe not available. Settings changes may require plugin reload.`);
      orca.notify("warn", `[${currentPluginName}] 字体样式设置实时更新可能不可用，更改后请尝试重启插件或应用。`);
    }

    notifyInfo(`[${currentPluginName}] 插件已加载，请在设置中配置字体样式！`);
  } catch (error) {
    console.error(`[${currentPluginName}] Error loading plugin:`, error);
    orca.notify("error", `[${currentPluginName}] 加载失败: ${error.message}`);
  }
}

/**
 * 插件卸载时执行。
 * 负责清理工作，如取消订阅、移除动态添加的样式。
 */
export async function unload() {
  console.log(`[${currentPluginName}] Plugin unloading...`);

  // 取消订阅设置变化
  if (unsubscribeFromSettings) {
    unsubscribeFromSettings();
    unsubscribeFromSettings = null;
    console.log(`[${currentPluginName}] Unsubscribed from settings changes.`);
  }
  try{
    orca.commands.unregisterCommand(`${currentPluginName}.hardFormatClipboard`);
    orca.commands.unregisterCommand(`${currentPluginName}.hardFormatWriteback`);
  }catch(_){}

  // 移除所有本插件可能设置过的 CSS 自定义属性
  document.documentElement.style.removeProperty(CSS_VAR_BASE_FONT_SIZE);
  document.documentElement.style.removeProperty(CSS_VAR_GLOBAL_LINE_HEIGHT);

  // 清理 PreviewFormatter
  if (previewFormatter) {
    previewFormatter.stop();
    previewFormatter = null;
  }
  
  // 清理 AutoFormatter
  if (autoFormatter) {
    autoFormatter.stop();
    autoFormatter = null;
  }
  const styleEl = document.getElementById(TYPO_STYLE_ID);
  if (styleEl) styleEl.remove();
  console.log = originalConsoleLog;

  console.log(`[${currentPluginName}] Custom styles removed from :root.`);
  orca.notify("info", `[${currentPluginName}] 插件已卸载，自定义字体样式已移除。`);
}

// --- PreviewFormatter 类: 显示层格式化 ---
/**
 * PreviewFormatter 类负责显示层格式化
 * 不修改文档内容,仅修改 DOM 显示效果
 */
class PreviewFormatter {
  constructor() {
    this.observer = null;
    this.debounceTimer = null;
    this.root = null;
    this.typingHandlers = [];
    this.isUserTyping = false;
    this.typingIdleTimer = null;
    this.config = null;
    this.pendingRoots = new Set();
    this.needsFullScan = false;
    this.lastProcessReason = 'init';
  }

  /**
   * 启动显示层格式化
   * @param {Object} config - 配置对象
   */
  start(config) {
    if (this.observer) {
      this.applyConfig(config);
      return;
    }

    this.config = { ...config };
    this.root = getTransformRoot(this.config.rootSelector);

    processTree(this.root, this.config);
    
    // 启动 MutationObserver
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
      this.scheduleProcess('mutation');
    });
    this.observer.observe(this.root, { childList: true, characterData: true, subtree: true });
    
    // 启动输入监听
    this.startTypingHandlers();
    
    console.log(`[${currentPluginName}] PreviewFormatter started`);
  }

  /**
   * 停止显示层格式化
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.root = null;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.typingIdleTimer) {
      clearTimeout(this.typingIdleTimer);
      this.typingIdleTimer = null;
    }
    
    if (this.typingHandlers && this.typingHandlers.length) {
      for (const { t, h } of this.typingHandlers) {
        document.removeEventListener(t, h, true);
      }
      this.typingHandlers = [];
    }
    
    this.config = null;
    this.pendingRoots.clear();
    this.needsFullScan = false;
    this.lastProcessReason = 'stopped';
    
    console.log(`[${currentPluginName}] PreviewFormatter stopped`);
  }

  applyConfig(config) {
    const nextConfig = { ...config };
    const nextRoot = getTransformRoot(nextConfig.rootSelector);
    const rootChanged = this.root !== nextRoot;

    this.config = nextConfig;

    if (rootChanged && this.observer) {
      this.observer.disconnect();
      this.root = nextRoot;
      this.pendingRoots.clear();
      this.needsFullScan = true;
      this.observer.observe(this.root, { childList: true, characterData: true, subtree: true });
      this.scheduleProcess('root-change');
    }

    if (!rootChanged && this.root) {
      this.scheduleProcess('config-change');
    }
  }

  handleMutations(mutations) {
    if (!this.root || !mutations?.length) return;

    let touchedCount = 0;
    for (const m of mutations) {
      if (m.type === 'characterData') {
        const parent = m.target?.parentElement;
        if (parent && this.root.contains(parent)) {
          this.pendingRoots.add(parent);
          touchedCount++;
        }
      }

      if (m.type === 'childList') {
        if (m.target?.nodeType === Node.ELEMENT_NODE && this.root.contains(m.target)) {
          this.pendingRoots.add(m.target);
          touchedCount++;
        }

        if (m.addedNodes?.length) {
          m.addedNodes.forEach(n => {
            const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
            if (el && el.nodeType === Node.ELEMENT_NODE && this.root.contains(el)) {
              this.pendingRoots.add(el);
              touchedCount++;
            }
          });
        }
      }
    }

    const threshold = this.config?.fullScanThreshold || 200;
    if (!toBool(this.config?.incremental) || touchedCount > threshold || this.pendingRoots.size > threshold) {
      this.needsFullScan = true;
      this.pendingRoots.clear();
    }
  }

  /**
   * 调度处理
   */
  scheduleProcess(reason) {
    if (this.debounceTimer) return;

    if (this.config?.pauseTyping && this.isUserTyping) return;
    this.lastProcessReason = reason || 'scheduled';

    this.debounceTimer = setTimeout(() => {
      const startedAt = performance.now();
      this.debounceTimer = null;
      if (!this.root || !this.observer) return;
      // 暂停 observer 防止 processTree 修改 DOM 后触发循环
      this.observer.disconnect();
      let processedRoots = 0;
      try {
        const useIncremental = toBool(this.config?.incremental);
        if (useIncremental && !this.needsFullScan && this.pendingRoots.size > 0) {
          const roots = Array.from(this.pendingRoots);
          this.pendingRoots.clear();
          for (const r of roots) {
            if (r && r.isConnected) {
              processTree(r, this.config);
              processedRoots++;
            }
          }
        } else {
          processTree(this.root, this.config);
          processedRoots = 1;
          this.pendingRoots.clear();
          this.needsFullScan = false;
        }
      } finally {
        this.observer.observe(this.root, { childList: true, characterData: true, subtree: true });
      }
      if (debugLogsEnabled) {
        const cost = (performance.now() - startedAt).toFixed(1);
        console.log(`[${currentPluginName}] Preview process (${this.lastProcessReason}) roots=${processedRoots} incremental=${toBool(this.config?.incremental)} cost=${cost}ms`);
      }
    }, this.config?.debounceMs || 5000);
  }

  /**
   * 启动输入处理器
   */
  startTypingHandlers() {
    const markTyping = () => {
      if (!this.config?.pauseTyping) return;
      
      this.isUserTyping = true;
      
      if (this.typingIdleTimer) {
        clearTimeout(this.typingIdleTimer);
        this.typingIdleTimer = null;
      }
      
      this.typingIdleTimer = setTimeout(() => {
        this.isUserTyping = false;
        this.scheduleProcess('typing-idle');
      }, this.config?.typingIdleMs || 3000);
    };
    
    const types = ['input', 'beforeinput', 'compositionend', 'paste'];
    this.typingHandlers = types.map(t => {
      const h = (e) => {
        if (this.root && this.root.contains(e.target)) {
          markTyping();
        }
      };
      document.addEventListener(t, h, true);
      return { t, h };
    });
  }
}

// --- AutoFormatter 类: 编辑层格式化 ---
/**
 * AutoFormatter 类负责编辑层格式化
 * 直接修改文档内容,使用 Editor Command API
 */
class AutoFormatter {
  constructor() {
    this.dirtyBlocks = new Set(); // 需要格式化的块 ID
    this.formattingBlocks = new Set(); // 正在格式化的块 ID（避免循环格式化）
    this.currentBlockId = null;   // 当前光标所在的块 ID
    this.previousBlockId = null;  // 上一个光标所在的块 ID
    this.formatDebounceTimer = null;
    this.config = null;
    this.unsubscribe = null;
    this.pendingBlockIds = new Set();
    this.lastQueuedAt = new Map();
    this.flushTimer = null;
    this.isFlushing = false;
    this.lastWriteAt = 0;
    this.maxBatchSize = 20;
  }

  /**
   * 启动编辑层格式化
   * @param {Object} config - 配置对象
   */
  start(config) {
    if (this.unsubscribe) {
      this.applyConfig(config);
      return;
    }

    this.config = { ...config };
    this.dirtyBlocks.clear();
    this.pendingBlockIds.clear();
    this.currentBlockId = null;
    this.previousBlockId = null;

    // 订阅状态变化
    if (window.Valtio && typeof window.Valtio.subscribe === 'function') {
      this.unsubscribe = window.Valtio.subscribe(orca.state, (ops) => {
        this.handleStateChange(ops);
      });
      console.log(`[${currentPluginName}] AutoFormatter started`);
    } else {
      console.error(`[${currentPluginName}] AutoFormatter: Valtio.subscribe not available`);
    }
  }

  /**
   * 停止编辑层格式化
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.formatDebounceTimer) {
      clearTimeout(this.formatDebounceTimer);
      this.formatDebounceTimer = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.dirtyBlocks.clear();
    this.formattingBlocks.clear();
    this.pendingBlockIds.clear();
    this.lastQueuedAt.clear();
    this.currentBlockId = null;
    this.previousBlockId = null;
    this.config = null;
    this.isFlushing = false;
    this.lastWriteAt = 0;

    console.log(`[${currentPluginName}] AutoFormatter stopped`);
  }

  applyConfig(config) {
    this.config = { ...config };
    this.scheduleFlush();
  }

  /**
   * 处理状态变化
   */
  handleStateChange(ops) {
    ops.forEach(op => {
      const [type, path, newValue, oldValue] = op;
      if (type !== 'set' || !Array.isArray(path)) return;

      if (path.length === 2 && path[0] === 'blocks') {
        const blockId = path[1];

        if (!oldValue && newValue) {
          if (this.dirtyBlocks.size > 0) {
            const blocksToFormat = Array.from(this.dirtyBlocks);
            setTimeout(() => {
              blocksToFormat.forEach(dirtyBlockId => {
                if (dirtyBlockId !== blockId) this.scheduleFormat(dirtyBlockId);
              });
            }, 150);
          }
        }
        else if (newValue && oldValue && newValue.text !== oldValue.text) {
          if (this.formattingBlocks.has(blockId)) return;
          this.scheduleFormat(blockId);
        }
      }

      if (path.length >= 6 && path[3] === 'viewState' && path[5] === 'selection') {
        this.handleCursorMove(path[4]);
      } else if (path.length >= 3 && path[path.length - 1] === 'selection' && path.includes('viewState')) {
        // DOM fallback
        const sel = window.getSelection?.();
        if (sel?.rangeCount) {
          const bid = findBlockIdFromNode(sel.getRangeAt(0).commonAncestorContainer);
          if (bid) this.handleCursorMove(bid);
        }
      }
    });
  }

  /**
   * 处理光标移动到新块
   */
  handleCursorMove(newBlockId) {
    if (!newBlockId || newBlockId === this.currentBlockId) return;
    this.previousBlockId = this.currentBlockId;
    this.currentBlockId = newBlockId;
    if (this.previousBlockId && this.dirtyBlocks.has(this.previousBlockId)) {
      this.scheduleFormat(this.previousBlockId);
    }
  }

  /**
   * 调度格式化操作
   */
  scheduleFormat(blockId) {
    if (!blockId) return;
    this.dirtyBlocks.add(blockId);
    const now = Date.now();
    const dedupeWindowMs = 300;
    const lastAt = this.lastQueuedAt.get(blockId) || 0;
    if (now - lastAt < dedupeWindowMs) return;
    this.lastQueuedAt.set(blockId, now);
    this.pendingBlockIds.add(blockId);
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (this.flushTimer || this.isFlushing) return;
    const delay = this.config?.autoBatchFlushMs ?? 16;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushQueuedBlocks();
    }, Math.max(0, delay));
  }

  async flushQueuedBlocks() {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      const intervalMs = this.config?.autoMinWriteIntervalMs ?? 80;
      const waitMs = intervalMs - (Date.now() - this.lastWriteAt);
      if (waitMs > 0) await sleep(waitMs);

      const candidates = Array.from(this.pendingBlockIds).slice(0, this.maxBatchSize);
      if (!candidates.length) return;
      candidates.forEach(id => this.pendingBlockIds.delete(id));

      const updates = [];
      const startedAt = performance.now();
      for (const blockId of candidates) {
        const update = await this.formatBlock(blockId);
        if (update) updates.push(update);
      }
      if (updates.length) {
        await this.updateBlocksContent(updates);
        this.lastWriteAt = Date.now();
      }
      if (debugLogsEnabled) {
        const cost = (performance.now() - startedAt).toFixed(1);
        console.log(`[${currentPluginName}] Auto flush candidates=${candidates.length} updates=${updates.length} queue=${this.pendingBlockIds.size} cost=${cost}ms`);
      }
    } finally {
      this.isFlushing = false;
      if (this.pendingBlockIds.size > 0) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * 格式化块
   */
  async formatBlock(blockId) {
    if (!this.dirtyBlocks.has(blockId)) return null;

    try {
      const block = orca.state.blocks[blockId];
      if (!block) {
        console.warn(`[${currentPluginName}] Block not found: ${blockId}`);
        this.dirtyBlocks.delete(blockId);
        return null;
      }

      // 如果内容为空，跳过格式化
      if (!block.text?.trim()) {
        this.dirtyBlocks.delete(blockId);
        return null;
      }

      // 使用 formatContentFragments 保留富文本格式（bold/italic 等）
      const newContent = formatContentFragments(block.content || [], this.config);

      // newContent 为 null 表示无变化
      this.dirtyBlocks.delete(blockId);
      if (newContent) {
        return { id: parseInt(blockId), content: newContent };
      }
      return null;
    } catch (error) {
      console.error(`[${currentPluginName}] Format block error:`, error);
      return null;
    }
  }

  /**
   * 更新块内容（保留富文本格式）
   */
  async updateBlocksContent(updates) {
    try {
      if (!updates?.length) return;
      const validUpdates = updates.filter(item => item && orca.state.blocks?.[String(item.id)]);
      if (!validUpdates.length) return;
      validUpdates.forEach(item => this.formattingBlocks.add(String(item.id)));

      await orca.commands.invokeEditorCommand(
        "core.editor.setBlocksContent",
        null,
        validUpdates,
        false
      );

      console.log(`[${currentPluginName}] Updated ${validUpdates.length} block(s) content`);

      setTimeout(() => {
        validUpdates.forEach(item => this.formattingBlocks.delete(String(item.id)));
      }, 500);
    } catch (error) {
      console.error(`[${currentPluginName}] Update block content error:`, error);
      updates?.forEach(item => this.formattingBlocks.delete(String(item.id)));
    }
  }
}
