# Design

## Visual Theme

**明亮 · 专业 · 有温度**

亮色主题为主，深色侧边栏提供视觉锚点。界面传达"专业可信的教育工具"感，避免冰冷的纯科技风格。

## Color Palette

### 品牌色

| Token | 值 | 用途 |
|-------|-----|------|
| `--xh-primary` | `#1677ff` | 主操作、选中态、链接 |
| `--xh-primary-soft` | `#e8f1ff` | 主色背景、标签底色 |

### 语义色

| Token | 值 | 用途 |
|-------|-----|------|
| `colorSuccess` | `#16a34a` | 成功状态、攻击成功 |
| `colorWarning` | `#f59e0b` | 警告、进行中 |
| `colorError` | `#dc2626` | 错误、攻击失败 |

### 中性色

| Token | 值 | 用途 |
|-------|-----|------|
| `--xh-bg` | `#f3f6fb` | 页面背景（渐变起点） |
| `--xh-bg-soft` | `#f8fbff` | 柔和面板背景 |
| `--xh-surface` | `#ffffff` | 卡片、表单背景 |
| `--xh-sidebar` | `#0f172a` | 侧边栏深色背景 |
| `--xh-text` | `#0f172a` | 主文本 |
| `--xh-text-secondary` | `#64748b` | 次要文本、描述 |
| `--xh-border` | `#e7edf5` | 边框、分割线 |

### 可视化配色（色盲友好）

热力图和对比图使用蓝-橙互补色系，避免红绿同时使用。

## Typography

### 字体栈

- **正文**: `'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif`
- **代码**: `'JetBrains Mono', Consolas, monospace`

### 字重

- 标题: `700` (Bold)
- 正文: `400` (Regular)
- 强调/标签: `600` (SemiBold) 或 `700` (Bold)

### 行高

- 标题: `1.2`
- 正文: `1.7`

## Elevation

### 圆角

| 级别 | 值 | 用途 |
|------|-----|------|
| `borderRadius` | `14px` | 卡片、按钮、输入框 |
| `borderRadiusLG` | `20px` | 大卡片、弹窗 |
| 胶囊 | `999px` | 标签、徽章 |

### 阴影

| Token | 值 | 用途 |
|-------|-----|------|
| `--xh-shadow` | `0 12px 32px rgba(15,23,42,0.08)` | 浮层、下拉 |
| `--xh-shadow-soft` | `0 6px 18px rgba(15,23,42,0.05)` | 卡片 |
| 侧边栏 | `14px 0 34px rgba(15,23,42,0.12)` | 侧边栏投影 |

### 毛玻璃

- 顶部导航: `backdrop-filter: blur(10px)` + `rgba(255,255,255,0.92)`

## Components

### 布局

- **Shell**: 侧边栏 + 顶栏 + 内容区，`min-height: 100vh`
- **侧边栏**: 深色背景 (`#0f172a`)，选中项蓝色高亮 + 投影
- **内容区**: `padding: 24px`，卡片间距 `18px`
- **响应式**: `≤1200px` 工具栏纵向堆叠，`≤900px` 内容区 padding 缩至 `16px`

### 卡片

- 统一使用 `1px solid var(--xh-border)` 边框 + `var(--xh-shadow-soft)` 投影
- 页头横幅 `.xh-page-banner`、统计卡 `.xh-stat-card`、管理卡 `.xh-admin-card` 共享基础样式

### 表单

- 网格布局 `.xh-form-grid`，间距 `14px`
- 按钮组 `.xh-action-group`，间距 `8px`

### 标签/徽章

- 圆角胶囊 (`999px`)，无边框，`font-weight: 700`
- 角色标签 `.xh-role-tag`、状态标签 `.xh-status-tag`

### 空状态

- 白色圆角面板 (`border-radius: 20px`)，标题 + 灰色描述文本

## Motion

- 尊重 `prefers-reduced-motion` 系统设置
- 微交互: 侧边栏菜单项 hover 背景渐变、选中项投影
- 页面转场: 使用 Ant Design 默认过渡，不添加额外动画

## Iconography

- 使用 Ant Design Icons (`@ant-design/icons`)
- 侧边栏图标 + 文字组合，选中态白色
