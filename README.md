# 回忆日历 · Memory Calendar

一个部署在 Vercel 上的 Next.js 应用：通过共享密码进入，在日历上为每一天添加一张图片和备注。图片存储在 **Cloudflare R2**，元数据存在 **Vercel Marketplace 中的 Upstash Redis**。

## 功能

- 🔐 **密码访问**：统一的环境变量密码，进入同一界面
- 📅 **日历视图**：响应式月历，每一天以缩略图展示当日回忆
- 🖼️ **图片上传**：浏览器通过预签名 URL 直接上传到 Cloudflare R2（不经 Vercel 中转）
- ✍️ **备注编辑**：每天一段文字，随时更新
- 📱 **桌面与手机自适应**：Tailwind CSS 响应式布局
- ☁️ **Serverless**：Next.js App Router + Cloudflare R2 + Vercel Redis (Upstash)

## 技术栈

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- `aws4fetch`（零依赖 AWS Signature v4，用于生成 R2 预签名 URL）
- `jose`（签发 / 验证 JWT 会话 cookie）
- `@upstash/redis`（Vercel Marketplace 集成后自动注入的 HTTP Redis 客户端）
- Cloudflare R2（图片对象存储）

## 架构示意

```
Browser ──(1) 登录 cookie──▶ Next.js API (Vercel)
        ──(2) 请求预签名────▶ Next.js API ── aws4fetch ──▶ R2 Endpoint
        ──(3) PUT 图片直传─▶ Cloudflare R2
        ──(4) 保存元数据──▶ Next.js API ── HTTP ──▶ Upstash Redis (Vercel)
```

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── login/route.ts          # 登录 / 登出
│   │   ├── upload-url/route.ts     # 申请 R2 预签名 PUT URL
│   │   └── memories/route.ts       # GET/PUT/PATCH/DELETE 回忆数据
│   ├── login/                      # 登录页面
│   ├── layout.tsx
│   ├── page.tsx                    # 主页（日历）
│   └── globals.css
├── components/
│   ├── CalendarApp.tsx             # 日历主组件
│   └── DayDetail.tsx               # 右侧当天详情
├── lib/
│   ├── auth.ts                     # JWT 签发 / 校验
│   ├── date.ts                     # 日期工具
│   ├── kv.ts                       # Upstash Redis 封装
│   ├── memories.ts                 # 回忆数据读写
│   └── r2.ts                       # R2 (aws4fetch) 客户端
└── proxy.ts                        # Next.js 16 Proxy (旧称 middleware)
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 名称 | 说明 |
| --- | --- |
| `APP_PASSWORD` | 登录密码（所有用户共享） |
| `SESSION_SECRET` | 会话 JWT 签名密钥（建议随机长字符串） |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_BUCKET` | R2 bucket 名称 |
| `R2_ACCESS_KEY_ID` | R2 S3 API 访问密钥 ID |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API 访问密钥 |
| `R2_PUBLIC_BASE_URL` | R2 的公开访问地址（`pub-xxx.r2.dev` 或自定义域） |
| `KV_REST_API_URL` | Upstash Redis 的 REST API 基地址（Vercel 集成后自动注入） |
| `KV_REST_API_TOKEN` | Upstash Redis 的 REST API Token（同上） |

> 项目也兼容 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 两个官方变量名。

## Cloudflare 准备（仅 R2 图片存储）

### 1. 创建 R2 Bucket

1. 登录 Cloudflare Dashboard，进入 **R2**，新建一个 bucket（如 `memory-photos`）。
2. 打开 bucket 的 **Settings → Public access**，启用公开访问（或绑定自定义域名）。
3. 在 **R2 → Manage API Tokens** 创建 API Token，权限选择 **Object Read & Write**，范围选择对应的 bucket。保存生成的 **Access Key ID** 和 **Secret Access Key**。
4. 为保证浏览器可以直传，在 bucket 的 **CORS policy** 中允许 `PUT`：

   ```json
   [
     {
       "AllowedOrigins": ["https://your-app.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## Vercel 准备（元数据 Redis）

由于 **Vercel KV 已在 2024 年迁移到 Vercel Marketplace 的 Upstash Redis 集成**，做法如下：

1. 在 Vercel 项目主页点 **Storage → Create Database**。
2. 选择 **Upstash → Redis**（免费计划：10k 命令/天，足以支撑本应用）。
3. 创建成功后，Vercel 会自动将以下变量注入到你的项目 Environment 里：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - （以及 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 等别名）
4. 本地开发需要手动拉取：在项目根执行

   ```bash
   npx vercel link          # 一次性关联项目
   npx vercel env pull .env.local
   ```

   即可把所有环境变量同步到本地 `.env.local`。

## 本地开发

```bash
npm install
# 两种方式二选一：
# (a) 手动填写 .env.local
cp .env.example .env.local
# (b) 从已关联的 Vercel 项目拉取（推荐）
npx vercel env pull .env.local

npm run dev
```

访问 http://localhost:3000，跳转到 `/login` 输入 `APP_PASSWORD`。

## 部署到 Vercel

1. 将仓库推送到 GitHub / GitLab。
2. 在 Vercel 新建项目并关联仓库，框架会自动识别为 Next.js。
3. 按上面 **Vercel 准备** 完成 Upstash Redis 集成（Redis 相关环境变量会自动写入）。
4. 在 **Settings → Environment Variables** 手动补充 R2 相关变量：`APP_PASSWORD`、`SESSION_SECRET`、`R2_*`。
5. Deploy 后，记得把 Vercel 域名加入 R2 bucket 的 CORS `AllowedOrigins`。

## 说明

- 所有 API 路由由 `src/proxy.ts` 保护，未登录会被重定向到 `/login`，API 请求返回 `401`。
- 会话是 HttpOnly cookie + JWT，默认 30 天。
- 图片直传使用预签名 URL；替换 / 删除当天回忆时，旧图片会从 R2 中清理。
- Redis 中使用单一 key `memories:index` 存储所有回忆，JSON 结构 `{ "entries": { "YYYY-MM-DD": { ... } } }`。数据量小（每人每天一条）下一个 key 足够。

## 脚本

```bash
npm run dev     # 本地开发
npm run build   # 生产构建 (Turbopack)
npm run start   # 启动生产服务
npm run lint    # ESLint
```
