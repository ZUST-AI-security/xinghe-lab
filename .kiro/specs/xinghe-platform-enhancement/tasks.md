# Implementation Tasks

## Task Dependency Graph

```
T1 (路由重构)
  └─► T2 (首页)
  └─► T3 (关于页)

T4 (参数控件)
  └─► T5 (多面板对比)
        └─► T6 (详细指标)
              └─► T7 (导出功能)

T8 (后端扰动可视化)
  └─► T9 (前端扰动可视化)

T10 (TaskScheduler)
  └─► T11 (参数限制)
  └─► T12 (并发限制)

T13 (QueueMonitor)
  └─► T14 (前端队列状态)

T15 (鲁棒性评估后端)
  └─► T16 (鲁棒性评估前端)

T17 (敏感性分析后端)
  └─► T18 (敏感性分析前端)

T19 (排行榜后端)
  └─► T20 (排行榜前端)

T21 (PBT 测试)  — 依赖 T4, T5, T6, T10, T11, T13, T17
```

---

## Tasks

- [x] 1. 前端路由重构：支持公开路由
  - 重构 `web/src/App.jsx`，将路由分为公开路由（`/`、`/about`）和受保护路由
  - 移除当前将 `/` 重定向到 `/dashboard` 的逻辑
  - 新增 `PublicNavbar` 组件（`web/src/components/Layout/PublicNavbar.jsx`），根据登录状态显示「进入控制台」或「立即登录 / 注册账号」按钮
  - 新增 `ErrorBoundary` 包裹首页路由，渲染失败时显示错误页面而非留白
  - **验收**：未登录访问 `/` 渲染首页内容；已登录访问 `/` 显示首页并有进入 `/dashboard` 的入口；`/login`、`/register` 路由行为不变
  - **关联需求**：Requirement 1, 2

- [x] 2. 公开首页实现
  - 新建 `web/src/pages/Home/index.jsx`
  - 实现以下区块（全部使用 Ant Design 5 组件）：
    - `HeroBanner`：展示平台名称「星河智安 AI 安全攻击可视化平台」和归属「浙江科技大学大数据与智能安全实验室」
    - `FeaturesSection`：4 个核心功能卡片
    - `AlgorithmsSection`：FGSM、I-FGSM、PGD、C&W、DeepFool 各展示算法名称、类型和简要说明
    - `LabSection`：实验室介绍
    - `CTASection`：「立即登录」（跳转 `/login`）和「注册账号」（跳转 `/register`）按钮
  - **验收**：页面包含所有必要区块；5 种算法均有展示；CTA 按钮跳转正确
  - **关联需求**：Requirement 1

- [x] 3. 关于页面实现
  - 新建 `web/src/pages/About/index.jsx`
  - 实现以下内容：
    - 实验室介绍 + 主页链接（`target="_blank" rel="noopener noreferrer"`）
    - 研究方向列表
    - 平台技术栈说明（React 18、FastAPI、Celery、Redis、PostgreSQL、PyTorch）
    - 版本信息：调用 `GET /info` 端点获取 `app.version` 并展示
  - **验收**：实验室主页链接在新标签页打开；版本号从后端动态获取
  - **关联需求**：Requirement 2

- [x] 4. AlgorithmParamEditor 可视化参数控件组件
  - 新建 `web/src/components/params/AlgorithmParamEditor.jsx`
  - 为每种算法实现对应的 Ant Design 5 `Slider` + `InputNumber` 控件：
    - FGSM：`epsilon`（0.001–0.3，step=0.001）
    - I-FGSM：`epsilon`（0.001–0.3）、`alpha`（0.001–0.05）、`num_iter`（1–100，整数）
    - PGD：`epsilon`（0.001–0.3）、`alpha`（0.001–0.05）、`num_iter`（1–200，整数）、`norm`（Select: linf/l2）
    - C&W：`c`（0.001–10）、`lr`（0.0001–0.1）、`max_iter`（10–1000，整数）、`binary_search_steps`（1–20，整数）
    - DeepFool：`overshoot`（0.001–0.1）、`max_iter`（10–200，整数）、`num_classes`（2–100，整数）
  - 参数越界时：截断至边界值 + 调用 `message.warning` 提示已自动修正
  - 实时同步：`onChange` 回调立即更新父组件状态
  - **验收**：各算法控件范围正确；越界输入被截断并有提示；Slider 与 InputNumber 双向同步
  - **关联需求**：Requirement 4

- [x] 5. CompareMode 重构：支持 2–4 个面板
  - 重构 `web/src/pages/Attacks/CompareMode.jsx`
  - 将硬编码的 `leftPanel`/`rightPanel` 改为 `panels` 数组（初始 2 个）
  - 实现「添加对比项」按钮：`panels.length < 4` 时追加新面板，达到 4 个时禁用按钮
  - 实现每个面板的「移除」按钮：`panels.length > 2` 时可移除，否则隐藏/禁用
  - 将 JSON TextArea 替换为 Task 4 实现的 `AlgorithmParamEditor` 组件
  - 「同时提交」按钮并发提交所有面板的 AttackTask（`Promise.all`）
  - 每个面板独立轮询任务状态（独立 `setInterval`），互不影响
  - 所有面板完成后在摘要区域展示汇总指标
  - **验收**：面板数量始终在 2–4 之间；各面板独立轮询；并发提交正常工作
  - **关联需求**：Requirement 3, 4

- [x] 6. 对比结果详细指标展示
  - 扩展 `CompareMode.jsx` 中的结果展示区域
  - 为每个已完成面板展示：L2 范数、Linf 范数、攻击成功率、原始置信度、对抗置信度、执行耗时
  - 实现 `isMetricValid(value, type)` 工具函数，对超出有效范围的指标标注「数据异常」（红色 Tag）
  - 在结果对比摘要中以 Ant Design `Table` 并排展示所有已完成面板的指标
  - 在摘要中添加置信度变化的柱状图（使用 Ant Design Charts 或 Recharts），横轴为算法标签，纵轴为置信度
  - 为每个已完成面板展示扰动热力图（`heatmap` 字段）
  - **验收**：所有 6 项指标正确展示；异常值有标注；置信度图表正确渲染
  - **关联需求**：Requirement 5

- [x] 7. 对比结果导出功能
  - 安装依赖：`html2canvas`、`jspdf`（在 `web/package.json` 中添加）
  - 新建 `web/src/components/export/ExportButtons.jsx`
  - 实现「导出图片」：使用 `html2canvas` 截取结果区域 DOM，触发 PNG 下载，文件名格式 `compare_result_{timestamp}.png`
  - 实现「导出 PDF 报告」：使用 `jspdf` + `html2canvas`，PDF 包含：
    - 平台名称、导出时间
    - 每个已完成面板的原始图、对抗图、热力图
    - 每个面板的算法名称、参数配置、指标数据
  - 按钮仅在至少一个面板完成时可用
  - **验收**：PNG 文件名含时间戳；PDF 包含所有必要内容；按钮在无完成面板时禁用
  - **关联需求**：Requirement 6

- [x] 8. 后端扰动可视化增强：差值放大图和频域分析图
  - 修改 `backend/app/workers/attack_task.py` 中的 `run_attack` 任务
  - 在 AttackTask 完成后计算差值放大图：
    ```python
    diff = np.abs(orig_np.astype(float) - adv_np.astype(float))
    amplified = np.clip(diff * 10, 0, 255).astype(np.uint8)
    ```
  - 计算频域分析图：对原始图和对抗图分别做 2D FFT，展示幅度谱差异（`np.log1p` 归一化）
  - 将两张图的 base64 编码添加到任务结果：`amplified_diff`、`fft_diff` 字段
  - 确保两张图与原始图像保持相同尺寸
  - **验收**：任务结果包含 `amplified_diff` 和 `fft_diff` 字段；图像尺寸与原图一致
  - **关联需求**：Requirement 8

- [x] 9. 前端扰动可视化增强：三视图选项卡
  - 新建 `web/src/components/Visualization/PerturbationViewer.jsx`
  - 使用 Ant Design `Tabs` 实现三个视图：热力图、差值放大图、频域分析图
  - 切换 Tab 时直接切换图像，不重新请求后端
  - 所有图像统一 `width`/`height`，与原图保持一致
  - 在 `CompareMode.jsx` 和各攻击页面的结果区域集成 `PerturbationViewer`
  - **验收**：三个 Tab 切换流畅；图像尺寸一致；无重复请求
  - **关联需求**：Requirement 8

- [x] 10. 后端 TaskScheduler：自适应资源分配
  - 新建 `backend/app/core/task_scheduler.py`
  - 实现 `evaluate_complexity(algorithm, params) -> TaskPriority` 函数：
    - FGSM → `TaskPriority.HIGH`（队列 `high`）
    - I-FGSM、PGD → `TaskPriority.DEFAULT`（队列 `default`）
    - C&W、DeepFool → `TaskPriority.LOW`（队列 `low`）
  - 实现 `get_queue_name(priority) -> str` 函数
  - 修改各攻击算法的 `/submit` 端点，调用 `evaluate_complexity` 并通过 `apply_async(queue=queue_name)` 路由任务
  - 更新 `backend/app/core/celery_app.py`，配置三个队列（`high`、`default`、`low`）
  - 更新 Worker 启动脚本，配置 `--queues=high,default,low`
  - **验收**：FGSM 任务路由到 `high` 队列；C&W/DeepFool 路由到 `low` 队列；函数可独立调用
  - **关联需求**：Requirement 11

- [x] 11. 后端参数限制：耗时任务自动限制
  - 在 `backend/app/core/task_scheduler.py` 中新增 `apply_param_limits(algorithm, params, queue_depth, threshold) -> tuple[dict, bool, str]`
  - 当 `queue_depth > threshold` 时：
    - C&W：`max_iter` 限制为 200，`binary_search_steps` 限制为 3
    - DeepFool：`max_iter` 限制为 30
  - 在 `backend/app/core/config.py` 的 `Settings` 中新增 `task_queue_threshold: int = 5`
  - 修改 C&W 和 DeepFool 的 `/submit` 端点，调用 `apply_param_limits`，在响应中返回 `param_limited` 和 `param_limit_reason` 字段
  - 修改前端 C&W 和 DeepFool 提交逻辑，收到 `param_limited: true` 时展示 `message.warning` 提示
  - **验收**：队列超阈值时参数被正确限制；`param_limited` 字段仅在实际限制时为 `true`；前端提示正确显示
  - **关联需求**：Requirement 12

- [x] 12. 后端并发任务数限制
  - 新建工具函数 `check_concurrent_limit(user_id, db) -> int`（可放在 `task_scheduler.py` 中）
  - 查询 `TaskRecord` 表中该用户 `status IN ('running', 'pending')` 的记录数
  - 在 `backend/app/core/config.py` 的 `Settings` 中新增 `max_concurrent_tasks_per_user: int = 2`
  - 修改所有攻击算法的 `/submit` 端点（fgsm、ifgsm、pgd、cw、deepfool），在提交前调用检查：
    - 超限时返回 HTTP 429，响应体包含 `detail` 和 `active_tasks` 字段
  - 修改前端各攻击页面的提交逻辑，收到 HTTP 429 时展示「当前已有 N 个任务在运行，请等待任务完成后再提交」
  - 确认 `attack_task.py` 在任务完成/失败时将 `TaskRecord.status` 更新为终态（已有逻辑，验证即可）
  - **验收**：超限提交返回 429；前端提示包含正确的活跃任务数；任务完成后可再次提交
  - **关联需求**：Requirement 14

- [x] 13. 后端 QueueMonitor：队列状态 API
  - 新建 `backend/app/core/queue_monitor.py`
  - 实现 `get_queue_depth(queue_name) -> int`：通过 Redis `LLEN` 查询队列长度
  - 实现 `get_avg_execution_time(queue_name, db) -> float`：从 `AttackHistory` 查询对应算法的平均 `execution_time`，无数据时返回默认值（high=30s, default=120s, low=300s）
  - 实现 `get_queue_status(db) -> dict`：返回三个队列的 `pending` 数量和 `estimated_wait_seconds`
  - 在 `backend/app/api/v1/attacks/tasks.py` 中新增端点 `GET /api/v1/tasks/queue-status`（无需认证）
  - **验收**：端点无需登录可访问；返回三个队列的状态；无历史数据时使用默认耗时
  - **关联需求**：Requirement 13

- [x] 14. 前端队列状态展示
  - 新建 `web/src/components/common/QueueStatus.jsx`
  - 调用 `GET /api/v1/tasks/queue-status` 获取队列状态
  - 展示各队列的待处理任务数和预估等待时间
  - 每 30 秒自动刷新（`setInterval`，组件卸载时清除）
  - 在各攻击算法提交表单上方集成 `QueueStatus` 组件
  - 新建 `web/src/api/tasks.js` 中添加 `getQueueStatus()` 函数（或在现有 `tasks.js` 中添加）
  - **验收**：队列状态正确展示；30 秒自动刷新；组件卸载时无内存泄漏
  - **关联需求**：Requirement 13

- [x] 15. 后端鲁棒性评估服务
  - 新建 `backend/app/services/robustness_service.py`
  - 实现三种防御变换函数（使用 `opencv-python` 或 `Pillow`，在 CPU 上执行）：
    - `apply_gaussian_blur(image_np, sigma=1.0) -> np.ndarray`
    - `apply_jpeg_compress(image_np, quality=75) -> np.ndarray`
    - `apply_bit_depth_reduction(image_np, bits=4) -> np.ndarray`
  - 实现 `RobustnessService.evaluate(image_b64, algorithms, model_id, db)`：
    - 对每种算法生成对抗样本
    - 对每种防御变换评估攻击成功率
    - 返回 `attacks × defenses` 成功率矩阵
    - 通过 Celery `task_soft_time_limit=120` 控制超时
  - 新建 `backend/app/api/v1/robustness.py`，实现：
    - `POST /api/v1/robustness/evaluate`（需认证）
    - `GET /api/v1/robustness/result/{task_id}`（需认证）
  - 在 `backend/app/main.py` 中注册路由
  - **验收**：三种防御变换正确实现；矩阵结果格式正确；超时时返回 failed 状态
  - **关联需求**：Requirement 7

- [x] 16. 前端鲁棒性评估页面
  - 新建 `web/src/pages/Robustness/index.jsx`
  - 实现以下 UI：
    - `ImageUploader`（复用现有组件）
    - 多选攻击算法（Ant Design `Checkbox.Group`）
    - 提交按钮 + 进度指示器（轮询任务状态）
    - `RobustnessMatrix`：使用 Ant Design `Table`，行为攻击算法，列为防御方法，单元格背景色渐变表示成功率
  - 任务失败时显示具体错误信息并提供重新提交按钮
  - 新建 `web/src/api/robustness.js`
  - 在 `App.jsx` 中注册路由 `/robustness`（受保护路由）
  - 在 `SideMenu.jsx` 中添加导航入口
  - **验收**：矩阵热力图正确渲染；失败时可重新提交；路由和导航正常
  - **关联需求**：Requirement 7

- [x] 17. 后端敏感性分析服务
  - 新建 `backend/app/services/sensitivity_service.py`
  - 实现 `SensitivityService.submit_scan(algorithm, image_b64, model_id, scan_param, param_min, param_max, steps, base_params, user_id, db)`：
    - 验证：`steps` 为正整数且 `1 ≤ steps ≤ 20`，`param_min < param_max`
    - 验证失败时抛出 `ValidationError`，不提交任何任务
    - 均匀采样 `steps` 个参数值（`np.linspace`）
    - 为每个参数值提交一个 AttackTask
    - 将 `scan_id → {task_ids, param_values}` 存入 Redis（TTL 3600s）
  - 新建 `backend/app/api/v1/sensitivity.py`，实现：
    - `POST /api/v1/sensitivity/scan`（需认证）：验证并提交扫描
    - `GET /api/v1/sensitivity/result/{scan_id}`（需认证）：聚合各步骤结果
  - 在 `backend/app/main.py` 中注册路由
  - **验收**：无效输入返回 422 且不提交任务；步数正确；Redis 存储 scan_id 映射
  - **关联需求**：Requirement 9

- [x] 18. 前端敏感性分析页面
  - 新建 `web/src/pages/Sensitivity/index.jsx`
  - 实现以下 UI：
    - 算法选择器（单选）
    - `ImageUploader`
    - 扫描参数配置：参数名（根据算法自动填充可扫描参数）、最小值、最大值、步数（1–20）
    - 提交按钮 + 进度条（已完成步数 / 总步数）
    - `SensitivityChart`：折线图，X 轴为参数取值，Y 轴为攻击成功率和 L2 扰动大小
      - 每个数据点有标注，支持鼠标悬停 Tooltip 显示具体数值
      - 失败步骤在图表下方列出错误信息
  - 新建 `web/src/api/sensitivity.js`
  - 在 `App.jsx` 中注册路由 `/sensitivity`（受保护路由）
  - 在 `SideMenu.jsx` 中添加导航入口
  - **验收**：折线图正确渲染；失败步骤跳过且有错误提示；Tooltip 正常工作
  - **关联需求**：Requirement 9

- [x] 19. 后端模型鲁棒性排行榜 API
  - 新建 `backend/app/api/v1/leaderboard.py`
  - 实现 `GET /api/v1/leaderboard`（需认证，支持 `?algorithm=fgsm` 查询参数）：
    - 聚合查询 `AttackHistory` 表：按 `model_name` 分组，统计总攻击次数、成功次数、平均成功率、平均 L2 范数、平均 Linf 范数
    - 按 `avg_success_rate` 升序排列
    - 无数据时返回空列表
  - 在 `backend/app/main.py` 中注册路由
  - **验收**：聚合查询结果正确；按成功率升序排列；无数据时返回空列表
  - **关联需求**：Requirement 10

- [x] 20. 前端模型鲁棒性排行榜页面
  - 新建 `web/src/pages/Leaderboard/index.jsx`
  - 实现以下 UI：
    - 算法下拉选择器（Ant Design `Select`）
    - 刷新按钮
    - Ant Design `Table` 展示排行榜：排名、模型名称、总攻击次数、攻击成功次数、攻击成功率（%）、平均 L2 范数、平均 Linf 范数
    - 无数据时显示 `Empty` 组件，提示「暂无数据，请先执行攻击实验」
  - 新建 `web/src/api/leaderboard.js`
  - 在 `App.jsx` 中注册路由 `/leaderboard`（受保护路由）
  - 在 `SideMenu.jsx` 中添加导航入口
  - **验收**：表格正确展示排行榜数据；刷新按钮重新请求数据；空数据提示正确
  - **关联需求**：Requirement 10

- [x] 21. Property-Based Testing 测试套件
  - **前端 PBT（fast-check）**：
    - 新建 `web/src/tests/pbt/paramEditor.test.js`
    - P1：对任意超出范围的参数值，截断后的值在 `[min, max]` 内
    - P2：对任意添加/移除操作序列，面板数量始终满足 `2 ≤ count ≤ 4`
    - P7：`isMetricValid(value, type)` 对有效值返回 `true`，对无效值返回 `false`
  - **后端 PBT（hypothesis）**：
    - 新建 `backend/tests/pbt/test_task_scheduler.py`
    - P3：`evaluate_complexity` 对任意合法输入返回有效优先级，FGSM 始终为 HIGH，C&W/DeepFool 始终为 LOW
    - P4：`apply_param_limits` 对已限制参数再次调用结果不变（幂等性）
    - P5：`get_queue_status` 返回的所有数值 ≥ 0
    - P6：`submit_scan` 提交的任务数等于 `steps`，且 `1 ≤ steps ≤ 20`
  - **验收**：所有 PBT 属性通过；测试可在 CI 中运行
  - **关联需求**：Requirement 3, 4, 5, 9, 11, 12, 13
