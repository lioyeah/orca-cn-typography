# 性能复测脚本与对比模板

## 1) 复测脚本（控制台粘贴执行）

```js
(() => {
  if (window.__typoPerf?.stop) window.__typoPerf.stop();

  const root =
    document.querySelector(".markdown-body") ||
    document.querySelector("[contenteditable='true']") ||
    document.body;

  const state = {
    secStart: performance.now(),
    frames: 0,
    fps: 0,
    mutations: 0,
    textMutations: 0,
    inputEvents: 0,
    inputLagSamples: [],
    longTasks: 0,
    longTaskTotalMs: 0,
    editorCalls: 0,
    setBlocksCalls: 0,
    setBlocksMs: [],
  };

  const originalInvoke = window.orca?.commands?.invokeEditorCommand?.bind(window.orca?.commands);
  if (originalInvoke) {
    window.orca.commands.invokeEditorCommand = async function (...args) {
      const t0 = performance.now();
      try {
        return await originalInvoke(...args);
      } finally {
        const dt = performance.now() - t0;
        state.editorCalls++;
        if (args[0] === "core.editor.setBlocksContent") {
          state.setBlocksCalls++;
          state.setBlocksMs.push(dt);
          if (state.setBlocksMs.length > 300) state.setBlocksMs.shift();
        }
      }
    };
  }

  const mo = new MutationObserver((list) => {
    state.mutations += list.length;
    for (const m of list) if (m.type === "characterData") state.textMutations++;
  });
  mo.observe(root, { subtree: true, childList: true, characterData: true });

  const onInput = (e) => {
    state.inputEvents++;
    const lag = performance.now() - e.timeStamp;
    if (lag >= 0 && Number.isFinite(lag)) {
      state.inputLagSamples.push(lag);
      if (state.inputLagSamples.length > 500) state.inputLagSamples.shift();
    }
  };
  ["input", "beforeinput", "compositionend", "paste"].forEach((t) =>
    document.addEventListener(t, onInput, true)
  );

  let longTaskObserver = null;
  if (window.PerformanceObserver) {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          state.longTasks++;
          state.longTaskTotalMs += e.duration;
        }
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {}
  }

  let rafId = 0;
  const rafLoop = () => {
    state.frames++;
    rafId = requestAnimationFrame(rafLoop);
  };
  rafId = requestAnimationFrame(rafLoop);

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const p95 = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor((s.length - 1) * 0.95)];
  };

  const reporter = setInterval(() => {
    const now = performance.now();
    const sec = (now - state.secStart) / 1000;
    state.fps = state.frames / Math.max(sec, 0.001);
    console.clear();
    console.table({
      "FPS(近窗口)": state.fps.toFixed(1),
      "LongTasks(累计)": state.longTasks,
      "LongTask总时长ms(累计)": state.longTaskTotalMs.toFixed(1),
      "DOM变更条数(累计)": state.mutations,
      "文本变更(累计)": state.textMutations,
      "输入事件(累计)": state.inputEvents,
      "输入延迟均值ms": avg(state.inputLagSamples).toFixed(1),
      "输入延迟P95ms": p95(state.inputLagSamples).toFixed(1),
      "Editor命令调用(累计)": state.editorCalls,
      "setBlocksContent调用(累计)": state.setBlocksCalls,
      "setBlocksContent均值ms": avg(state.setBlocksMs).toFixed(1),
      "setBlocksContentP95ms": p95(state.setBlocksMs).toFixed(1),
    });
    state.frames = 0;
    state.secStart = now;
  }, 2000);

  function stop() {
    clearInterval(reporter);
    cancelAnimationFrame(rafId);
    mo.disconnect();
    if (longTaskObserver) longTaskObserver.disconnect();
    ["input", "beforeinput", "compositionend", "paste"].forEach((t) =>
      document.removeEventListener(t, onInput, true)
    );
    if (originalInvoke) window.orca.commands.invokeEditorCommand = originalInvoke;
    console.log("[typo-perf] stopped");
    delete window.__typoPerf;
  }

  window.__typoPerf = { stop, state };
  console.log("[typo-perf] started, call __typoPerf.stop() to stop.");
})();
```

## 2) 对比模板（复制后填数字）

```md
### 性能对比（同文档、同机器、同操作路径）

| 指标 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| FPS(近窗口) | 55.7 |  |  |
| LongTasks(累计) | 496 |  |  |
| LongTask总时长ms(累计) | 168177.0 |  |  |
| 输入延迟均值ms | 28.9 |  |  |
| 输入延迟P95ms | 202.6 |  |  |
| setBlocksContent调用(累计) | 3 |  |  |
| setBlocksContent均值ms | 127.9 |  |  |
| setBlocksContentP95ms | 124.1 |  |  |

### 验收结论
- 输入延迟 P95 < 80ms：`是/否`
- LongTask 频次下降 >= 60%：`是/否`
- setBlocksContent P95 < 60ms：`是/否`
```

## 3) 本次实测结果（2026-03-20）

### 实测快照 A

| 指标 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| FPS(近窗口) | 55.7 | 120.0 | +64.3 |
| LongTasks(累计) | 496 | 2 | -99.6% |
| LongTask总时长ms(累计) | 168177.0 | 395.0 | -99.8% |
| 输入延迟均值ms | 28.9 | 0.1 | -99.7% |
| 输入延迟P95ms | 202.6 | 0.3 | -99.9% |
| setBlocksContent调用(累计) | 3 | 6 | +100.0% |
| setBlocksContent均值ms | 127.9 | 26.3 | -79.4% |
| setBlocksContentP95ms | 124.1 | 29.4 | -76.3% |

### 实测快照 B（长时操作窗口）

| 指标 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| FPS(近窗口) | 55.7 | 118.3 | +62.6 |
| LongTasks(累计) | 496 | 13 | -97.4% |
| LongTask总时长ms(累计) | 168177.0 | 1177.0 | -99.3% |
| 输入延迟均值ms | 28.9 | 0.1 | -99.7% |
| 输入延迟P95ms | 202.6 | 0.3 | -99.9% |
| setBlocksContent调用(累计) | 3 | 1 | -66.7% |
| setBlocksContent均值ms | 127.9 | 34.9 | -72.7% |
| setBlocksContentP95ms | 124.1 | 34.9 | -71.9% |

### 验收结论

- 输入延迟 P95 < 80ms：`是（0.3ms）`
- LongTask 频次下降 >= 60%：`是（97.4%~99.6%）`
- setBlocksContent P95 < 60ms：`是（29.4ms / 34.9ms）`
