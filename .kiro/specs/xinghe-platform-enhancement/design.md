 # Design Document

## Overview

本文档描述「星河智安 AI 安全攻击可视化平台」增强功能的技术设计方案。平台基于 React 18 + Ant Design 5（前端）和 FastAPI + Celery + Redis + PostgreSQL（后端）构建，本次增强涵盖四个方向：公开页面、多算法对比实验增强、AI 安全创新功能、后端任务处理优化。

---

## Architecture

### 系统整体架构

```text
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React 18 + Vite)                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  PublicPages │  │  AuthPages   │  │  ProtectedPages    │ │
│  │  / /about    │  │  /login      │  │  /dashboard        │ │
│  │              │  │  /register   │  │  /attacks/*        │ │
│  └──────────────┘  └──────────────┘  │  /robustness       │ │
│                                       │  /sensitivity      │ │
│                                       │  /leaderboard      │ │
│                                       └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP / REST
┌─────────────────────────────────────────────────────────────┐
│                     后端 (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routers                                          │   │
│  │  /api/v1/auth  /api/v1/attacks/*  /api/v1/tasks/*    │   │
│  │  /api/v1/robustness  /api/v1/sensitivity             │   │
│  │  /api/v1/leaderboard  /api/v1/tasks/queue-status     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │TaskScheduler │  │QueueMonitor  │  │RobustnessEvaluator│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SensitivityAnalyzer                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │ Celery tasks                    │ SQLAlchemy ORM
┌────────────────┐              ┌──────────────────────────┐
│  Redis         │              │  PostgreSQL               │
│  - Broker      │              │  - users                 │
│  - Result      │              │  - task_records          │
│  - Queue:high  │              │  - attack_history        │
│  - Queue:default│             └──────────────────────────┘
│  - Queue:low   │
└────────────────┘
```

### 新增模块关系

```text
backend/app/
├── api/v1/
│   ├── attacks/
│   │   └── tasks.py          ← 新增 queue-status 端点
│   ├── robustness.py         ← 新增：鲁棒性评估 API
│   ├── sensitivity.py        ← 新增：敏感性分析 API
│   └── leaderboard.py        ← 新增：排行榜 API
├── core/
│   ├── config.py             ← 扩展：新增配置字段
│   ├── task_scheduler.py     ← 新增：任务调度器
│   └── queue_monitor.py      ← 新增：队列监控器
├── services/
│   ├── robustness_service.py ← 新增：鲁棒性评估服务
│   └── sensitivity_service.py← 新增：敏感性分析服务
└── workers/
    └── attack_task.py        ← 扩展：增加扰动可视化计算

web/src/
├── pages/
│   ├── Home/                 ← 新增：公开首页
│   ├── About/                ← 新增：关于页面
│   ├── Attacks/
│   │   └── CompareMode.jsx   ← 重构：支持 2-4 面板
│   ├── Robustness/           ← 新增：鲁棒性评估页面
│   ├── Sensitivity/          ← 新增：敏感性分析页面
│   └── Leaderboard/          ← 新增：排行榜页面
├── components/
│   ├── params/               ← 新增：可视化参数控件
│   └── export/               ← 新增：导出功能组件
└── api/
    ├── robustness.js         ← 新增
    ├── sensitivity.js        ← 新增
    └── leaderboard.js        ← 新增
```

---

## Components and Interfaces

### 1. 公开页面（Requirements 1 & 2）

#### 前端路由改造

当前 `App.jsx` 将所有路由包裹在 `ProtectedRoute` 内，需要重构为支持公开路由：

```jsx
// App.jsx 路由结构
<Routes>
  {/* 公开路由 */}
  <Route path="/" element={<HomePage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* 受保护路由 */}
  <Route path="/*" element={
    <ProtectedRoute>
      <MainLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ... 其他受保护路由 */}
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  } />
</Routes>
```

#### HomePage 组件结构

```text
HomePage
├── PublicNavbar          — 导航栏（含登录/注册按钮，已登录时显示进入Dashboard）
├── HeroBanner            — 平台介绍横幅
├── FeaturesSection       — 核心功能展示（4个功能卡片）
├── AlgorithmsSection     — 攻击算法介绍（5种算法卡片）
├── LabSection            — 实验室介绍
└── CTASection            — 快速开始入口（立即登录 / 注册账号）
```

#### AboutPage 组件结构

```text
AboutPage
├── PublicNavbar
├── LabIntroSection       — 实验室介绍 + 主页链接（target="_blank"）
├── ResearchSection       — 研究方向列表
├── TechStackSection      — 技术栈说明
└── VersionSection        — 版本信息（从 /info 端点获取 app_version）
```

#### 后端支持

`GET /info` 端点已存在，返回 `app.version`，AboutPage 直接调用即可，无需新增端点。

---

### 2. 多算法对比实验（Requirements 3, 4, 5, 6）

#### CompareMode 重构

将现有双面板硬编码改为动态面板数组（2–4 个）：

```javascript
// 状态结构
const [panels, setPanels] = useState([
  initialPanelState('fgsm'),
  initialPanelState('cw'),
]);

// 面板操作
addPanel()         // panels.length < 4 时追加
removePanel(index) // panels.length > 2 时移除
```

#### AlgorithmParamEditor 组件

替代现有 JSON TextArea，为每种算法渲染对应的 Slider + InputNumber 控件：

```text
AlgorithmParamEditor
├── props: { algorithm, params, onChange }
├── FGSM:     EpsilonSlider(0.001-0.3, step=0.001)
├── I-FGSM:   EpsilonSlider + AlphaSlider + NumIterInput
├── PGD:      EpsilonSlider + AlphaSlider + NumIterInput + NormSelect
├── C&W:      CSlider + LrSlider + MaxIterInput + BinarySearchInput
└── DeepFool: OvershootSlider + MaxIterInput + NumClassesInput
```

参数越界处理：`onChange` 回调中截断至边界值并触发 `message.warning`。

#### 详细指标展示

`ResultPanel` 组件扩展，展示以下指标（含异常检测）：

| 指标 | 有效范围 | 异常标注 |
| --- | --- | --- |
| L2 范数 | ≥ 0 | < 0 → 「数据异常」 |
| Linf 范数 | ≥ 0 | < 0 → 「数据异常」 |
| 攻击成功率 | 0–100% | 超出 → 「数据异常」 |
| 原始置信度 | 0–1 | 超出 → 「数据异常」 |
| 对抗置信度 | 0–1 | 超出 → 「数据异常」 |
| 执行耗时 | > 0 s | ≤ 0 → 「数据异常」 |

#### 导出功能

- **导出图片**：使用 `html2canvas` 截取结果区域 DOM，触发 PNG 下载，文件名格式 `compare_result_{timestamp}.png`。
- **导出 PDF**：使用 `jspdf` + `html2canvas`，将各面板的原始图、对抗图、热力图和指标数据组合为 PDF，包含平台名称和导出时间。

---

### 3. 扰动可视化增强（Requirement 8）

#### 后端：attack_task.py 扩展

在 `run_attack` 任务中，AttackTask 完成后额外计算两种可视化图像：

```python
# 差值放大图
diff = np.abs(orig_np.astype(float) - adv_np.astype(float))
amplified = np.clip(diff * 10, 0, 255).astype(np.uint8)
amplified_b64 = image_to_base64(amplified)

# 频域分析图
def compute_fft_diff(orig, adv):
    orig_gray = cv2.cvtColor(orig, cv2.COLOR_RGB2GRAY)
    adv_gray = cv2.cvtColor(adv, cv2.COLOR_RGB2GRAY)
    fft_orig = np.abs(np.fft.fftshift(np.fft.fft2(orig_gray)))
    fft_adv = np.abs(np.fft.fftshift(np.fft.fft2(adv_gray)))
    diff_spectrum = np.log1p(np.abs(fft_adv - fft_orig))
    normalized = (diff_spectrum / diff_spectrum.max() * 255).astype(np.uint8)
    return image_to_base64(normalized)

fft_diff_b64 = compute_fft_diff(orig_np, adv_np)
```

任务结果中新增字段：

```json
{
  "amplified_diff": "<base64>",
  "fft_diff": "<base64>"
}
```

#### 前端：PerturbationViewer 组件

```text
PerturbationViewer
├── props: { heatmap, amplifiedDiff, fftDiff, width, height }
├── Tabs:
│   ├── Tab "热力图"       → <img src={heatmap} />
│   ├── Tab "差值放大图"   → <img src={amplifiedDiff} />
│   └── Tab "频域分析图"   → <img src={fftDiff} />
└── 所有图像统一 width/height，与原图保持一致
```

---

### 4. 对抗样本鲁棒性评估（Requirement 7）

#### 后端：robustness_service.py

```python
class RobustnessService:
    DEFENSES = {
        "gaussian_blur": apply_gaussian_blur,    # sigma=1.0
        "jpeg_compression": apply_jpeg_compress, # quality=75
        "bit_depth_reduction": apply_bit_depth,  # bits=4
    }

    def evaluate(
        self,
        image_b64: str,
        algorithms: list[str],
        model_id: str,
        db: Session,
    ) -> dict:
        """
        对每种算法生成对抗样本，再对每种防御变换评估攻击成功率。
        返回 attacks × defenses 矩阵。
        超时限制：120 秒（通过 Celery task_soft_time_limit 控制）。
        """
```

#### 鲁棒性评估 API 端点

```text
POST /api/v1/robustness/evaluate
  Body: { image: str, algorithms: list[str], model_name: str }
  Response: { task_id: str, status: "pending" }

GET /api/v1/robustness/result/{task_id}
  Response: {
    status: "completed" | "running" | "failed",
    matrix: {
      "fgsm": { "gaussian_blur": 0.8, "jpeg_compression": 0.6, ... },
      ...
    },
    error: str | null
  }
```

#### 前端：RobustnessPage

```text
RobustnessPage
├── ImageUploader
├── AlgorithmMultiSelect   — 多选攻击算法
├── SubmitButton
├── ProgressIndicator      — 轮询任务状态
└── RobustnessMatrix       — 矩阵热力图（行=算法，列=防御）
    └── 使用 Ant Design Table + 背景色渐变表示成功率
```

---

### 5. 攻击参数敏感性分析（Requirement 9）

#### 后端：sensitivity_service.py

```python
class SensitivityService:
    SCANNABLE_PARAMS = {
        "fgsm": "epsilon",
        "ifgsm": "epsilon",
        "pgd": "epsilon",
        "cw": "c",
        "deepfool": "overshoot",
    }

    def submit_scan(
        self,
        algorithm: str,
        image_b64: str,
        model_id: str,
        scan_param: str,
        param_min: float,
        param_max: float,
        steps: int,          # 1 ≤ steps ≤ 20
        base_params: dict,
        user_id: int,
        db: Session,
    ) -> str:
        """验证输入，均匀采样，批量提交 AttackTask，返回 scan_id。"""
```

#### 敏感性分析 API 端点

```text
POST /api/v1/sensitivity/scan
  Body: {
    algorithm: str,
    image: str,
    model_name: str,
    scan_param: str,
    param_min: float,
    param_max: float,
    steps: int,
    base_params: dict
  }
  Response: { scan_id: str, task_ids: list[str] }

GET /api/v1/sensitivity/result/{scan_id}
  Response: {
    status: "running" | "completed" | "partial",
    data_points: [
      {
        param_value: float,
        success_rate: float,
        l2_norm: float,
        status: "ok" | "failed",
        error: str | null
      }
    ]
  }
```

#### 前端：SensitivityPage

```text
SensitivityPage
├── AlgorithmSelector
├── ImageUploader
├── ScanParamConfig        — 参数名、最小值、最大值、步数（1-20）
├── SubmitButton
├── ProgressBar            — 已完成步数 / 总步数
└── SensitivityChart       — 折线图（Recharts 或 Ant Design Charts）
    ├── X轴: 参数取值
    ├── Y轴1: 攻击成功率
    ├── Y轴2: L2 扰动大小
    ├── 数据点标注 + Tooltip
    └── 失败步骤错误信息列表
```

---

### 6. 模型鲁棒性排行榜（Requirement 10）

#### 后端：leaderboard.py

```sql
-- GET /api/v1/leaderboard?algorithm=fgsm
-- 聚合查询 AttackHistory 表
SELECT
    model_name,
    COUNT(*) AS total_attacks,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS success_count,
    AVG(success_rate) AS avg_success_rate,
    AVG(l2_norm) AS avg_l2_norm,
    AVG(linf_norm) AS avg_linf_norm
FROM attack_history
WHERE algorithm = :algorithm
GROUP BY model_name
ORDER BY avg_success_rate ASC
```

#### 前端：LeaderboardPage

```text
LeaderboardPage
├── AlgorithmSelect        — 下拉选择算法
├── RefreshButton
└── LeaderboardTable       — Ant Design Table
    ├── 排名列（自动序号）
    ├── 模型名称
    ├── 总攻击次数
    ├── 攻击成功次数
    ├── 攻击成功率（%）
    ├── 平均 L2 范数
    └── 平均 Linf 范数
```

空数据时显示 Empty 组件，提示「暂无数据，请先执行攻击实验」。

---

### 7. 后端任务处理优化（Requirements 11–14）

#### 7.1 TaskScheduler（Requirement 11）

新增 `app/core/task_scheduler.py`：

```python
from enum import Enum

class TaskPriority(Enum):
    HIGH = "high"       # FGSM（单步）
    DEFAULT = "default" # I-FGSM, PGD（迭代）
    LOW = "low"         # C&W, DeepFool（优化）

def evaluate_complexity(algorithm: str, params: dict) -> TaskPriority:
    """
    独立函数，不依赖 Celery 内部实现。
    可被 API 层直接调用。
    """
    if algorithm == "fgsm":
        return TaskPriority.HIGH
    if algorithm in ("ifgsm", "pgd"):
        return TaskPriority.DEFAULT
    return TaskPriority.LOW  # cw, deepfool

def get_queue_name(priority: TaskPriority) -> str:
    return priority.value
```

Celery Worker 启动命令（`run_backend.ps1` 更新）：

```bash
celery -A app.workers.celery_app worker \
  --queues=high,default,low \
  --concurrency=1 \
  -O fair
```

Celery 队列权重配置（`celery_app.py` 更新）：

```python
celery_app.conf.task_routes = {
    # 默认路由，由调度器在 apply_async(queue=queue_name) 时覆盖
    "app.workers.attack_task.run_attack": {"queue": "default"},
}
```

#### 7.2 参数限制（Requirement 12）

在 `task_scheduler.py` 中新增：

```python
def apply_param_limits(
    algorithm: str,
    params: dict,
    queue_depth: int,
    threshold: int,  # 来自 settings.task_queue_threshold
) -> tuple[dict, bool, str]:
    """
    返回 (limited_params, param_limited, reason)
    """
    if queue_depth <= threshold:
        return params, False, ""

    limited = params.copy()
    reason_parts = []

    if algorithm == "cw":
        if limited.get("max_iter", 0) > 200:
            limited["max_iter"] = 200
            reason_parts.append("max_iter 限制为 200")
        if limited.get("binary_search_steps", 0) > 3:
            limited["binary_search_steps"] = 3
            reason_parts.append("binary_search_steps 限制为 3")
    elif algorithm == "deepfool":
        if limited.get("max_iter", 0) > 30:
            limited["max_iter"] = 30
            reason_parts.append("max_iter 限制为 30")

    param_limited = bool(reason_parts)
    return limited, param_limited, "；".join(reason_parts)
```

API 响应中新增字段：

```json
{
  "task_id": "...",
  "status": "pending",
  "param_limited": true,
  "param_limit_reason": "max_iter 限制为 200；binary_search_steps 限制为 3"
}
```

#### 7.3 QueueMonitor（Requirement 13）

新增 `app/core/queue_monitor.py`：

```python
DEFAULT_AVG_TIMES = {
    "high": 30.0,
    "default": 120.0,
    "low": 300.0,
}

def get_queue_depth(queue_name: str) -> int:
    """通过 Redis 查询队列长度（LLEN）。"""

def get_avg_execution_time(queue_name: str, db: Session) -> float:
    """从 AttackHistory 查询对应算法的平均耗时，无数据时返回默认值。"""

def get_queue_status(db: Session) -> dict:
    return {
        "high":    {"pending": 0, "estimated_wait_seconds": 0},
        "default": {"pending": 0, "estimated_wait_seconds": 0},
        "low":     {"pending": 0, "estimated_wait_seconds": 0},
    }
```

端点：`GET /api/v1/tasks/queue-status`（无需认证，公开端点）。

前端在攻击提交表单上方展示队列状态，每 30 秒自动刷新（`setInterval`）。

#### 7.4 并发任务限制（Requirement 14）

在各攻击算法的 `/submit` 端点中，提交前检查：

```python
def check_concurrent_limit(user_id: int, db: Session) -> int:
    """返回当前活跃任务数，超限时调用方抛出 HTTP 429。"""
    active_count = db.query(TaskRecord).filter(
        TaskRecord.user_id == user_id,
        TaskRecord.status.in_(["running", "pending"]),
    ).count()
    return active_count
```

`Settings` 新增字段：

```python
max_concurrent_tasks_per_user: int = 2
task_queue_threshold: int = 5
```

HTTP 429 响应体：

```json
{
  "detail": "当前已有 2 个任务在运行，请等待任务完成后再提交",
  "active_tasks": 2
}
```

---

## Data Models

### 配置扩展（Settings）

```python
# app/core/config.py 新增字段
max_concurrent_tasks_per_user: int = 2
task_queue_threshold: int = 5
```

### SensitivityScan（Redis 存储）

敏感性分析的扫描记录使用 Redis 存储 scan_id → task_ids 映射，TTL 1 小时，避免增加数据库迁移复杂度：

```text
Redis Key: sensitivity:scan:{scan_id}
Value: JSON { algorithm, task_ids: [...], param_values: [...], created_at }
TTL: 3600s
```

### AttackHistory 扩展

无需修改表结构，现有字段已满足排行榜聚合查询需求。

---

## Property-Based Testing

### 正确性属性

以下属性将通过 Property-Based Testing（PBT）验证：

#### P1：参数截断属性

- 对任意超出范围的参数值，`AlgorithmParamEditor` 截断后的值必须在 `[min, max]` 内。
- 工具：`fast-check`（前端 JS）

#### P2：面板数量不变式

- 对任意添加/移除操作序列，面板数量始终满足 `2 ≤ count ≤ 4`。
- 工具：`fast-check`

#### P3：任务调度优先级属性

- 对任意合法的 `(algorithm, params)` 输入，`evaluate_complexity` 返回的优先级必须是 `HIGH | DEFAULT | LOW` 之一，且 FGSM 始终为 HIGH，C&W/DeepFool 始终为 LOW。
- 工具：`hypothesis`（Python）

#### P4：参数限制幂等性

- 对已经被限制过的参数再次调用 `apply_param_limits`，结果不变（幂等）。
- 工具：`hypothesis`

#### P5：队列状态非负性

- `get_queue_status` 返回的所有 `pending` 和 `estimated_wait_seconds` 值必须 ≥ 0。
- 工具：`hypothesis`

#### P6：敏感性分析步数约束

- 对任意合法输入，`SensitivityService.submit_scan` 提交的 AttackTask 数量等于 `steps`，且 `1 ≤ steps ≤ 20`。
- 工具：`hypothesis`

#### P7：指标有效范围检测

- 对任意指标值，前端 `isMetricValid` 函数对有效值返回 `true`，对无效值返回 `false`，无漏判。
- 工具：`fast-check`

---

## Error Handling

| 场景 | 处理方式 |
| --- | --- |
| 首页渲染失败 | `ErrorBoundary` 捕获，显示错误页面 |
| 参数越界 | 截断至边界值 + `message.warning` 提示 |
| 任务提交超并发限制 | HTTP 429 + 前端 Toast 提示 |
| 参数被自动限制 | API 响应 `param_limited: true` + 前端提示 |
| 鲁棒性评估超时 | Celery `task_soft_time_limit=120` 触发，返回 failed 状态 |
| 敏感性分析输入无效 | HTTP 422 + 具体验证错误信息，不提交任何任务 |
| 某个扫描步骤失败 | 折线图跳过该点，图表下方显示错误信息 |
| 排行榜无数据 | 显示 Empty 组件提示 |
| 导出失败 | `message.error` 提示，不中断其他操作 |
