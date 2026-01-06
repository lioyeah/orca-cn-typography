// orca-cn-typography/dist/index.js
// Version: 1.1.0 (添加了全局行高，并进行了代码结构优化和注释)
// Description: OrcaNote 插件，用于自定义字体族、全局基础字体大小和全局行高。

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
    label: "📝 排版模式",
    type: "string",
    defaultValue: "auto",
    description: "• preview: 预览模式 - 仅视觉显示优化，不修改原文\n• auto: 自动模式 - 按 Enter 时自动应用格式化（可撤销）"
  },
  autoProcessing: {
    label: "✨ 自动处理总开关",
    type: "boolean",
    defaultValue: true,
    description: "开启后实时应用排版规则。关闭则只能通过命令手动格式化。"
  },
  enableAutoSpacing: {
    label: "🔤 中英文自动空格",
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
    defaultValue: "",
    description: "JSON 格式自定义规则。示例：[{\"pattern\":\"(?<=[0-9])GB\\\\b\",\"replacement\":\" GB\"}]"
  },
  enablePunctuationPreview: {
    label: "🔣 标点符号规范化",
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
    description: "• mainland: 中文用""和''（大陆）\n• tw-hk: 中文用「」和『』（港台）\n• tech: 中英文混排优化"
  },
  customPunctuationRules: {
    label: "   ↳ 自定义标点规则 (高级)",
    type: "string",
    defaultValue: "",
    description: "JSON 格式自定义规则。示例：[{\"pattern\":\""([^"]+)"\",\"replacement\":\"『$1』\"}]"
  },
  bodyLigatures: {
    label: "🔗 正文连字",
    type: "boolean",
    defaultValue: true,
    description: "在正文中启用字体连字，优化西文排版（如 fi、fl 连字）"
  },
  codeLigatures: {
    label: "💻 代码连字",
    type: "boolean",
    defaultValue: false,
    description: "在代码块中启用连字。默认关闭以避免符号混淆（如 != 和 ≠）"
  },
  numericTabular: {
    label: "📊 表格数字对齐",
    type: "boolean",
    defaultValue: true,
    description: "使用等宽数字，在表格和数据对齐场景更清晰"
  },
  transformRootSelector: {
    label: "⚙️ 作用范围选择器 (高级)",
    type: "string",
    defaultValue: ".markdown-body",
    description: "CSS 选择器，限定排版规则的作用范围。默认值适用于大多数情况"
  },
  transformDebounceMs: {
    label: "⚙️ 变换防抖延迟 (高级)",
    type: "string",
    defaultValue: "5000",
    description: "文档变化后延迟多少毫秒再应用排版（单位：毫秒）。数值越大性能越好但响应越慢"
  },
  pauseOnTyping: {
    label: "⌨️ 输入时暂停处理",
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
  unitWhitelist: {
    label: "⚙️ 单位白名单 (高级)",
    type: "string",
    defaultValue: "GB,Gbps,TB,MB,KB,px,ms,s,GHz,MHz,B,KiB,MiB,GiB,TiB,ns,us,µs,min,h",
    description: "逗号分隔的单位列表，用于数字与单位间自动加空格"
  },
  debugLogs: {
    label: "🐛 调试日志",
    type: "boolean",
    defaultValue: false,
    description: "启用后在浏览器控制台显示详细的调试信息。仅供开发调试使用"
  },
  hardFormatToClipboard: {
    label: "📋 一次性格式化到剪贴板",
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

/**
 * 通用的 CSS 变量应用或移除函数。
 * @param {string} variableName - 要设置的 CSS 变量名 (例如 '--my-color')。
 * @param {string} value - 要设置的值。如果值为空字符串、null 或 undefined，则移除该变量。
 */
function applyOrRemoveCssVar(variableName, value) {
  if (value && typeof value === 'string' && value.trim() !== '') {
    document.documentElement.style.setProperty(variableName, value, 'important');
    console.log(`[${currentPluginName}] applyCustomStyles TRACE - Applied ${variableName}: ${value}`);
  } else {
    document.documentElement.style.removeProperty(variableName);
    console.log(`[${currentPluginName}] applyCustomStyles TRACE - Removed ${variableName} (value was effectively empty).`);
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

let textTransformObserver = null;
let textTransformDebounceTimer = null;
let textTransformRoot = null;
let textTransformTypingHandlers = [];
let isUserTyping = false;
let typingIdleTimer = null;
let hardFormatOnceUsed = false;

// PreviewFormatter 实例
let previewFormatter = null;

// AutoFormatter 实例
let autoFormatter = null;
function compileRules(json){
  try{
    const arr = JSON.parse(String(json||''));
    if(!Array.isArray(arr)) return [];
    return arr.map(r=>({p:new RegExp(r.pattern,'g'),rep:String(r.replacement||'')})).filter(x=>x.p);
  }catch(_){ return []; }
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
function replaceSelectionWithText(text){
  try{
    if(document.queryCommandSupported && document.queryCommandSupported('insertText')){
      const ok=document.execCommand('insertText', false, text);
      if(ok) return true;
    }
  }catch(_){}
  const sel=window.getSelection && window.getSelection();
  if(!sel || !sel.rangeCount) return false;
  const range=sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  sel.removeAllRanges();
  const r=document.createRange();
  r.selectNodeContents(range.commonAncestorContainer);
  sel.addRange(r);
  return true;
}
async function hardFormatSelectionWriteback(cfg){
  const root=getEffectiveRootForSelection(cfg.rootSelector);
  const holder=getSelectionHolder(root);
  processTree(holder,{...cfg, detached:true});
  const text=collectFormattedText(holder);
  const blocksCount = holder.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, blockquote, section').length;
  if(blocksCount>1){
    await copyText(text);
    orca.notify('warn', `[${currentPluginName}] 检测到多块选区，为避免合并块与不可撤销，已复制到剪贴板，请使用粘贴完成写回。`);
    return;
  }
  const ok=replaceSelectionWithText(text);
  if(ok){ orca.notify('info', `[${currentPluginName}] 已写回选区的硬格式化文本`); }
  else { orca.notify('warn', `[${currentPluginName}] 未能写回选区，请手动粘贴剪贴板内容`); await copyText(text); }
}
function scheduleProcess(cfg){
  if(textTransformDebounceTimer) return;
  if(cfg.pauseTyping && isUserTyping) return;
  textTransformDebounceTimer = setTimeout(()=>{
    textTransformDebounceTimer = null;
    if(textTransformRoot) processTree(textTransformRoot,cfg);
  }, cfg.debounceMs || 5000);
}
function startTextTransforms(cfg){
  if(textTransformObserver) return;
  textTransformRoot = getTransformRoot(cfg.rootSelector);
  processTree(textTransformRoot,cfg);
  textTransformObserver=new MutationObserver((mut)=>{ scheduleProcess(cfg); });
  textTransformObserver.observe(textTransformRoot,{childList:true,subtree:true});
  const markTyping=()=>{
    if(!cfg.pauseTyping) return;
    isUserTyping = true;
    if(typingIdleTimer){ clearTimeout(typingIdleTimer); typingIdleTimer=null; }
    typingIdleTimer = setTimeout(()=>{
      isUserTyping = false;
      scheduleProcess(cfg);
    }, cfg.typingIdleMs || 3000);
  };
  const types=['keydown','keyup','input','beforeinput','compositionstart','compositionupdate','compositionend','paste'];
  textTransformTypingHandlers = types.map(t=>{
    const h=(e)=>{ if(textTransformRoot && textTransformRoot.contains(e.target)){ markTyping(); } };
    document.addEventListener(t,h,true);
    return {t, h};
  });
}
function stopTextTransforms(){
  if(textTransformObserver){
    textTransformObserver.disconnect();
    textTransformObserver=null;
  }
  textTransformRoot=null;
  if(textTransformDebounceTimer){ clearTimeout(textTransformDebounceTimer); textTransformDebounceTimer=null; }
  if(typingIdleTimer){ clearTimeout(typingIdleTimer); typingIdleTimer=null; }
  if(textTransformTypingHandlers && textTransformTypingHandlers.length){
    for(const {t,h} of textTransformTypingHandlers){ document.removeEventListener(t,h,true); }
    textTransformTypingHandlers = [];
  }
}

/**
 * 应用字体族相关的设置。
 * @param {object} params - 包含各字体族设置值的对象。
 * @param {string} params.editorFontFamily
 * @param {string} params.uiFontFamily
 * @param {string} params.codeFontFamily
 */
function applyFontFamilySettings() {}

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
  const compiledSpacingRules = compileRules(customSpacingRulesRaw);
  const enablePunctuationPreview = toBool(getSettingValue('enablePunctuationPreview', savedSettings));
  const enablePunctuationEnhanced = toBool(getSettingValue('enablePunctuationEnhanced', savedSettings));
  const punctuationStyle = String(getSettingValue('punctuationStyle', savedSettings) || 'mainland');
  const customPunctuationRulesRaw = getSettingValue('customPunctuationRules', savedSettings);
  const compiledPuncRules = compileRules(customPunctuationRulesRaw);
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

  applyFontFamilySettings();
  applyBaseFontSizeSetting(baseFontSize);
  applyGlobalLineHeightSetting(globalLineHeight);
  updateTypographyStyles({ bodyLigatures, codeLigatures, numericTabular });
  
  // 根据 formattingMode 决定使用哪种格式化模式
  if (formattingMode === 'preview') {
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
        typingIdleMs
      });
    } else {
      if (previewFormatter) {
        previewFormatter.stop();
      }
    }
  } else if (formattingMode === 'auto') {
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
        customPunc: compiledPuncRules
      });
    } else {
      if (autoFormatter) {
        autoFormatter.stop();
      }
    }
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
    console.log(`[${currentPluginName}] load TRACE - 1. Plugin loading... (Version: 1.1.0)`);

    await orca.plugins.setSettingsSchema(currentPluginName, settingsSchema);
    console.log(`[${currentPluginName}] load TRACE - 2. Settings schema registered.`);

    applyCustomStyles(initialSettings);
    const cmdId = `${currentPluginName}.hardFormatClipboard`;
    orca.commands.registerCommand(cmdId, async () => {
      try{
        const settings = orca.state.plugins[currentPluginName]?.settings;
        const enableEnhancedSpacing = toBool(getSettingValue('enableEnhancedSpacing', settings));
        const customSpacingRulesRaw = getSettingValue('customSpacingRules', settings);
        const compiledSpacingRules = compileRules(customSpacingRulesRaw);
        const enablePunctuationEnhanced = toBool(getSettingValue('enablePunctuationEnhanced', settings));
        const punctuationStyle = String(getSettingValue('punctuationStyle', settings) || 'mainland');
        const customPunctuationRulesRaw = getSettingValue('customPunctuationRules', settings);
        const compiledPuncRules = compileRules(customPunctuationRulesRaw);
        const transformRootSelector = getSettingValue('transformRootSelector', settings);
        const transformDebounceMsStr = getSettingValue('transformDebounceMs', settings);
        const unitWhitelistCsv = getSettingValue('unitWhitelist', settings);
        const debounceMsParsed = parseInt(String(transformDebounceMsStr||'5000'),10);
        const debounceMs = isNaN(debounceMsParsed) ? 5000 : Math.max(0, debounceMsParsed);
        const unitRegex = buildUnitRegex(unitWhitelistCsv);
        await exportHardFormatToClipboard({
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
          highlight: false
        });
      }catch(e){
        console.error(`[${currentPluginName}] hardFormatClipboard error`, e);
        orca.notify('error', `[${currentPluginName}] 硬格式化失败：${e?.message||e}`);
      }
    }, "硬格式化到剪贴板");
    
    const cmdIdWrite = `${currentPluginName}.hardFormatWriteback`;
    orca.commands.registerCommand(cmdIdWrite, async () => {
      try{
        const settings = orca.state.plugins[currentPluginName]?.settings;
        const enableEnhancedSpacing = toBool(getSettingValue('enableEnhancedSpacing', settings));
        const customSpacingRulesRaw = getSettingValue('customSpacingRules', settings);
        const compiledSpacingRules = compileRules(customSpacingRulesRaw);
        const enablePunctuationEnhanced = toBool(getSettingValue('enablePunctuationEnhanced', settings));
        const punctuationStyle = String(getSettingValue('punctuationStyle', settings) || 'mainland');
        const customPunctuationRulesRaw = getSettingValue('customPunctuationRules', settings);
        const compiledPuncRules = compileRules(customPunctuationRulesRaw);
        const transformRootSelector = getSettingValue('transformRootSelector', settings);
        const transformDebounceMsStr = getSettingValue('transformDebounceMs', settings);
        const unitWhitelistCsv = getSettingValue('unitWhitelist', settings);
        const debounceMsParsed = parseInt(String(transformDebounceMsStr||'5000'),10);
        const debounceMs = isNaN(debounceMsParsed) ? 5000 : Math.max(0, debounceMsParsed);
        const unitRegex = buildUnitRegex(unitWhitelistCsv);
        await hardFormatSelectionWriteback({
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
          highlight: false
        });
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
          console.log(`[${currentPluginName}] load TRACE - 5. Settings changed via subscription`);
          const debugSetting2 = getSettingValue('debugLogs', newSettings);
          setDebugLogging(toBool(debugSetting2));
          applyCustomStyles(newSettings);
        }
      });
      console.log(`[${currentPluginName}] load TRACE - 6. Subscribed to settings changes.`);
    } else {
      console.warn(`[${currentPluginName}] load TRACE - 6. window.Valtio.subscribe not available. Settings changes may require plugin reload or app restart to apply.`);
      orca.notify("warn", `[${currentPluginName}] 字体样式设置实时更新可能不可用，更改后请尝试重启插件或应用。`);
    }

    notifyInfo(`[${currentPluginName}] 插件已加载，请在设置中配置字体样式！`);
  } catch (error) {
    console.error(`[${currentPluginName}] load TRACE - E. Error loading plugin:`, error);
    orca.notify("error", `[${currentPluginName}] 加载失败: ${error.message}`);
  }
}

/**
 * 插件卸载时执行。
 * 负责清理工作，如取消订阅、移除动态添加的样式。
 */
export async function unload() {
  console.log(`[${currentPluginName}] unload TRACE - 1. Plugin unloading...`);

  // 取消订阅设置变化
  if (unsubscribeFromSettings) {
    unsubscribeFromSettings();
    unsubscribeFromSettings = null;
    console.log(`[${currentPluginName}] unload TRACE - 2. Unsubscribed from settings changes.`);
  }
  try{
    orca.commands.unregisterCommand(`${currentPluginName}.hardFormatClipboard`);
    orca.commands.unregisterCommand(`${currentPluginName}.hardFormatWriteback`);
  }catch(_){}

  // 移除所有本插件可能设置过的 CSS 自定义属性
  document.documentElement.style.removeProperty(CSS_VAR_BASE_FONT_SIZE);
  document.documentElement.style.removeProperty(CSS_VAR_GLOBAL_LINE_HEIGHT);

  stopTextTransforms();
  
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

  console.log(`[${currentPluginName}] unload TRACE - 3. Custom font styles removed from :root.`);
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
  }

  /**
   * 启动显示层格式化
   * @param {Object} config - 配置对象
   */
  start(config) {
    if (this.observer) {
      console.warn(`[${currentPluginName}] PreviewFormatter already started`);
      return;
    }

    this.config = config;
    this.root = this.getRoot(config.rootSelector);
    
    // 立即处理一次
    this.processTree(this.root, config);
    
    // 启动 MutationObserver
    this.observer = new MutationObserver(() => {
      this.scheduleProcess();
    });
    this.observer.observe(this.root, { childList: true, subtree: true });
    
    // 启动输入监听
    this.startTypingHandlers(config);
    
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
    
    console.log(`[${currentPluginName}] PreviewFormatter stopped`);
  }

  /**
   * 获取格式化根元素
   */
  getRoot(selector) {
    if (selector) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (_) {}
    }
    const md = document.querySelector('.markdown-body');
    return md || document.body;
  }

  /**
   * 调度处理
   */
  scheduleProcess() {
    if (this.debounceTimer) return;
    
    if (this.config?.pauseTyping && this.isUserTyping) return;
    
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (this.root) this.processTree(this.root, this.config);
    }, this.config?.debounceMs || 5000);
  }

  /**
   * 启动输入处理器
   */
  startTypingHandlers(config) {
    const markTyping = () => {
      if (!config?.pauseTyping) return;
      
      this.isUserTyping = true;
      
      if (this.typingIdleTimer) {
        clearTimeout(this.typingIdleTimer);
        this.typingIdleTimer = null;
      }
      
      this.typingIdleTimer = setTimeout(() => {
        this.isUserTyping = false;
        this.scheduleProcess();
      }, config?.typingIdleMs || 3000);
    };
    
    const types = ['keydown', 'keyup', 'input', 'beforeinput', 'compositionstart', 'compositionupdate', 'compositionend', 'paste'];
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

  /**
   * 处理 DOM 树
   */
  processTree(root, cfg) {
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          if (!n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
          if (this.shouldSkipTextNode(n, cfg)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      
      let node;
      while ((node = walker.nextNode())) {
        const t = node.nodeValue;
        let s = this.applySpacing(t, cfg);
        s = this.applyPunctuation(s, {
          enabled: cfg.puncEnabled,
          enhanced: cfg.puncEnhanced,
          style: cfg.puncStyle,
          customPunc: cfg.customPunc
        });
        
        if (s !== t) {
          node.nodeValue = s;
          if (cfg.highlight) {
            const p = node.parentElement;
            if (p) p.setAttribute('data-typo-touched', '');
          }
        }
      }
    } catch (_) {}
  }

  /**
   * 判断是否跳过文本节点
   */
  shouldSkipTextNode(n, cfg) {
    const el = n.parentElement;
    if (!el) return true;
    
    const skip = ['CODE', 'PRE', 'KBD', 'SAMP', 'SCRIPT', 'STYLE', 'A'];
    if (skip.includes(el.tagName)) return true;
    
    if (el.closest('[contenteditable="true"], textarea, input')) return true;
    if (el.closest('code, pre, kbd, samp')) return true;
    if (el.closest('.code, .code-block, .inline-code')) return true;
    if (el.closest('[class*="hljs"], [class*="code"], [role="code"], [data-code-block], [data-lang], [data-language]')) return true;
    if (!cfg?.detached && el.closest('.cm-content, .cm-line, .CodeMirror, .monaco-editor, .ace_editor')) return true;
    
    return false;
  }

  /**
   * 应用空格规则
   */
  applySpacing(s, cfg) {
    s = String(s).replace(reCjkThenLat, '$1 $2').replace(reLatThenCjk, '$1 $2');
    
    if (cfg.enhanced) {
      const uRe = cfg.unitRe || buildUnitRegex('');
      const exRe = cfg.exceptionRe || defaultExceptionRe;
      s = s.replace(uRe, '$1 ').replace(exRe, '$1$2');
    }
    
    for (const r of (cfg.customSpacing || [])) {
      try {
        s = s.replace(r.p, r.rep);
      } catch (_) {}
    }
    
    return s;
  }

  /**
   * 应用标点规则
   */
  applyPunctuation(s, cfg) {
    if (!cfg.enabled) return s;
    
    s = String(s);
    
    if (cfg.enhanced) {
      s = s.replace(beforeFullWidth, '$1').replace(afterOpening, '$1');
    }
    
    const style = (cfg.style || 'mainland').toLowerCase();
    
    if (style === 'mainland') {
      s = s.replace(/『([^』]+)』/g, '\u2018$1\u2019').replace(/「([^「]+)」/g, '\u201c$1\u201d');
      s = s.replace(new RegExp('(' + CJK_RANGE + ')\\s*"([^"]+)"\\s*(' + CJK_RANGE + ')', 'g'), '$1\u201c$2\u201d$3');
      s = s.replace(new RegExp('(' + CJK_RANGE + ")\\s*'([^']+)'\\s*(" + CJK_RANGE + ')', 'g'), '$1\u2018$2\u2019$3');
    } else if (style === 'tw-hk') {
      s = s.replace(/"([^"]+)"/g, '\u300c$1\u300d').replace(/'([^']+)'/g, '\u300e$1\u300f');
    } else if (style === 'tech') {
      s = s.replace(/『([^』]+)』/g, '\u2018$1\u2019').replace(/「([^「]+)」/g, '\u201c$1\u201d');
    }
    
    for (const r of (cfg.customPunc || [])) {
      try {
        s = s.replace(r.p, r.rep);
      } catch (_) {}
    }
    
    return s;
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
  }

  /**
   * 启动编辑层格式化
   * @param {Object} config - 配置对象
   */
  start(config) {
    if (this.unsubscribe) {
      console.warn(`[${currentPluginName}] AutoFormatter already started`);
      return;
    }

    this.config = config;
    this.dirtyBlocks.clear();
    this.currentBlockId = null;
    this.previousBlockId = null;

    console.log(`[${currentPluginName}] AutoFormatter starting...`);
    console.log(`[${currentPluginName}] orca.state structure:`, {
      hasBlocks: !!orca.state.blocks,
      blocksKeys: orca.state.blocks ? Object.keys(orca.state.blocks) : [],
      hasCursor: !!orca.state.cursor,
      cursor: orca.state.cursor,
      allStateKeys: Object.keys(orca.state)
    });

    // 订阅状态变化
    if (window.Valtio && typeof window.Valtio.subscribe === 'function') {
      this.unsubscribe = window.Valtio.subscribe(orca.state, (ops) => {
        this.handleStateChange(ops);
      });
      console.log(`[${currentPluginName}] AutoFormatter started and subscribed to state changes`);
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

    this.dirtyBlocks.clear();
    this.formattingBlocks.clear();
    this.currentBlockId = null;
    this.previousBlockId = null;
    this.config = null;

    console.log(`[${currentPluginName}] AutoFormatter stopped`);
  }

  /**
   * 处理状态变化
   */
  handleStateChange(ops) {
    console.log(`[${currentPluginName}] handleStateChange - Received ${ops.length} ops`);

    ops.forEach(op => {
      const [type, path, newValue, oldValue] = op;

      // 输出完整的路径信息
      const pathStr = path.join('.');
      console.log(`[${currentPluginName}] State change: type=${type}, path=[${pathStr}], newValue=`, newValue, ', oldValue=', oldValue);

      // 监听块变化 - OrcaNote 会设置整个块对象，而不是单独的 text 字段
      if (type === 'set' && path.length === 2 && path[0] === 'blocks') {
        const blockId = path[1];

        // 检测新块创建（oldValue 为 undefined 或 null）
        if (!oldValue && newValue) {
          console.log(`[${currentPluginName}] ✓ New block created: ${blockId}`);

          // 新块创建时，延迟格式化所有 dirty 块
          // 延迟是为了等待 OrcaNote 完成所有内部更新
          if (this.dirtyBlocks.size > 0) {
            console.log(`[${currentPluginName}] New block created, scheduling formatting for ${this.dirtyBlocks.size} dirty block(s) after delay`);
            const blocksToFormat = Array.from(this.dirtyBlocks);

            // 延迟 150ms 后格式化，让 OrcaNote 完成所有更新
            setTimeout(() => {
              blocksToFormat.forEach(dirtyBlockId => {
                if (dirtyBlockId !== blockId) { // 不格式化刚创建的空块
                  this.scheduleFormat(dirtyBlockId);
                }
              });
            }, 150);
          }
        }
        // 检查现有块的 text 字段是否发生了变化
        else if (newValue && oldValue && newValue.text !== oldValue.text) {
          // 忽略正在格式化的块的状态变化（避免循环格式化）
          if (this.formattingBlocks.has(blockId)) {
            console.log(`[${currentPluginName}] Ignoring text change in formatting block: ${blockId}`);
            return;
          }

          this.dirtyBlocks.add(blockId);
          console.log(`[${currentPluginName}] ✓ Block marked as dirty: ${blockId} (text changed)`);

          // 不立即格式化，只在新块创建时触发格式化
          // 这样最稳健，不会干扰用户输入
        }
      }

      // 监听光标/选择变化 - 从路径中提取块 ID
      if (type === 'set') {
        // 路径格式: panels.children.0.viewState.{blockId}.selection
        if (pathStr.includes('viewState') && pathStr.includes('selection')) {
          console.log(`[${currentPluginName}] ✓ Selection/Cursor state detected: [${pathStr}]`);

          // 从路径中提取块 ID
          // 路径格式: ['panels', 'children', '0', 'viewState', 'blockId', 'selection']
          if (path.length >= 6 && path[3] === 'viewState' && path[5] === 'selection') {
            const blockIdFromPath = path[4];
            console.log(`[${currentPluginName}] Extracted block ID from path: ${blockIdFromPath}`);
            this.handleCursorChangeWithBlockId(blockIdFromPath);
          } else {
            // 降级到 DOM 查找
            console.log(`[${currentPluginName}] Could not extract block ID from path, using DOM lookup`);
            this.handleCursorChange();
          }
        }
      }
    });
  }

  /**
   * 处理光标变化（使用直接传入的 block ID）
   */
  handleCursorChangeWithBlockId(newBlockId) {
    if (newBlockId && newBlockId !== this.currentBlockId) {
      // 光标移动到了新块
      this.previousBlockId = this.currentBlockId;
      this.currentBlockId = newBlockId;

      // 如果离开了上一个块,且该块需要格式化,则触发格式化
      if (this.previousBlockId && this.dirtyBlocks.has(this.previousBlockId)) {
        this.scheduleFormat(this.previousBlockId);
      }

      console.log(`[${currentPluginName}] ✓ Cursor moved: ${this.previousBlockId} -> ${this.currentBlockId}`);
    } else {
      console.log(`[${currentPluginName}] Cursor in same block: ${newBlockId} (no change)`);
      // 不在同一个块内格式化，避免干扰用户打字
    }
  }

  /**
   * 处理光标变化（通过 DOM 查找）
   */
  handleCursorChange() {
    console.log(`[${currentPluginName}] handleCursorChange called`);
    console.log(`[${currentPluginName}] currentBlockId:`, this.currentBlockId, 'previousBlockId:', this.previousBlockId);

    const newBlockId = this.getCurrentBlockId();
    console.log(`[${currentPluginName}] newBlockId from getCurrentBlockId():`, newBlockId);

    if (newBlockId && newBlockId !== this.currentBlockId) {
      // 光标移动到了新块
      this.previousBlockId = this.currentBlockId;
      this.currentBlockId = newBlockId;

      // 如果离开了上一个块,且该块需要格式化,则触发格式化
      if (this.previousBlockId && this.dirtyBlocks.has(this.previousBlockId)) {
        this.scheduleFormat(this.previousBlockId);
      }

      console.log(`[${currentPluginName}] ✓ Cursor moved: ${this.previousBlockId} -> ${this.currentBlockId}`);
    } else {
      console.log(`[${currentPluginName}] Cursor in same block: ${newBlockId} (no change)`);
      // 不在同一个块内格式化，避免干扰用户打字
    }
  }

  /**
   * 获取当前光标所在的块 ID
   */
  getCurrentBlockId() {
    try {
      console.log(`[${currentPluginName}] getCurrentBlockId - Starting...`);

      const sel = window.getSelection && window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const node = range.commonAncestorContainer;

        console.log(`[${currentPluginName}] getCurrentBlockId - Node:`, node, 'NodeType:', node.nodeType);

        // 查找最近的块元素
        let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        console.log(`[${currentPluginName}] getCurrentBlockId - Initial element:`, el);

        while (el && !this.isBlockElement(el)) {
          el = el.parentElement;
        }

        console.log(`[${currentPluginName}] getCurrentBlockId - Found element after search:`, el);

        if (el) {
          console.log(`[${currentPluginName}] getCurrentBlockId - Element is not null, checking attributes...`);

          // 方法1: 尝试从 data-block-id 属性获取
          const blockId = el.getAttribute('data-block-id');
          console.log(`[${currentPluginName}] getCurrentBlockId - data-block-id:`, blockId);
          if (blockId) {
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via data-block-id:`, blockId);
            return blockId;
          }

          // 方法2: 尝试从 data-id 属性获取
          const id = el.getAttribute('data-id');
          console.log(`[${currentPluginName}] getCurrentBlockId - data-id:`, id);
          if (id) {
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via data-id:`, id);
            return id;
          }

          // 方法3: 尝试从 id 属性获取(如果格式为 block-xxx)
          const elId = el.id;
          console.log(`[${currentPluginName}] getCurrentBlockId - id:`, elId);
          if (elId && elId.startsWith('block-')) {
            const result = elId.replace('block-', '');
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via id:`, result);
            return result;
          }

          // 方法4: 尝试从 orca-state 属性获取
          const orcaState = el.getAttribute('orca-state');
          console.log(`[${currentPluginName}] getCurrentBlockId - orca-state:`, orcaState);
          if (orcaState) {
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via orca-state:`, orcaState);
            return orcaState;
          }

          // 方法5: 尝试从 closest 查找带有 data-block-id 的父元素
          const parentWithBlockId = el.closest('[data-block-id]');
          console.log(`[${currentPluginName}] getCurrentBlockId - parent with data-block-id:`, parentWithBlockId);
          if (parentWithBlockId) {
            const parentBlockId = parentWithBlockId.getAttribute('data-block-id');
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via parent data-block-id:`, parentBlockId);
            return parentBlockId;
          }

          // 方法6: 尝试从 closest 查找带有 orca-state 的父元素
          const parentWithOrcaState = el.closest('[orca-state]');
          console.log(`[${currentPluginName}] getCurrentBlockId - parent with orca-state:`, parentWithOrcaState);
          if (parentWithOrcaState) {
            const parentOrcaState = parentWithOrcaState.getAttribute('orca-state');
            console.log(`[${currentPluginName}] getCurrentBlockId - ✓ Found via parent orca-state:`, parentOrcaState);
            return parentOrcaState;
          }

          console.log(`[${currentPluginName}] getCurrentBlockId - ✗ No block ID found on element:`, el);
          console.log(`[${currentPluginName}] getCurrentBlockId - Element attributes:`, {
            'data-block-id': el.getAttribute('data-block-id'),
            'data-id': el.getAttribute('data-id'),
            'id': el.id,
            'orca-state': el.getAttribute('orca-state'),
            'class': el.className
          });
        } else {
          console.log(`[${currentPluginName}] getCurrentBlockId - Element is null!`);
        }
      } else {
        console.log(`[${currentPluginName}] getCurrentBlockId - No selection or range`);
      }
    } catch (error) {
      console.error(`[${currentPluginName}] getCurrentBlockId error:`, error);
    }

    console.log(`[${currentPluginName}] getCurrentBlockId - Returning null`);
    return null;
  }

  /**
   * 判断是否为块元素
   */
  isBlockElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    return ['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'].includes(tag);
  }

  /**
   * 调度格式化操作
   */
  scheduleFormat(blockId) {
    if (this.formatDebounceTimer) {
      clearTimeout(this.formatDebounceTimer);
    }

    this.formatDebounceTimer = setTimeout(() => {
      this.formatBlock(blockId);
      this.formatDebounceTimer = null;
    }, 0); // 立即执行，不防抖，避免 OrcaNote 覆盖
  }

  /**
   * 格式化块
   */
  async formatBlock(blockId) {
    if (!this.dirtyBlocks.has(blockId)) {
      console.log(`[${currentPluginName}] Block already formatted: ${blockId}`);
      return;
    }

    try {
      const block = orca.state.blocks[blockId];
      if (!block) {
        console.warn(`[${currentPluginName}] Block not found: ${blockId}`);
        this.dirtyBlocks.delete(blockId);
        return;
      }

      // 应用格式化规则
      const originalText = block.text || '';

      // 移除所有尾部换行符（OrcaNote 会自动管理换行）
      const contentWithoutTrailing = originalText.replace(/\n*$/, '');

      console.log(`[${currentPluginName}] Original text:`, originalText);
      console.log(`[${currentPluginName}] Content without trailing newlines:`, contentWithoutTrailing);

      // 如果内容为空，跳过格式化
      if (!contentWithoutTrailing.trim()) {
        console.log(`[${currentPluginName}] Skipping empty block`);
        this.dirtyBlocks.delete(blockId);
        return;
      }

      // 只格式化有意义的内容部分
      let formattedContent = this.applySpacing(contentWithoutTrailing, this.config);
      formattedContent = this.applyPunctuation(formattedContent, {
        enabled: this.config.puncEnabled,
        enhanced: this.config.puncEnhanced,
        style: this.config.puncStyle,
        customPunc: this.config.customPunc
      });

      console.log(`[${currentPluginName}] Formatted content:`, formattedContent);

      // 如果文本有变化,使用 Editor Command 更新
      // 注意：不要添加换行符，OrcaNote 会自动管理
      if (formattedContent !== contentWithoutTrailing) {
        await this.updateBlockText(blockId, formattedContent, contentWithoutTrailing);
      }

      // 清除 dirty 标记
      this.dirtyBlocks.delete(blockId);

      console.log(`[${currentPluginName}] Block formatted: ${blockId}`);
    } catch (error) {
      console.error(`[${currentPluginName}] Format block error:`, error);
    }
  }

  /**
   * 更新块文本
   */
  async updateBlockText(blockId, newText, oldText) {
    try {
      console.log(`[${currentPluginName}] updateBlockText called for block ${blockId}`);
      console.log(`[${currentPluginName}] oldText:`, oldText);
      console.log(`[${currentPluginName}] newText:`, newText);

      // 详细检查块是否存在
      console.log(`[${currentPluginName}] Checking if block exists...`);
      console.log(`[${currentPluginName}] orca.state.blocks exists:`, !!orca.state.blocks);
      console.log(`[${currentPluginName}] blockId type:`, typeof blockId, `value:`, blockId);
      console.log(`[${currentPluginName}] block exists in state:`, !!orca.state.blocks?.[blockId]);
      console.log(`[${currentPluginName}] Available block IDs:`, orca.state.blocks ? Object.keys(orca.state.blocks).slice(0, 10) : 'none');

      // 检查块是否存在
      if (!orca.state.blocks || !orca.state.blocks[blockId]) {
        console.warn(`[${currentPluginName}] ⚠️ Block not found: ${blockId}`);
        console.warn(`[${currentPluginName}] This might be because the block was deleted or the ID is incorrect`);
        return;
      }

      const block = orca.state.blocks[blockId];
      console.log(`[${currentPluginName}] ✓ Block found:`, block);

      // 标记为正在格式化（避免循环格式化）
      this.formattingBlocks.add(blockId);
      console.log(`[${currentPluginName}] Marked block ${blockId} as formatting`);

      // 将文本转换为 content fragments 格式
      const newContent = [{ t: "t", v: newText }];

      console.log(`[${currentPluginName}] Calling core.editor.setBlocksContent`);
      console.log(`[${currentPluginName}] New content:`, newContent);

      // 使用 core.editor.setBlocksContent 命令更新块内容
      // 这会正确更新光标位置和 UI，但会记录到撤销栈
      const updates = [
        {
          id: parseInt(blockId),  // 确保 ID 是数字类型
          content: newContent
        }
      ];

      console.log(`[${currentPluginName}] Updates to apply:`, updates);
      console.log(`[${currentPluginName}] About to call orca.commands.invokeEditorCommand...`);

      await orca.commands.invokeEditorCommand(
        "core.editor.setBlocksContent",
        null,           // cursor 参数
        updates,        // 要更新的块数组
        false           // setBackCursor: 不恢复光标位置
      );

      console.log(`[${currentPluginName}] ✓ Block content updated via setBlocksContent`);

      // 延迟清除格式化标记
      setTimeout(() => {
        this.formattingBlocks.delete(blockId);
        console.log(`[${currentPluginName}] Removed formatting mark from block ${blockId}`);
      }, 500);

    } catch (error) {
      console.error(`[${currentPluginName}] ❌ Update block text error:`, error);
      console.error(`[${currentPluginName}] Error details:`, error.stack);
      console.error(`[${currentPluginName}] Error name:`, error.name);
      console.error(`[${currentPluginName}] Error message:`, error.message);
      // 确保清除格式化标记
      this.formattingBlocks.delete(blockId);
      throw error;
    }
  }

  /**
   * 应用空格规则
   */
  applySpacing(s, cfg) {
    s = String(s).replace(reCjkThenLat, '$1 $2').replace(reLatThenCjk, '$1 $2');
    
    if (cfg.enhanced) {
      const uRe = cfg.unitRe || buildUnitRegex('');
      const exRe = cfg.exceptionRe || defaultExceptionRe;
      s = s.replace(uRe, '$1 ').replace(exRe, '$1$2');
    }
    
    for (const r of (cfg.customSpacing || [])) {
      try {
        s = s.replace(r.p, r.rep);
      } catch (_) {}
    }
    
    return s;
  }

  /**
   * 应用标点规则
   */
  applyPunctuation(s, cfg) {
    if (!cfg.enabled) return s;
    
    s = String(s);
    
    if (cfg.enhanced) {
      s = s.replace(beforeFullWidth, '$1').replace(afterOpening, '$1');
    }
    
    const style = (cfg.style || 'mainland').toLowerCase();
    
    if (style === 'mainland') {
      s = s.replace(/『([^』]+)』/g, '\u2018$1\u2019').replace(/「([^「]+)」/g, '\u201c$1\u201d');
      s = s.replace(new RegExp('(' + CJK_RANGE + ')\\s*"([^"]+)"\\s*(' + CJK_RANGE + ')', 'g'), '$1\u201c$2\u201d$3');
      s = s.replace(new RegExp('(' + CJK_RANGE + ")\\s*'([^']+)'\\s*(" + CJK_RANGE + ')', 'g'), '$1\u2018$2\u2019$3');
    } else if (style === 'tw-hk') {
      s = s.replace(/"([^"]+)"/g, '\u300c$1\u300d').replace(/'([^']+)'/g, '\u300e$1\u300f');
    } else if (style === 'tech') {
      s = s.replace(/『([^』]+)』/g, '\u2018$1\u2019').replace(/「([^「]+)」/g, '\u201c$1\u201d');
    }
    
    for (const r of (cfg.customPunc || [])) {
      try {
        s = s.replace(r.p, r.rep);
      } catch (_) {}
    }
    
    return s;
  }
}
