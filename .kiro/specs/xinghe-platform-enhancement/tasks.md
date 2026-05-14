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

T22 (修复 queue-status 路由)
  └─► T14 (前端队列状态，已有)

T23 (移除同步/异步切换)

T24 (移动端响应式布局)

T25 (UploadedFile 模型 + 文件上传 API)
  └─► T26 (图片库前端组件)
  └─► T27 (管理员文件管理后端)
        └─► T28 (管理员文件管理前端)

T29 (我的任务结果查看)  — 依赖 T8, T9
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

- [x] 22. 修复 queue-status API 路由注册
  - 检查 `backend/app/main.py`，确认 `tasks` 路由器是否已通过 `app.include_router` 挂载
  - 若未挂载，在 `main.py` 中添加：`app.include_router(tasks_router, prefix="/api/v1")`
  - 检查 `backend/app/api/v1/attacks/tasks.py` 中 `GET /tasks/queue-status` 端点的路由定义，确保路径正确
  - 启动后端并访问 `/docs`，验证 `/api/v1/tasks/queue-status` 出现在路由列表中
  - 若 Redis 连接失败，确保端点返回 HTTP 503 而非 404
  - **验收**：前端进入实验界面不再出现 404；`/docs` 中可见该端点；Redis 不可用时返回 503
  - **关联需求**：Requirement 15

- [x] 23. 移除同步/异步切换按钮，默认异步模式
  - 检索前端各攻击页面（`web/src/pages/Attacks/` 下的 FGSM、IFGSM、PGD、CW、DeepFool 页面）中的同步/异步切换控件（Switch、Radio、Select 等）
  - 删除切换控件及相关状态变量（如 `isAsync`、`mode` 等）
  - 确保所有提交逻辑统一走异步路径（调用 `/submit` 端点 + 轮询任务状态）
  - 同步更新 `CompareMode.jsx`，移除其中的同步/异步切换逻辑
  - 删除前端中调用同步执行端点（如 `/run` 或 `/execute`）的代码路径（保留后端端点不删除）
  - **验收**：所有攻击页面无切换按钮；提交后直接进入异步轮询流程；对比模式同样正常
  - **关联需求**：Requirement 16

- [x] 24. 前端移动端响应式布局优化
  - 重构 `web/src/components/Layout/MainLayout.jsx`（或对应布局组件）：
    - 侧边栏在 `xs`/`sm`（< 768px）断点下改为 Ant Design `Drawer` 组件，通过汉堡菜单按钮触发
    - 顶部导航栏添加汉堡菜单图标（`MenuOutlined`），点击展开/收起侧边抽屉
  - 重构各攻击算法参数表单：使用 `Row`/`Col` 响应式栅格，`xs={24} md={12}` 布局
  - 重构对比结果表格（`CompareMode.jsx`）：添加 `scroll={{ x: 'max-content' }}` 支持横向滚动
  - 重构图片展示区域：使用 `max-width: 100%` + `height: auto` 确保图片自适应
  - 重构公开首页（`Home/index.jsx`）各区块：`xs={24} sm={12} lg={6}` 响应式卡片布局
  - 检查所有按钮和可交互元素，确保移动端触控目标 ≥ 44×44px（通过 CSS `min-height`/`min-width` 保证）
  - 在移动端（< 768px）隐藏表格中的辅助列（如参数详情列），保留核心列
  - **验收**：在 375px 宽度下主要页面无横向溢出；侧边栏正确折叠为抽屉；图片不变形；按钮可正常点击
  - **关联需求**：Requirement 17

- [x] 25. 后端 UploadedFile 模型与文件上传 API
  - 新建 Alembic 迁移：创建 `uploaded_files` 表，字段：`id`（UUID）、`user_id`（FK）、`filename`、`file_path`、`file_hash`（SHA-256，索引）、`file_size`、`is_deleted`（软删除标志）、`created_at`
  - 在 `backend/app/models/` 中新建 `UploadedFile` SQLAlchemy 模型
  - 新建 `backend/app/api/v1/files.py`，实现：
    - `POST /api/v1/files/upload`（需认证）：接收图片文件，计算 SHA-256，若同用户已有相同哈希则返回已有记录，否则保存文件并创建记录；返回 `{ file_id, filename, url, is_reused }`
    - `GET /api/v1/files/my-uploads`（需认证）：返回当前用户的文件列表（分页，按 `created_at` 倒序），含缩略图 URL
    - `DELETE /api/v1/files/{file_id}`（需认证）：软删除（设置 `is_deleted=True`），若文件被任务引用则仅标记不可见，不物理删除
  - 在 `backend/app/main.py` 中注册 `files` 路由器
  - 文件存储路径：`backend/uploads/{user_id}/{file_hash[:8]}_{filename}`
  - **验收**：重复上传同一图片返回 `is_reused: true`；文件列表按时间倒序；被引用文件软删除后不影响任务结果
  - **关联需求**：Requirement 19

- [x] 26. 前端图片库组件与复用入口
  - 新建 `web/src/components/upload/ImageLibrary.jsx`：
    - 调用 `GET /api/v1/files/my-uploads` 获取图片列表
    - 以缩略图网格形式展示（Ant Design `Image.PreviewGroup` + 自定义网格）
    - 每张图片显示文件名和上传时间
    - 点击图片触发 `onSelect(fileId, imageBase64)` 回调
    - 支持分页加载（每页 12 张）
  - 新建 `web/src/api/files.js`，封装文件相关 API 调用（`uploadImage`、`getMyUploads`、`deleteFile`）
  - 修改各攻击算法页面的图片上传区域：
    - 在 `ImageUploader` 下方添加「从图片库选择」按钮，点击弹出 `ImageLibrary` Modal
    - 选择后将图片 base64 填充到上传区域，与直接上传效果一致
  - 修改 `POST /api/v1/files/upload` 调用：上传成功后刷新图片库缓存
  - **验收**：图片库正确展示历史图片；选择图片后表单中图片正确填充；重复上传同一图片不增加新条目
  - **关联需求**：Requirement 19

- [x] 27. 管理员后台文件管理 API
  - 在 `backend/app/api/v1/admin.py` 中新增以下端点（均需 Admin 角色）：
    - `GET /api/v1/admin/files`：分页返回所有用户的上传文件列表，支持 `?user_id=` 和 `?page=` 查询参数
    - `DELETE /api/v1/admin/files/{file_id}`：物理删除文件及数据库记录；若文件被任务引用，响应中包含 `has_references: true` 和引用任务数量，需前端二次确认后携带 `?force=true` 参数再次请求
    - `DELETE /api/v1/admin/files/batch`：批量删除，请求体为 `{ file_ids: [uuid, ...] }`
    - `GET /api/v1/admin/files/stats`：返回 `{ total_files, total_size_mb, top_users: [{user_id, username, file_count, total_size_mb}] }`（Top 10 用户）
  - **验收**：非管理员访问返回 403；物理删除后文件从磁盘移除；stats 数据准确
  - **关联需求**：Requirement 20

- [x] 28. 管理员后台文件管理前端页面
  - 在现有管理员页面（`web/src/pages/Admin/` 或对应路径）中新增「文件管理」标签页
  - 实现文件列表表格（Ant Design `Table`）：
    - 列：文件名、上传用户、文件大小（KB/MB）、上传时间、操作（删除）
    - 支持行选择（`rowSelection`）用于批量删除
    - 支持分页（`pagination`）
  - 实现存储统计卡片区域：总文件数、总存储占用、Top 10 用户存储排行（Ant Design `Table` 或列表）
  - 实现删除确认流程：
    - 单个删除：`Modal.confirm` 二次确认
    - 若后端返回 `has_references: true`，展示额外警告「该文件被 N 个任务引用，强制删除将影响任务结果查看」，确认后携带 `force=true` 重新请求
    - 批量删除：勾选后点击「批量删除」按钮，`Modal.confirm` 确认
  - **验收**：文件列表正确展示；删除有二次确认；被引用文件有额外警告；统计数据正确
  - **关联需求**：Requirement 20

- [x] 29. 我的任务页面查看结果功能
  - 检查现有「我的任务」页面路径（`web/src/pages/Tasks/` 或类似路径），了解当前任务列表实现
  - 在任务列表每行添加「查看结果」按钮：
    - `completed` 状态：按钮可用，点击展开结果
    - `pending`/`running` 状态：按钮禁用，显示当前状态 Badge
    - `failed` 状态：按钮可用，点击展示失败原因
  - 实现结果展示方式（优先使用 Ant Design `Table` 的可展开行 `expandable`）：
    - 展开行内容：原始图像、对抗图像、`PerturbationViewer`（热力图/差值放大图/频域分析图三视图）
    - 攻击指标表格：L2 范数、Linf 范数、攻击成功率、原始置信度、对抗置信度、执行耗时
    - 失败任务展示错误信息
  - 确保后端 `GET /api/v1/tasks/{task_id}` 或任务列表端点返回完整结果数据（含图像 base64 和指标）
  - 在任务列表添加分页（每页 10 条，`Pagination` 组件）
  - **验收**：completed 任务可展开查看完整结果；failed 任务显示错误原因；分页正常工作；PerturbationViewer 三视图可切换
  - **关联需求**：Requirement 18
