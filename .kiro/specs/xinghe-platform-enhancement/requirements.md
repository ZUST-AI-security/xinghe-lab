# Requirements Document

## Introduction

本文档描述「星河智安 AI 安全攻击可视化平台」的一批增强功能需求，涵盖六个方向：

1. **公开首页与关于页面** — 无需登录即可访问的平台门户，展示平台介绍、算法、团队信息；
2. **多算法对比实验** — 将现有双面板对比模式扩展为最多 4 个算法同时对比，并增强参数编辑与结果指标；
3. **AI 安全创新功能** — 对抗样本鲁棒性评估、扰动可视化增强、攻击参数敏感性分析、模型鲁棒性排行榜；
4. **后端任务处理优化** — 自适应资源分配、耗时任务参数限制、任务队列状态感知、并发任务数限制；
5. **用户体验优化** — 修复队列状态 API 路由、移除同步/异步切换、移动端响应式布局、任务结果查看；
6. **文件管理** — 上传图片复用机制、管理员后台文件管理功能。

平台归属：浙江科技大学大数据与智能安全实验室（星河智安实验室）。

---

## Glossary

- **Platform（平台）**：星河智安 AI 安全攻击可视化平台，前端为 React 18 + Ant Design 5，后端为 FastAPI + Celery + Redis。
- **PublicPage（公开页面）**：无需用户登录即可访问的前端页面（首页、关于页）。
- **ComparePanel（对比面板）**：对比模式中单个算法的配置与结果展示单元。
- **AttackTask（攻击任务）**：通过 Celery 异步执行的对抗攻击计算任务。
- **Algorithm（算法）**：已注册的对抗攻击算法，包括 FGSM、I-FGSM、PGD、C&W、DeepFool。
- **RobustnessEvaluator（鲁棒性评估器）**：对对抗样本施加防御变换并评估攻防效果的模块。
- **SensitivityAnalyzer（敏感性分析器）**：固定图片、扫描参数取值范围并批量生成攻击结果的模块。
- **Leaderboard（排行榜）**：基于历史攻击数据统计不同模型在相同攻击下表现的排名展示模块。
- **TaskScheduler（任务调度器）**：负责评估任务复杂度、动态分配 Celery 队列优先级的后端模块。
- **QueueMonitor（队列监控器）**：向前端提供当前队列任务数量和预估等待时间的后端模块。
- **User（用户）**：已注册并登录的平台使用者。
- **Admin（管理员）**：拥有 admin 角色的用户。
- **ProtectedRoute（受保护路由）**：需要登录才能访问的前端路由。
- **PublicRoute（公开路由）**：无需登录即可访问的前端路由。
- **UploadedFile（上传文件）**：用户上传到平台的图片文件，存储于服务器并可被复用。
- **FileManager（文件管理器）**：管理员用于查看、删除平台所有上传文件的后台功能模块。
- **MyTasks（我的任务）**：用户查看自己历史攻击任务及其结果的页面。

---

## Requirements

### Requirement 1：公开首页

**User Story:** 作为访客，我希望在不登录的情况下访问平台首页，以便了解平台功能、支持的算法和实验室背景，并决定是否注册使用。

#### Acceptance Criteria

1. THE Platform SHALL 在路由 `/` 提供一个 PublicRoute，无需登录即可访问。
2. WHEN 未登录用户访问 `/`，THE Platform SHALL 渲染首页内容，而非重定向到 `/login`；IF 首页渲染失败，THEN THE Platform SHALL 显示错误页面，而非留白。
3. WHEN 已登录用户访问 `/`，THE Platform SHALL 保持显示首页，并在导航栏提供进入 `/dashboard` 的入口。
4. THE PublicPage SHALL 包含以下区块：平台介绍横幅（Banner）、核心功能展示、支持的攻击算法介绍、团队/实验室介绍、快速开始入口。
5. THE PublicPage SHALL 使用 Ant Design 5 组件库实现，与平台整体视觉风格保持一致。
6. THE PublicPage 的快速开始入口 SHALL 提供「立即登录」和「注册账号」两个按钮，分别跳转至 `/login` 和 `/register`。
7. THE PublicPage SHALL 展示平台名称「星河智安 AI 安全攻击可视化平台」及归属「浙江科技大学大数据与智能安全实验室」。
8. THE PublicPage SHALL 对每种支持的攻击算法（FGSM、I-FGSM、PGD、C&W、DeepFool）展示算法名称、类型和简要说明。

---

### Requirement 2：关于页面

**User Story:** 作为访客或用户，我希望访问关于页面，以便了解实验室背景、研究方向、平台技术栈和版本信息。

#### Acceptance Criteria

1. THE Platform SHALL 在路由 `/about` 提供一个 PublicRoute，无需登录即可访问。
2. THE PublicPage 的关于页面 SHALL 包含以下内容：实验室介绍、研究方向列表、平台技术栈说明、当前版本信息。
3. THE PublicPage 的关于页面 SHALL 展示实验室名称「浙江科技大学大数据与智能安全实验室」及实验室主页链接。
4. THE PublicPage 的关于页面 SHALL 展示平台版本号，版本号来源于后端配置（`app_version`）或前端构建时注入的常量。
5. WHEN 用户点击实验室主页链接，THE Platform SHALL 在新标签页中打开对应 URL。

---

### Requirement 3：多算法对比实验（最多 4 个）

**User Story:** 作为研究人员，我希望在对比模式中同时运行最多 4 个算法，以便在一个界面内全面比较不同算法的攻击效果。

#### Acceptance Criteria

1. THE Platform SHALL 在对比模式页面支持 2 至 4 个 ComparePanel 同时存在。
2. WHEN 用户点击「添加对比项」，THE Platform SHALL 新增一个 ComparePanel，直至面板数量达到 4 个。
3. WHEN ComparePanel 数量为 4 个时，THE Platform SHALL 禁用「添加对比项」按钮。
4. WHEN 用户点击某个 ComparePanel 的「移除」按钮，THE Platform SHALL 移除该面板，且面板数量不得低于 2 个。
5. WHEN 用户点击「同时提交」，THE Platform SHALL 并发提交所有 ComparePanel 对应的 AttackTask。
6. THE Platform SHALL 对每个 ComparePanel 独立轮询 AttackTask 状态，并实时更新对应面板的进度和结果。
7. WHEN 所有 ComparePanel 的 AttackTask 均完成，THE Platform SHALL 在结果对比摘要区域展示所有面板的汇总指标。

---

### Requirement 4：参数可视化调节

**User Story:** 作为用户，我希望通过滑块和数字输入框调节攻击参数，而非手动编辑 JSON 文本，以便更直观地设置参数并减少输入错误。

#### Acceptance Criteria

1. THE Platform SHALL 为每个 ComparePanel 提供基于 Ant Design 5 Slider 和 InputNumber 组件的参数编辑界面，替代原有的 JSON 文本框。
2. THE Platform SHALL 为 FGSM 算法提供以下可视化参数控件：`epsilon`（范围 0.001–0.3，步长 0.001）。
3. THE Platform SHALL 为 I-FGSM 算法提供以下可视化参数控件：`epsilon`（范围 0.001–0.3）、`alpha`（范围 0.001–0.05）、`num_iter`（范围 1–100，整数）。
4. THE Platform SHALL 为 PGD 算法提供以下可视化参数控件：`epsilon`（范围 0.001–0.3）、`alpha`（范围 0.001–0.05）、`num_iter`（范围 1–200，整数）、`norm`（下拉选择：linf / l2）。
5. THE Platform SHALL 为 C&W 算法提供以下可视化参数控件：`c`（范围 0.001–10）、`lr`（范围 0.0001–0.1）、`max_iter`（范围 10–1000，整数）、`binary_search_steps`（范围 1–20，整数）。
6. THE Platform SHALL 为 DeepFool 算法提供以下可视化参数控件：`overshoot`（范围 0.001–0.1）、`max_iter`（范围 10–200，整数）、`num_classes`（范围 2–100，整数）。
7. WHEN 用户调整滑块或输入框的值，THE Platform SHALL 实时同步更新对应参数，并在提交时使用最新值；无论输入值是否在有效范围内，THE Platform SHALL 均向用户展示当前参数值的反馈。
8. WHEN 用户输入的参数值超出允许范围，THE Platform SHALL 同时执行以下两个操作：将该值截断至边界值，并向用户展示提示信息说明已自动修正。

---

### Requirement 5：对比结果详细指标

**User Story:** 作为研究人员，我希望在对比结果中看到 L2 范数、Linf 范数、攻击成功率和置信度变化等详细指标，以便定量评估各算法的攻击效果。

#### Acceptance Criteria

1. WHEN 某个 ComparePanel 的 AttackTask 完成，THE Platform SHALL 展示以下指标：L2 范数（≥ 0）、Linf 范数（≥ 0）、攻击成功率（0–100%）、原始预测置信度（0–1）、对抗预测置信度（0–1）、执行耗时（> 0 秒）。
2. WHEN 指标值超出上述有效范围，THE Platform SHALL 在界面中标注该指标为「数据异常」，而非直接展示无效数值。
3. THE Platform SHALL 在结果对比摘要中以表格形式并排展示所有已完成 ComparePanel 的上述指标。
4. THE Platform SHALL 为每个已完成的 ComparePanel 展示扰动热力图（heatmap）图像。
5. THE Platform SHALL 在对比摘要中提供置信度变化的柱状图或折线图，横轴为各 ComparePanel 的算法标签，纵轴为置信度数值。

---

### Requirement 6：对比结果导出

**User Story:** 作为研究人员，我希望将对比结果导出为图片或 PDF 报告，以便在论文或汇报中使用。

#### Acceptance Criteria

1. WHEN 至少一个 ComparePanel 的 AttackTask 完成，THE Platform SHALL 在对比结果区域提供「导出图片」按钮。
2. WHEN 用户点击「导出图片」，THE Platform SHALL 将当前对比结果区域截图并触发浏览器下载，文件格式为 PNG，文件名包含时间戳。
3. WHEN 至少一个 ComparePanel 的 AttackTask 完成，THE Platform SHALL 在对比结果区域提供「导出 PDF 报告」按钮。
4. WHEN 用户点击「导出 PDF 报告」，THE Platform SHALL 生成包含所有已完成面板的原始图、对抗图、热力图和指标数据的 PDF 文件，并触发浏览器下载。
5. THE Platform 导出的 PDF 报告 SHALL 包含平台名称、导出时间、每个面板的算法名称和参数配置。

---

### Requirement 7：对抗样本鲁棒性评估

**User Story:** 作为安全研究人员，我希望对生成的对抗样本施加防御变换并查看攻防对抗效果，以便评估攻击算法在防御场景下的鲁棒性。

#### Acceptance Criteria

1. THE Platform SHALL 提供鲁棒性评估功能入口，允许用户上传图片并选择一种或多种攻击算法生成对抗样本。
2. THE RobustnessEvaluator SHALL 支持以下防御变换：高斯模糊（Gaussian Blur）、JPEG 压缩（JPEG Compression）、位深度压缩（Bit-Depth Reduction）。
3. WHEN 用户提交鲁棒性评估请求，THE RobustnessEvaluator SHALL 对每个对抗样本依次施加所选防御变换，并返回防御后的模型预测结果。
4. THE Platform SHALL 展示每种攻击算法在每种防御变换下的攻击成功率，以矩阵热力图形式呈现（行为攻击算法，列为防御方法）。
5. IF 鲁棒性评估任务执行失败，THEN THE Platform SHALL 显示具体错误信息，并允许用户重新提交。
6. THE RobustnessEvaluator 的防御变换 SHALL 在后端 CPU 上执行，单次评估总耗时不超过 120 秒（针对单张图片、3 种攻击、3 种防御的组合，允许恰好等于 120 秒）。

---

### Requirement 8：扰动可视化增强

**User Story:** 作为用户，我希望通过多种可视化方式查看攻击扰动，以便直观理解不同攻击算法的扰动特征。

#### Acceptance Criteria

1. THE Platform SHALL 在攻击结果页面提供扰动可视化选项卡，包含以下三种视图：热力图（Heatmap）、差值放大图（Amplified Difference）、频域分析图（Frequency Domain）。
2. WHEN 用户切换可视化选项卡，THE Platform SHALL 在不重新执行攻击任务的情况下，切换展示对应的扰动可视化图像。
3. WHEN AttackTask 完成，THE Platform SHALL 在后端计算差值放大图：将原始图像与对抗图像的像素差值乘以放大系数（默认 10 倍），并归一化为可视图像。
4. WHEN AttackTask 完成，THE Platform SHALL 在后端计算频域分析图：对原始图像与对抗图像分别进行二维快速傅里叶变换（2D FFT），并展示幅度谱的差异图。
5. WHEN AttackTask 完成，THE Platform SHALL 在任务结果中同时返回差值放大图和频域分析图的 base64 编码图像。
6. THE Platform 的扰动可视化图像 SHALL 与原始图像和对抗图像保持相同的显示尺寸，以便对比观察。

---

### Requirement 9：攻击参数敏感性分析

**User Story:** 作为研究人员，我希望固定图片并自动扫描某个参数的多个取值，以便观察攻击成功率和扰动大小随参数变化的规律。

#### Acceptance Criteria

1. THE Platform SHALL 提供参数敏感性分析功能，允许用户选择一种算法、上传图片，并指定一个参数（扫描参数）的扫描范围和步数。
2. THE SensitivityAnalyzer SHALL 支持对以下参数进行扫描：FGSM/I-FGSM/PGD 的 `epsilon`，C&W 的 `c`，DeepFool 的 `overshoot`。
3. WHEN 用户提交敏感性分析请求，THE SensitivityAnalyzer SHALL 首先验证输入：扫描步数须为正整数，参数范围的最小值须小于最大值；验证通过后，按照指定步数在扫描范围内均匀采样参数值，并为每个取值提交一个 AttackTask。
4. IF 用户提交的敏感性分析请求输入无效（扫描步数非正整数或参数范围无效），THEN THE Platform SHALL 拒绝请求并返回具体的验证错误信息，不执行任何 AttackTask。
5. THE SensitivityAnalyzer 单次分析的扫描步数 SHALL 不超过 20 步，以控制服务器计算负载。
6. WHEN 所有扫描步骤的 AttackTask 均完成，THE Platform SHALL 绘制折线图，横轴为参数取值，纵轴分别为攻击成功率和 L2 扰动大小。
7. THE Platform SHALL 在折线图上标注每个数据点，并支持鼠标悬停查看具体数值。
8. IF 某个扫描步骤的 AttackTask 失败，THEN THE Platform SHALL 在折线图中跳过该数据点，并在图表下方显示失败步骤的错误信息。

---

### Requirement 10：模型鲁棒性排行榜

**User Story:** 作为研究人员，我希望查看不同模型在相同攻击下的历史表现排名，以便了解各模型的鲁棒性差异。

#### Acceptance Criteria

1. THE Platform SHALL 提供模型鲁棒性排行榜页面，展示基于历史攻击数据的模型排名。
2. THE Leaderboard SHALL 按攻击算法分组展示，用户可通过下拉菜单选择查看特定算法的排行榜。
3. THE Leaderboard SHALL 展示每个模型的以下统计指标：总攻击次数、攻击成功次数、攻击成功率（百分比）、平均 L2 范数、平均 Linf 范数。
4. THE Leaderboard SHALL 按攻击成功率升序排列（成功率越低表示模型越鲁棒，排名越靠前）。
5. WHEN 排行榜数据为空（无历史记录），THE Platform SHALL 显示「暂无数据，请先执行攻击实验」的提示信息。
6. THE Leaderboard 的数据 SHALL 来源于后端 `AttackHistory` 表的聚合查询，无需额外存储。
7. THE Platform SHALL 提供排行榜数据的刷新按钮，WHEN 用户点击刷新，THE Platform SHALL 重新请求后端数据并更新展示。

---

### Requirement 11：自适应资源分配

**User Story:** 作为平台运维人员，我希望系统根据算法类型和参数规模自动评估任务复杂度并动态调整 Celery 队列优先级，以便合理分配服务器资源。

#### Acceptance Criteria

1. THE TaskScheduler SHALL 在 AttackTask 提交前评估任务计算复杂度，评估依据包括：算法类型（单步/迭代/优化）、迭代次数参数（`num_iter`、`max_iter`、`binary_search_steps`）。
2. THE TaskScheduler SHALL 将任务分为三个优先级：高优先级（FGSM 等单步算法）、中优先级（I-FGSM、PGD 等迭代算法）、低优先级（C&W、DeepFool 等优化算法）。
3. THE TaskScheduler SHALL 将不同优先级的任务路由到对应的 Celery 队列：`high`、`default`、`low`。
4. WHEN Celery Worker 启动时，THE Platform SHALL 配置 Worker 按照 `high:default:low = 4:2:1` 的比例消费各队列任务。
5. THE TaskScheduler 的复杂度评估逻辑 SHALL 封装为独立函数，可被 API 层调用，不依赖 Celery 内部实现。

---

### Requirement 12：耗时任务参数限制

**User Story:** 作为平台运维人员，我希望系统在服务器负载较高时自动限制耗时算法的参数上限，以防止单个任务长时间占用资源。

#### Acceptance Criteria

1. THE TaskScheduler SHALL 在接收 C&W 或 DeepFool 任务提交请求时，查询当前 Celery 队列中的待处理任务数量。
2. WHEN 当前队列中待处理任务数量超过配置阈值（默认 5 个），THE TaskScheduler SHALL 自动将 C&W 的 `max_iter` 限制为不超过 200，`binary_search_steps` 限制为不超过 3。
3. WHEN 当前队列中待处理任务数量超过配置阈值，THE TaskScheduler SHALL 自动将 DeepFool 的 `max_iter` 限制为不超过 30。
4. WHEN 参数被自动限制时，THE Platform SHALL 在 API 响应中返回 `param_limited: true` 字段及限制原因说明；`param_limited` 仅在参数因队列阈值超限而被限制时设为 `true`，其他情况下设为 `false`。
5. THE Platform 前端 SHALL 在收到 API 响应时，若响应中包含 `param_limited: true`，则向用户展示提示信息，说明哪些参数被限制及限制原因；若 `param_limited` 为 `false`，则不展示限制提示。
6. THE TaskScheduler 的参数限制阈值 SHALL 可通过后端配置文件（`Settings`）进行调整，无需修改代码。

---

### Requirement 13：任务队列状态感知

**User Story:** 作为用户，我希望在提交任务前看到当前队列中的任务数量和预估等待时间，以便决策是否立即提交。

#### Acceptance Criteria

1. THE QueueMonitor SHALL 提供 API 端点 `GET /api/v1/tasks/queue-status`，返回当前各队列的待处理任务数量和预估等待时间。
2. THE QueueMonitor 的预估等待时间 SHALL 基于以下公式计算：`预估等待时间 = 待处理任务数 × 该队列的平均任务耗时`，平均任务耗时来源于 `AttackHistory` 表的历史数据（包括耗时为零的记录，直接使用实际测量值）。
3. IF `AttackHistory` 表中无历史数据，THEN THE QueueMonitor SHALL 使用默认预估耗时（高优先级队列 30 秒，默认队列 120 秒，低优先级队列 300 秒）。
4. THE Platform 前端 SHALL 在攻击任务提交表单上方展示队列状态信息，包括待处理任务数和预估等待时间。
5. THE Platform 前端 SHALL 每隔 30 秒自动刷新队列状态信息。
6. THE QueueMonitor 的 API 端点 SHALL 无需用户登录即可访问（公开端点），以便在登录前也能查看队列状态。

---

### Requirement 14：并发任务数限制

**User Story:** 作为平台运维人员，我希望每个用户同时运行的任务数不超过配置上限，以防止单个用户占用过多资源。

#### Acceptance Criteria

1. THE Platform SHALL 在用户提交 AttackTask 时，查询该用户当前处于 `running` 或 `pending` 状态的 TaskRecord 数量。
2. WHEN 用户当前活跃任务数量达到配置上限（默认 2 个），THE Platform SHALL 拒绝新的任务提交请求，并返回 HTTP 429 状态码及提示信息；IF 因系统错误或竞态条件导致判断不确定，THE Platform SHALL 同样允许拒绝请求以保护服务器资源。
3. THE Platform 前端 SHALL 在收到 HTTP 429 响应时，向用户展示「当前已有 N 个任务在运行，请等待任务完成后再提交」的提示信息，其中 N 为当前活跃任务数。
4. THE Platform 的并发任务上限 SHALL 可通过后端配置文件（`Settings`）中的 `max_concurrent_tasks_per_user` 字段进行调整，默认值为 2。
5. THE Platform 的并发任务限制 SHALL 适用于所有攻击算法的提交端点（`/api/v1/attacks/*/submit`）。
6. WHEN 用户的某个 AttackTask 完成或失败，THE Platform SHALL 将对应 TaskRecord 状态更新为终态（`completed` 或 `failed`），使该任务不再计入活跃任务数。

---

### Requirement 15：修复队列状态 API 路由注册

**User Story:** 作为用户，我希望进入实验界面时不出现「请求的资源不存在」错误，以便正常查看队列状态并提交任务。

#### Acceptance Criteria

1. THE Platform 后端 SHALL 正确注册 `GET /api/v1/tasks/queue-status` 端点，使其在 FastAPI 路由表中可被访问。
2. WHEN 前端请求 `GET /api/v1/tasks/queue-status`，THE Platform SHALL 返回 HTTP 200 及队列状态数据，而非 HTTP 404。
3. THE Platform SHALL 确保 `tasks` 路由器已在 `backend/app/main.py` 中通过 `app.include_router` 正确挂载，前缀为 `/api/v1`。
4. IF `queue-status` 端点路由注册正确但 Redis 连接失败，THEN THE Platform SHALL 返回 HTTP 503 及错误说明，而非 HTTP 404。
5. THE Platform SHALL 在后端启动日志中可见 `/api/v1/tasks/queue-status` 路由条目，以便运维人员验证注册状态。

---

### Requirement 16：移除同步/异步切换，默认异步模式

**User Story:** 作为用户，我希望攻击任务界面直接使用异步模式，不需要手动切换，以便简化操作流程。

#### Acceptance Criteria

1. THE Platform 前端 SHALL 移除所有攻击算法提交页面（FGSM、I-FGSM、PGD、C&W、DeepFool）中的同步/异步切换按钮或开关控件。
2. THE Platform 前端 SHALL 所有攻击任务提交均默认使用异步模式（调用 `/submit` 端点并轮询任务状态）。
3. WHEN 用户点击提交按钮，THE Platform SHALL 直接提交异步任务并展示任务进度轮询界面，不再提供同步执行选项。
4. THE Platform 后端 SHALL 保留同步执行相关端点（如有），但前端不再暴露该入口。
5. THE Platform 的对比模式（CompareMode）SHALL 同样移除同步/异步切换，默认异步并发提交所有面板任务。

---

### Requirement 17：前端移动端响应式布局优化

**User Story:** 作为移动端用户，我希望平台界面在手机和平板上能正常显示和操作，以便在移动设备上使用平台功能。

#### Acceptance Criteria

1. THE Platform 前端 SHALL 使用 Ant Design 5 的响应式栅格系统（`Row`/`Col` 的 `xs`/`sm`/`md`/`lg` 断点）重构主要页面布局。
2. THE Platform 的侧边导航栏 SHALL 在移动端（屏幕宽度 < 768px）自动折叠为抽屉式（Drawer）或汉堡菜单，不遮挡主内容区域。
3. THE Platform 的攻击参数表单 SHALL 在移动端以单列布局展示，Slider 控件宽度自适应屏幕宽度。
4. THE Platform 的对比结果表格 SHALL 在移动端支持横向滚动，不出现内容截断。
5. THE Platform 的图片展示区域（原始图、对抗图、热力图）SHALL 在移动端自适应宽度，保持图片比例不变形。
6. THE Platform 的公开首页（`/`）和关于页面（`/about`）SHALL 在移动端正确响应，各区块垂直堆叠展示。
7. WHEN 屏幕宽度 < 768px，THE Platform SHALL 隐藏非必要的辅助信息列，保留核心操作控件和结果展示。
8. THE Platform 的所有按钮和可交互元素 SHALL 在移动端满足最小触控目标尺寸（44×44px），以确保可操作性。

---

### Requirement 18：我的任务页面查看结果

**User Story:** 作为用户，我希望在「我的任务」页面查看历史任务的完整攻击结果，以便回顾和对比不同实验的输出。

#### Acceptance Criteria

1. THE Platform SHALL 在「我的任务」页面（`/tasks` 或 `/my-tasks`）为每条任务记录提供「查看结果」入口（按钮或链接）。
2. WHEN 用户点击「查看结果」，THE Platform SHALL 展示该任务的完整结果，包括：原始图像、对抗图像、热力图、攻击指标（L2 范数、Linf 范数、攻击成功率、置信度、执行耗时）。
3. WHEN 任务状态为 `completed`，THE Platform SHALL 启用「查看结果」按钮；WHEN 任务状态为 `pending` 或 `running`，THE Platform SHALL 禁用该按钮并显示当前状态。
4. WHEN 任务状态为 `failed`，THE Platform SHALL 在结果区域显示失败原因，而非空白页面。
5. THE Platform SHALL 支持在「我的任务」页面直接内联展示结果（展开行或侧边抽屉），无需跳转新页面。
6. THE Platform 的任务结果展示 SHALL 复用现有的 `PerturbationViewer` 组件（热力图、差值放大图、频域分析图三视图）。
7. THE Platform SHALL 在「我的任务」页面提供任务列表的分页功能，每页默认展示 10 条记录。

---

### Requirement 19：上传图片复用机制

**User Story:** 作为用户，我希望能够复用之前上传过的图片，而不必每次都重新上传，以便节省时间并减少服务器存储占用。

#### Acceptance Criteria

1. THE Platform 后端 SHALL 在用户上传图片时，计算图片的 SHA-256 哈希值，若该哈希已存在于 `UploadedFile` 表中（同一用户），则直接返回已有文件记录，不重复存储文件。
2. THE Platform 前端 SHALL 在各攻击算法提交页面的图片上传区域下方，提供「从我的图片库选择」入口，展示该用户历史上传的图片缩略图列表。
3. WHEN 用户从图片库选择图片，THE Platform SHALL 将该图片填充到当前上传区域，效果与重新上传相同。
4. THE Platform 的图片库 SHALL 展示图片缩略图、上传时间和文件名，支持按上传时间倒序排列。
5. THE Platform 后端 SHALL 提供 `GET /api/v1/files/my-uploads` 端点（需认证），返回当前用户的历史上传文件列表（含文件 ID、文件名、上传时间、文件大小、缩略图 URL）。
6. THE Platform 后端 SHALL 提供 `POST /api/v1/files/upload` 端点（需认证），处理图片上传并执行去重逻辑，返回文件 ID 和访问 URL。
7. THE UploadedFile 记录 SHALL 包含以下字段：`id`、`user_id`、`filename`、`file_path`、`file_hash`（SHA-256）、`file_size`、`created_at`。
8. WHEN 用户删除某张图片（通过图片库管理），THE Platform SHALL 检查该文件是否被其他任务引用；IF 存在引用，THEN THE Platform SHALL 仅标记为用户不可见，不物理删除文件。

---

### Requirement 20：管理员后台文件管理

**User Story:** 作为管理员，我希望在后台管理界面查看和管理所有用户上传的文件，以便监控存储使用情况并清理无用文件。

#### Acceptance Criteria

1. THE Platform 后端 SHALL 提供 `GET /api/v1/admin/files` 端点（需 Admin 角色），支持分页和按用户/上传时间筛选，返回所有用户的上传文件列表。
2. THE Platform 后端 SHALL 提供 `DELETE /api/v1/admin/files/{file_id}` 端点（需 Admin 角色），允许管理员物理删除指定文件及其数据库记录。
3. WHEN 管理员删除文件时，THE Platform SHALL 检查该文件是否被任务记录引用；IF 存在引用，THE Platform SHALL 在响应中返回警告信息，并要求管理员确认强制删除。
4. THE Platform 前端管理员页面 SHALL 新增「文件管理」标签页，展示文件列表表格，包含：文件名、上传用户、文件大小、上传时间、操作（删除）列。
5. THE Platform 的文件管理页面 SHALL 展示存储统计信息：总文件数、总存储占用（MB）、各用户存储占用排行（Top 10）。
6. THE Platform 的文件管理页面 SHALL 支持批量删除：管理员可勾选多个文件后一键删除。
7. WHEN 管理员执行删除操作，THE Platform SHALL 要求二次确认（Ant Design `Modal.confirm`），防止误操作。
8. THE Platform 后端 SHALL 提供 `GET /api/v1/admin/files/stats` 端点（需 Admin 角色），返回存储统计数据。
