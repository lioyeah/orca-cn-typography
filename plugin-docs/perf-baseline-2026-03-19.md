# orca-cn-typography 性能基线（2026-03-19）

## 采集说明

- 采集时间：2026-03-19
- 采集方式：浏览器控制台性能监控脚本（由插件开发调试会话注入）
- 场景：用户反馈为 Preview/Auto 两种模式都有测试

## 基线数据（优化前）

- FPS(近窗口): 55.7
- LongTasks(累计): 496
- LongTask总时长ms(累计): 168177.0
- DOM变更条数(累计): 8726
- 文本变更(累计): 99
- 新增节点(累计): 5238
- 删除节点(累计): 3768
- 输入事件(累计): 336
- 输入延迟均值ms: 28.9
- 输入延迟P95ms: 202.6
- Editor命令调用(累计): 28
- setBlocksContent调用(累计): 3
- setBlocksContent均值ms: 127.9
- setBlocksContentP95ms: 124.1

## 目标阈值（本轮优化）

- 输入延迟 P95 < 80ms
- LongTask 频次较基线下降 >= 60%
- setBlocksContent P95 < 60ms（同时减少调用频次）
