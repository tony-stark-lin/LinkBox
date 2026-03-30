# LinkBox

一个为个人知识管理设计的全栈收藏夹应用，支持链接、文本、图片、音频、文件的统一收集与管理，内置 AI 内容理解能力。

---

## 功能概览

### 内容收集

| 类型 | 说明 |
|------|------|
| 链接 | 保存网页链接，自动抓取标题、描述、封面图 |
| 文本 | 快速记录文字笔记 |
| 图片 | 上传本地图片，支持实时进度显示 |
| 音频 | 网页端录音（HTTPS 环境）或 iOS/Android 原生录音（HTTP 环境自动降级） |
| 文件 | 上传任意文件（PDF、视频、压缩包等） |

### 智能内容处理（AI 自动流水线）

保存链接后，后台自动依次执行三个步骤：

```
保存 → ① 抓取页面元数据（标题/描述/封面图）
      → ② 提取正文并转为 Markdown
      → ③ 本地 AI 生成中文摘要（Qwen2.5-VL-3B）
```

无需手动触发，打开卡片即可看到已生成的摘要和正文。

### Markdown 正文阅读

- 点击「正文」按钮弹出阅读模态框，完整渲染 Markdown（标题、粗体、列表、代码块、表格）
- 正文内图片通过服务端代理加载，绕过微信公众号等防盗链限制
- 支持「复制 Markdown 原文」一键导出

### AI 摘要 / 手动触发

- 每张卡片右上角 ✦ 图标可手动重新生成摘要
- 摘要以紫色卡片样式展示在正文预览下方

### AI 学习笔记

- 对已提取正文的链接，可生成结构化学习笔记
- 包含：核心结论 → 关键要点 → 概念解释 → 交互式 SVG 知识导图
- 笔记以 HTML 渲染，可在浏览器中直接阅读

### 标签管理

- 自定义彩色标签，支持多标签批量打标
- 按标签过滤卡片，标签统计页可查看每个标签下的收藏数量

### 搜索与过滤

- 全文搜索：标题、URL、备注、正文内容四字段联合搜索
- 按类型（链接/文本/图片/音频/文件）过滤
- 按日期范围过滤
- 所有过滤条件可组合使用

### 批量导入

- 粘贴多行 URL，批量导入链接
- 每条链接独立在后台异步处理元数据，不阻塞 UI

### 多用户

- JWT 鉴权，各用户数据完全隔离
- 支持注册 / 登录

---

## 技术架构

```
client/          React 18 + TypeScript + Vite + Tailwind CSS
server/          Express + better-sqlite3（单文件 SQLite）
server/utils/
  ├─ fetchMeta.js           网页元数据抓取（title/description/og:image）
  ├─ aiSummarize.js         AI 摘要（本地 Qwen2.5-VL-3B）
  └─ generateLearningNote.js  AI 学习笔记 + SVG 知识导图生成
server/routes/
  ├─ auth.js                登录 / 注册
  ├─ links.js               CRUD + 图片代理 + AI 接口
  └─ tags.js                标签管理
```

**AI 模型**：llama.cpp 本地部署的 `Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf`，通过 OpenAI 兼容 API（`/v1/chat/completions`）调用，默认地址 `http://localhost:8081/v1`。

**数据库**：SQLite 单文件，路径 `server/linkbox.db`，服务启动时自动初始化表结构和迁移。

**HTTPS**：检测到 `server/certs/cert.pem` + `key.pem` 时自动以 HTTPS 模式启动，否则 HTTP 模式，无需修改代码。

---

## 快速开始

### 环境要求

- Node.js 18+
- （可选）llama.cpp server，加载 Qwen2.5-VL-3B 模型，监听 8081 端口

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/wangqioo/LinkBox.git
cd LinkBox

# 安装服务端依赖
cd server && npm install

# 安装客户端依赖并构建
cd ../client && npm install && npm run build

# 启动服务（构建产物由 Express 静态托管）
cd ../server && node index.js
```

访问 `http://localhost:3000`（默认端口，可通过 `PORT` 环境变量修改）。

### 开发模式

```bash
# 终端 1：启动后端
cd server && node --watch index.js

# 终端 2：启动前端开发服务器
cd client && npm run dev
```

前端默认 `http://localhost:5173`，已配置 Vite 代理将 `/api` 转发到后端。

### 启用 HTTPS

```bash
# 在 server/certs/ 目录生成自签名证书（含 IP SAN）
mkdir -p server/certs
openssl req -x509 -newkey rsa:2048 -days 3650 -nodes \
  -keyout server/certs/key.pem \
  -out server/certs/cert.pem \
  -subj "/CN=LinkBox" \
  -addext "subjectAltName=IP:127.0.0.1,IP:<your-ip>"
```

服务启动时自动检测 `certs/` 目录并切换到 HTTPS 模式。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务监听端口 |
| `JWT_SECRET` | `linkbox-secret` | JWT 签名密钥，生产环境请修改 |
| `LOCAL_LLM_URL` | `http://localhost:8081/v1` | llama.cpp server 地址 |

---

## systemd 服务（Linux 部署参考）

```ini
# /etc/systemd/system/linkbox.service
[Unit]
Description=LinkBox Server
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/path/to/LinkBox
Environment=PORT=8443
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now linkbox
sudo systemctl restart linkbox
journalctl -u linkbox -f   # 查看日志
```

---

## API 接口

所有接口需要在请求头中携带 JWT：`Authorization: Bearer <token>`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 token |
| POST | `/api/auth/register` | 注册 |
| GET | `/api/links` | 获取收藏列表（支持分页、搜索、过滤） |
| POST | `/api/links` | 新增链接（自动触发后台 AI 流水线） |
| POST | `/api/links/text` | 新增文本 |
| POST | `/api/links/image` | 上传图片 |
| POST | `/api/links/audio` | 上传音频 |
| POST | `/api/links/file` | 上传文件 |
| PUT | `/api/links/:id` | 编辑 |
| DELETE | `/api/links/:id` | 删除 |
| POST | `/api/links/:id/summarize` | 手动重新生成摘要 |
| POST | `/api/links/:id/extract` | 手动重新提取正文 |
| POST | `/api/links/:id/learning-note` | 生成 AI 学习笔记 |
| GET | `/api/links/image-proxy` | 图片代理（无需认证） |
| GET | `/api/tags` | 标签列表 |
| POST | `/api/tags` | 新建标签 |
| DELETE | `/api/tags/:id` | 删除标签 |

---

## 数据库结构

```sql
links (
  id, user_id, type,         -- 基础信息
  url, title, description,   -- 链接元数据
  thumbnail,                 -- 封面图 URL
  content, content_md,       -- 正文（原始/Markdown）
  summary,                   -- AI 生成摘要
  comment,                   -- 用户备注
  file_path, file_name,      -- 上传文件路径
  imported_at                -- 保存时间
)

tags (id, user_id, name, color)

link_tags (link_id, tag_id)

users (id, username, password_hash, created_at)
```

---

## 许可证

MIT
