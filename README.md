# Souvenir

一个基于 Next.js 16 的日历式回忆应用：通过共享密码进入，在日历上为每一天添加一张图片和可选备注。图片存储在 **Cloudflare R2**，元数据存储在 **Cloudflare KV**，整体运行在 **Cloudflare Workers** 上（通过 OpenNext 适配器）。

## 功能

- 🔐 共享密码访问，同一密码进入同一界面
- 📅 响应式日历视图，桌面与手机端自适应
- 🖼️ 浏览器通过预签名 URL 直传图片到 Cloudflare R2
- ✍️ 每天可填写可选备注
- 🔍 右侧详情图支持点击放大预览
- ☁️ 元数据存储在 Cloudflare KV

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript 5
- Tailwind CSS 4
- `jose`（JWT 会话）
- `aws4fetch`（在 Cloudflare Workers 上为 R2 生成 S3 兼容预签名 URL）
- Cloudflare R2（图片对象存储）
- Cloudflare KV（元数据存储，通过原生 binding 访问）
- `@opennextjs/cloudflare` + `wrangler`（构建并部署到 Cloudflare Workers）

## 架构示意

```
Browser ──(1) 登录 cookie ─────────▶ Next.js 路由（Worker 运行时）
        ──(2) 请求预签名 ───────────▶ /api/upload-url ──(S3 SDK)──▶ Cloudflare R2
        ──(3) PUT 图片直传 ─────────▶ Cloudflare R2
        ──(4) 保存元数据 ───────────▶ /api/memories ──(SOUVENIR_KV binding)──▶ Cloudflare KV
        ──(5) 读取图片 ─────────────▶ R2 公网域名（R2_PUBLIC_BASE_URL）
```

- **KV 读写**：首选 `SOUVENIR_KV` binding（生产）；若未检测到 binding（本地 `next dev`），回退到 Cloudflare REST API（需要 `CF_*` 环境变量）。
- **R2 预签名上传**：始终通过 S3 SDK（因为原生 `R2Bucket` binding 不支持生成预签名 URL），生产与本地都需要 `R2_*` 凭证。
- **R2 对象删除**：生产走 `SOUVENIR_R2` binding；本地走 S3 SDK。

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── login/route.ts
│   │   │   ├── upload-url/route.ts
│   │   │   └── memories/route.ts
│   │   ├── login/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── CalendarApp.tsx
│   │   └── DayDetail.tsx
│   ├── lib/
│   │   ├── auth.ts           # JWT 签发 / 校验
│   │   ├── cloudflare.ts     # 解析 Cloudflare Worker 运行时 env / bindings
│   │   ├── date.ts
│   │   ├── kv.ts             # KV binding 优先，REST fallback
│   │   ├── memories.ts       # 记忆数据模型与读写
│   │   └── r2.ts             # R2 预签名（S3 SDK）与对象删除（binding 优先）
│   └── middleware.ts         # 登录保护
├── next.config.ts
├── open-next.config.ts       # OpenNext 配置；未启用 Next.js 增量缓存
├── wrangler.jsonc            # Cloudflare Worker 配置（name / main / bindings）
├── eslint.config.mjs
├── tsconfig.json
└── package.json
```

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 http://localhost:3000，输入 `APP_PASSWORD` 登录。

本地开发时，代码直接通过 `process.env` 读取 `.env.local` 里的配置，KV 走 REST API，R2 走 S3 SDK。

## 环境变量

### 本地开发（`.env.local`）

| 名称 | 必需 | 说明 |
| --- | --- | --- |
| `APP_PASSWORD` | ✅ | 登录密码 |
| `SESSION_SECRET` | ✅ | 会话 JWT 签名密钥（建议 ≥ 32 字节随机字符串） |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare 账户 ID（用于 R2 S3 端点） |
| `R2_BUCKET` | ✅ | R2 bucket 名称（需与 `SOUVENIR_R2` binding 指向同一个 bucket） |
| `R2_ACCESS_KEY_ID` | ✅ | R2 S3 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 S3 API Secret Access Key |
| `R2_PUBLIC_BASE_URL` | ✅ | R2 公网访问地址（如 `https://pub-xxx.r2.dev` 或自定义域名） |
| `CF_ACCOUNT_ID` | ✅ | Cloudflare 账户 ID（用于 KV REST fallback） |
| `CF_KV_NAMESPACE_ID` | ✅ | KV namespace ID |
| `CF_API_TOKEN` | ✅ | Cloudflare API Token，需 `Workers KV Storage: Edit` 权限 |

### Cloudflare 生产（通过 Secrets / Vars / bindings 注入）

> Cloudflare Worker 的 `process.env` 来自 `wrangler.jsonc` 的 `vars` + Dashboard 设置的 Secrets + 自动注入的 bindings，**不会**读取 `.env.local`。

**Secrets（敏感，使用 Dashboard → Settings → Variables and Secrets 添加，或 `npx wrangler secret put`）：**

| 名称 | 说明 |
| --- | --- |
| `APP_PASSWORD` | 登录密码 |
| `SESSION_SECRET` | JWT 签名密钥 |
| `R2_ACCESS_KEY_ID` | R2 S3 Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 S3 Secret Key |

**Vars（非敏感，可写入 `wrangler.jsonc` 的 `vars` 字段或 Dashboard Plain-Text Variables）：**

| 名称 | 说明 |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_BUCKET` | R2 bucket 名称（应与 `SOUVENIR_R2` 指向的 bucket 一致） |
| `R2_PUBLIC_BASE_URL` | R2 公网访问地址 |

**Bindings（由 `wrangler.jsonc` 声明）：**

| Binding | 类型 | 说明 |
| --- | --- | --- |
| `SOUVENIR_KV` | KV Namespace | 元数据读写 |
| `SOUVENIR_R2` | R2 Bucket | 仅用于对象删除（预签名上传仍走 S3 SDK） |
| `ASSETS` | Static Assets | OpenNext 构建产物 `.open-next/assets` |

> `CF_ACCOUNT_ID` / `CF_KV_NAMESPACE_ID` / `CF_API_TOKEN` 在生产**无需设置**，因为 KV 走 binding 而不会触发 REST fallback。

## Cloudflare 准备

### 1. 创建 R2 Bucket

1. 登录 Cloudflare Dashboard → **R2 → Create bucket**。
2. 命名（例如 `memory`），记下 bucket 名。
3. 启用 **Public access** 或绑定自定义域名，得到 `R2_PUBLIC_BASE_URL`。
4. 在 **Manage R2 API Tokens** 里创建一组 Access Key，权限 **Object Read & Write**，得到 `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`。
5. 在 bucket 的 **CORS policy** 中允许本地与生产域名：

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. 创建 KV Namespace

1. **Workers & Pages → KV → Create a namespace**，命名（例如 `souvenir-data`）。
2. 记录 namespace ID（32 位十六进制）。
3. 把 ID 填入 [wrangler.jsonc](./wrangler.jsonc) 的 `kv_namespaces[0].id`。
4. 仅本地回退用途：创建一个 API Token，权限 `Account → Workers KV Storage → Edit`，填入 `.env.local` 的 `CF_API_TOKEN`。

## 部署到 Cloudflare（Dashboard 连 Git 自动部署）

本项目已经在仓库根目录提供 [wrangler.jsonc](./wrangler.jsonc) 与 [open-next.config.ts](./open-next.config.ts)，Cloudflare 会按这两个文件构建与绑定资源。

### 步骤

1. **提交代码到 GitHub / GitLab。**

2. **Dashboard 创建 Worker 并连接仓库：**
   - Workers & Pages → Create → Connect to Git → 选择本仓库。
   - 构建命令让 Cloudflare 的 Next.js 模板自动识别（基于 `@opennextjs/cloudflare`），或手动指定：
     ```
     Build command:       npx @opennextjs/cloudflare@latest build
     Deploy command:      npx wrangler deploy
     ```
   - 确认 Worker name 与 `wrangler.jsonc` 的 `name`（`souvenir`）一致。

3. **在 Dashboard 添加 Secrets：**
   Workers & Pages → `souvenir` → Settings → Variables and Secrets → Add Secret，依次添加：
   - `APP_PASSWORD`
   - `SESSION_SECRET`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

4. **在 Dashboard 添加 Vars（Plain Text）：** 同一页面 Add → Plain Text：
   - `R2_ACCOUNT_ID`
   - `R2_BUCKET`（= `memory`，与 `SOUVENIR_R2` binding 指向一致）
   - `R2_PUBLIC_BASE_URL`

5. **触发部署**：推送任意一次提交即可，Cloudflare 会自动 build & deploy。

### 关于增量缓存（R2）

本项目**未**启用 Next.js ISR / Data Cache / `unstable_cache`，因此 [open-next.config.ts](./open-next.config.ts) 里不配置 `incrementalCache`，Cloudflare 部署向导也不会再自动创建 `souvenir-opennext-cache` 或类似 `NEXT_INC_CACHE_R2_BUCKET` binding。如果将来要启用 ISR，参考 [OpenNext 文档](https://opennext.js.org/cloudflare/caching) 再补充配置。

### Git 配置与 Dashboard 设置的关系

- Cloudflare Worker Git 集成部署时，**`wrangler.jsonc` 是 binding 的唯一真理源**。Dashboard UI 上手动添加的 KV / R2 binding 会被仓库配置覆盖或忽略。
- Secrets 与 Vars 则由 Dashboard（或 `wrangler secret put`）管理，**不**出现在 `wrangler.jsonc` 中。

## 说明

- 所有 API 路由由 [src/middleware.ts](./src/middleware.ts) 保护。
- 会话使用 HttpOnly cookie + JWT，默认 30 天。
- 图片上传后在 R2 中按 `年份/月份/文件名` 存储。
- 元数据使用单一 key `memories:index` 保存在 Cloudflare KV 中。

## 脚本

```bash
npm run dev     # 本地开发（Node 运行时）
npm run build   # Next.js 构建
npm run start   # Node 运行时启动构建产物
npm run lint    # ESLint
```

> 如果后续希望在本地用 Workers 运行时预览，可以安装 `wrangler` 后运行 `npx @opennextjs/cloudflare@latest build && npx wrangler dev`。
