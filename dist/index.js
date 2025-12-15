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
    label: `全局基础字体大小 (Base Font Size, 建议 ${MIN_BASE_FONT_SIZE_PX}px-${MAX_BASE_FONT_SIZE_PX}px)`,
    type: "string",
    defaultValue: DEFAULT_BASE_FONT_SIZE_STRING,
    description: `请输入像素值 (如 16px) 或其他单位 (如 1em)。像素值建议在 ${MIN_BASE_FONT_SIZE_PX}px 到 ${MAX_BASE_FONT_SIZE_PX}px 之间。超出此范围的像素值将使用默认值 "${DEFAULT_BASE_FONT_SIZE_STRING}"。`
  },
  globalLineHeight: {
    label: "全局行高 (Global Line Height)",
    type: "string",
    defaultValue: DEFAULT_GLOBAL_LINE_HEIGHT,
    description: `修改全局行高 (通过影响 ${CSS_VAR_GLOBAL_LINE_HEIGHT})。例如: "${DEFAULT_GLOBAL_LINE_HEIGHT}", "1.5", "1.8em"。`
  },
  autoProcessing: {
    label: "自动处理 (Auto Processing)",
    type: "boolean",
    defaultValue: true,
    description: "开启后实时应用空格与标点规则；关闭则仅硬格式化生效。"
  },
  enableAutoSpacing: {
    label: "智能中英数字间距 (Auto Spacing)",
    type: "boolean",
    defaultValue: false,
    description: "显示层自动空格：中文与英文/数字之间加空格；支持增强与自定义。"
  },
  enableEnhancedSpacing: {
    label: "增强空格规则 (Enhanced)",
    type: "boolean",
    defaultValue: true,
    description: "开启单位空格与°/%例外：如 10Gbps→10 Gbps；233°、15% 不加空格。"
  },
  customSpacingRules: {
    label: "自定义空格规则 (JSON)",
    type: "string",
    defaultValue: "",
    description: "示例: [{\"pattern\":\"(?<=[0-9])GB\\\\b\",\"replacement\":\" GB\"}]。pattern为正则(不含/)，replacement为替换文本；按序执行；仅作用显示层。"
  },
  enablePunctuationPreview: {
    label: "标点/引号规范预览 (Punctuation)",
    type: "boolean",
    defaultValue: false,
    description: "显示层规范化：去除不必要空格、引号样式转换。"
  },
  enablePunctuationEnhanced: {
    label: "增强标点规则",
    type: "boolean",
    defaultValue: true,
    description: "移除全角标点前空格、开口标点后空格等。"
  },
  punctuationStyle: {
    label: "引号风格 (Style)",
    type: "string",
    defaultValue: "mainland",
    description: "mainland: 中文用“”/‘’；tw-hk: 中文用「」/『』；tech: 中文用“”/‘’，英文ASCII引号保留。"
  },
  customPunctuationRules: {
    label: "自定义标点规则 (JSON)",
    type: "string",
    defaultValue: "",
    description: "示例: [{\"pattern\":\"“([^”]+)”\",\"replacement\":\"『$1』\"}]。用于按需覆盖转换。"
  },
  bodyLigatures: {
    label: "正文连字 (Body Ligatures)",
    type: "boolean",
    defaultValue: true,
    description: "在正文区域启用字体连字以优化西文排版。"
  },
  codeLigatures: {
    label: "代码连字 (Code Ligatures)",
    type: "boolean",
    defaultValue: false,
    description: "在代码区域启用连字。默认关闭以避免符号误读。"
  },
  numericTabular: {
    label: "表格数字对齐 (Tabular Numerics)",
    type: "boolean",
    defaultValue: true,
    description: "启用等宽数字，在表格和对齐场景更清晰。"
  },
  transformRootSelector: {
    label: "变换作用范围选择器 (Root Selector)",
    type: "string",
    defaultValue: ".markdown-body",
    description: "文本变换的根容器选择器。若匹配不到则回退至 body。"
  },
  transformDebounceMs: {
    label: "变换防抖毫秒 (Debounce Ms)",
    type: "string",
    defaultValue: "5000",
    description: "MutationObserver 的防抖时间，单位毫秒。数值越大性能越稳但实时性降低。"
  },
  pauseOnTyping: {
    label: "输入时暂停实时处理",
    type: "boolean",
    defaultValue: true,
    description: "打字期间暂停变换，空闲后再处理。"
  },
  typingIdleMs: {
    label: "输入空闲触发毫秒",
    type: "string",
    defaultValue: "3000",
    description: "在用户停止输入后延迟多少毫秒再进行处理。"
  },
  unitWhitelist: {
    label: "单位白名单 (Units CSV)",
    type: "string",
    defaultValue: "GB,Gbps,TB,MB,KB,px,ms,s,GHz,MHz,B,KiB,MiB,GiB,TiB,ns,us,µs,min,h",
    description: "逗号分隔的单位列表，用于数字与单位之间自动加空格。"
  },
  debugLogs: {
    label: "调试日志 (Debug Logs)",
    type: "boolean",
    defaultValue: false,
    description: "启用后将显示详细的调试日志与信息通知。默认关闭以减少噪声。"
  },
  hardFormatToClipboard: {
    label: "硬格式化到剪贴板 (一次性)",
    type: "boolean",
    defaultValue: false,
    description: "将当前变换后的文本导出为纯文本到剪贴板。"
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
  if (enableAutoProcessing && (enableAutoSpacing || enablePunctuationPreview)) {
    startTextTransforms({
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
    stopTextTransforms();
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
  const styleEl = document.getElementById(TYPO_STYLE_ID);
  if (styleEl) styleEl.remove();
  console.log = originalConsoleLog;

  console.log(`[${currentPluginName}] unload TRACE - 3. Custom font styles removed from :root.`);
  orca.notify("info", `[${currentPluginName}] 插件已卸载，自定义字体样式已移除。`);
}
