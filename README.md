# TechTutorial Pro 🚀

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)
![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-orange.svg)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Lighthouse](https://img.shields.io/badge/Lighthouse-95%2B-success.svg)

**企业级技术教程平台 — 纯静态 · 全端适配 · 永久免费 · 无广告**

[✨ 特性](#-项目介绍) · [📦 安装](#-安装) · [🚀 部署](#-github-pages-部署) · [📖 教程](#-如何新增教程) · [📄 许可](#-license)

</div>

---

## 📖 项目介绍

TechTutorial Pro 是一个面向开发者的企业级技术教程网站。采用纯静态架构（HTML5 + CSS3 + ES6 JavaScript），无需任何后端服务或数据库，可一键部署到 GitHub Pages，永久免费运行。

### ✨ 核心功能

- 🎨 **企业级 UI** — Apple / Tesla / Nothing 设计风格，毛玻璃效果，暗黑模式
- 📱 **全端适配** — 响应式布局，完美支持手机、平板、电脑
- 📝 **教程中心** — Markdown 渲染、代码高亮、复制按钮、目录导航、全文搜索
- 📥 **下载中心** — 软件/固件/PDF/源代码分类下载，下载统计（前端模拟）
- 🔍 **SEO 优化** — robots.txt、sitemap.xml、Open Graph、Twitter Card、Schema.org
- 📲 **PWA 支持** — Service Worker 离线缓存、添加到桌面、安装提示
- 🌙 **暗黑模式** — 自动检测系统主题，手动切换，持久化存储
- 🖼️ **图片系统** — 懒加载、点击放大、轮播、Lightbox 灯箱
- 🔒 **安全合规** — CSP 兼容、无内联脚本污染、XSS 防护
- ⚡ **极致性能** — Lighthouse 95+，毫秒级加载

---

## 📁 目录结构

```
project/
│
├── index.html                    # 首页（Hero、特性、展示、硬件、软件、FAQ、联系我们）
├── 404.html                      # 自定义 404 页面
├── robots.txt                    # 搜索引擎爬虫配置
├── sitemap.xml                   # 网站地图
├── manifest.json                 # PWA 应用清单
├── sw.js                         # Service Worker（离线缓存）
├── favicon.ico                   # 网站图标
│
├── assets/
│   ├── css/
│   │   ├── main.css              # 核心样式、CSS 变量、重置
│   │   ├── components.css        # 组件样式（导航、卡片、按钮、表单等）
│   │   ├── animations.css        # 动画与过渡效果
│   │   └── responsive.css        # 响应式媒体查询
│   │
│   ├── js/
│   │   ├── main.js               # 入口文件，初始化所有模块
│   │   ├── utils.js              # 工具函数（防抖、节流、剪贴板等）
│   │   ├── theme.js              # 暗黑/明亮模式切换
│   │   ├── navigation.js         # 导航栏、移动菜单、滚动监听
│   │   ├── animations.js         # 滚动触发动画（Intersection Observer）
│   │   ├── gallery.js            # 图片灯箱 & 轮播
│   │   ├── tutorial-center.js    # 教程中心 SPA 引擎
│   │   ├── download-center.js    # 下载中心引擎
│   │   ├── faq.js                # FAQ 手风琴组件
│   │   ├── contact.js            # 联系表单验证
│   │   ├── qrcode.js             # 本地二维码生成器
│   │   └── pwa.js                # PWA 安装提示
│   │
│   ├── img/                      # 图片资源（SVG）
│   │   ├── logo.svg
│   │   ├── hero-bg.svg
│   │   ├── features/             # 特性图标
│   │   ├── showcase/             # 项目展示截图
│   │   ├── hardware/             # 硬件图片
│   │   └── icons/                # UI 图标
│   │
│   ├── fonts/                    # 字体文件（自托管）
│   └── icons/                    # PWA 图标
│
├── tutorials/
│   ├── index.html                # 教程中心页面
│   └── data/
│       ├── index.json            # 教程索引（元数据）
│       ├── getting-started.json  # 教程：快速入门指南
│       ├── installation.json     # 教程：环境安装与配置
│       ├── quick-start.json      # 教程：第一个项目
│       ├── advanced-config.json  # 教程：高级配置指南
│       └── troubleshooting.json  # 教程：常见问题排查
│
├── downloads/
│   ├── index.html                # 下载中心页面
│   └── data/
│       └── downloads.json        # 下载项目数据
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自动部署
│
├── README.md                     # 项目说明（本文件）
├── LICENSE                       # MIT 许可证
├── CHANGELOG.md                  # 版本变更日志
├── SECURITY.md                   # 安全政策
├── CONTRIBUTING.md               # 贡献指南
├── CODE_OF_CONDUCT.md            # 行为准则
├── .gitignore                    # Git 忽略文件
└── .nojekyll                     # 禁用 Jekyll 处理
```

---

## 🚀 安装

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/project.git
cd project

# 2. 使用任意 HTTP 服务器启动（三选一）

# 方式 A: 使用 npx serve（推荐，零安装）
npx serve .

# 方式 B: 使用 Python
python -m http.server 8080

# 方式 C: 使用 Node.js http-server
npx http-server -p 8080

# 3. 打开浏览器访问
# http://localhost:3000  (serve)
# http://localhost:8080  (python / http-server)
```

> **注意**：必须通过 HTTP 服务器访问，直接打开 `index.html` 文件会导致 Service Worker 和部分 JavaScript 功能无法正常工作。

---

## 🌐 GitHub Pages 部署

### 自动部署（推荐）

1. **Fork** 本项目到您的 GitHub 账号
2. 进入仓库 **Settings → Pages**
3. **Source** 选择 `GitHub Actions`
4. 推送代码到 `main` 分支，GitHub Actions 将自动部署

> 部署完成后，网站将自动发布到 `https://YOUR_USERNAME.github.io/project/`

### 首次部署注意事项

- ⚠️ 确保仓库设置为 **Public**（公开）
- ⚠️ `.github/workflows/deploy.yml` 文件已包含完整配置，无需修改
- ⚠️ 首次部署可能需要 1-2 分钟
- ⚠️ 如果看到 404，等待 Actions 运行完成

---

## ⚙️ GitHub Actions 工作原理

`.github/workflows/deploy.yml` 配置了以下流程：

```yaml
触发条件: Push 到 main 分支（或手动触发）
步骤:
  1. Checkout        → 拉取代码
  2. Setup Pages     → 配置 GitHub Pages 环境
  3. Upload artifact → 上传网站文件
  4. Deploy to Pages → 部署到 GitHub Pages CDN
```

每次 `git push` 后，GitHub Actions 会自动执行这些步骤，无需任何 Token 或额外配置。

---

## 🎨 自定义指南

### 如何修改 Logo

替换 `assets/img/logo.svg` 文件。建议尺寸：**48×48** 或 **64×64** 的 SVG 文件。

```bash
# 将您的 Logo 复制到项目中
cp /path/to/your/logo.svg assets/img/logo.svg
git add assets/img/logo.svg
git commit -m "Update logo"
git push
```

### 如何更换主题颜色

编辑 `assets/css/main.css` 中的 CSS 变量：

```css
:root {
  --accent: #0071e3;        /* 主色调 */
  --accent-gradient: ...;    /* 渐变色 */
}

[data-theme="dark"] {
  --accent: #0a84ff;        /* 暗黑模式主色调 */
  --accent-gradient: ...;    /* 暗黑模式渐变色 */
}
```

### 如何修改图片

1. **首页展示图片**：替换 `assets/img/showcase/` 中的 SVG 文件
2. **特性图标**：替换 `assets/img/features/` 中的 SVG 文件
3. **硬件图片**：替换 `assets/img/hardware/` 中的 SVG 文件
4. **Hero 背景**：替换 `assets/img/hero-bg.svg`

> 所有图片建议使用 SVG 格式以保证清晰度和最小文件大小。如使用 WebP/PNG，同步更新 HTML 中的引用路径。

### 如何修改教程

教程内容存储在 `tutorials/data/` 目录下的 JSON 文件中。

```bash
# 1. 编辑教程数据
vim tutorials/data/getting-started.json

# 2. 提交更改
git add tutorials/data/
git commit -m "Update tutorial content"
git push
```

### 如何新增教程

1. 在 `tutorials/data/` 中创建新的 JSON 文件（例如 `new-tutorial.json`）
2. 在 `tutorials/data/index.json` 中添加对应的元数据条目
3. Push 到 GitHub

**教程 JSON 格式**：
```json
{
  "id": "new-tutorial",
  "title": "新教程标题",
  "description": "简短描述",
  "category": "入门",
  "tags": ["标签1", "标签2"],
  "date": "2026-06-22",
  "content": [
    {"type": "heading", "level": 2, "text": "章节标题"},
    {"type": "paragraph", "text": "段落内容，支持 **粗体** 和 *斜体*。"},
    {"type": "code", "language": "javascript", "code": "console.log('Hello');"},
    {"type": "list", "ordered": false, "items": ["项目一", "项目二"]},
    {"type": "image", "src": "../assets/img/example.svg", "alt": "描述", "caption": "图片说明"}
  ]
}
```

### 如何新增下载

编辑 `downloads/data/downloads.json`，添加新的下载条目：

```json
{
  "id": "new-download",
  "title": "新下载项目",
  "description": "项目描述",
  "category": "software",
  "version": "v1.0.0",
  "size": "10 MB",
  "date": "2026-06-22",
  "downloads": 0,
  "file": "#",
  "icon": "software"
}
```

### 如何修改视频

在教程内容中添加 `video` 类型的内容块：

```json
{"type": "video", "src": "../assets/video/demo.mp4", "poster": "../assets/img/poster.svg"}
```

支持 MP4 本地视频、YouTube 和 Bilibili 嵌入。

### 如何修改二维码

二维码使用 `assets/js/qrcode.js` 中的本地生成库，**自动读取 `window.location.href`** 生成当前页面地址。无需手动配置。

如需禁用二维码，在 `index.html` 中删除 `<canvas id="qrcode-canvas">` 元素即可。

### 如何升级版本

1. 更新 `CHANGELOG.md` 添加新版本条目
2. 修改 `sw.js` 中的 `CACHE_NAME` 版本号（强制刷新缓存）
3. 更新 `manifest.json` 中的 `version` 字段
4. 提交并 Push

```bash
git add .
git commit -m "Release v1.1.0"
git tag v1.1.0
git push origin main --tags
```

---

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| **结构** | HTML5 语义标签 |
| **样式** | CSS3 (Grid, Flexbox, Custom Properties, Animations) |
| **逻辑** | JavaScript ES6 (IIFE 模块模式) |
| **部署** | GitHub Pages + GitHub Actions |
| **离线** | Service Worker (PWA) |
| **字体** | Inter + JetBrains Mono (Google Fonts) |
| **图标** | 自定义 SVG |

---

## 🌍 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Edge | 90+ |
| Safari | 15+ |
| Firefox | 90+ |
| iOS Safari | 15+ |
| Android Chrome | 90+ |

---

## ❓ FAQ

### Q: 可以用于商业项目吗？
A: 可以。本项目采用 MIT 许可证，允许商业使用。请保留版权声明。

### Q: 需要服务器吗？
A: 不需要。纯静态网站，GitHub Pages 完全免费托管。

### Q: 如何添加后端功能？
A: 建议使用第三方 Serverless 服务（如 Formspree 用于表单提交）或 Headless CMS。

### Q: 教程内容在哪里？
A: 所有教程内容在 `tutorials/data/` 目录的 JSON 文件中，纯文本格式，易于编辑和版本控制。

### Q: 如何贡献？
A: Fork 项目 → 创建分支 → 修改 → Push → 创建 Pull Request。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

### Q: 为什么选择纯静态架构？
A: 零成本、零维护、无限扩展、极速加载、安全可靠。对于教程类内容网站，纯静态是最佳选择。

---

## 📄 License

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2026 TechTutorial Pro

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

---

<div align="center">

**Made with ❤️ by TechTutorial Team**

[⭐ Star this repo](https://github.com/YOUR_USERNAME/project) · [🐛 Report Bug](https://github.com/YOUR_USERNAME/project/issues) · [📖 Read Docs](tutorials/index.html)

</div>
