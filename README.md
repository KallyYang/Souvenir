# Souvenir

一个基于 Next.js 的日历式回忆应用：通过共享密码进入，在日历上为每一天添加一张图片和可选备注。图片存储在 **Cloudflare R2**，元数据存储在 **Cloudflare KV**，整体技术栈统一在 Cloudflare 生态内。

## 功能

- 🔐 共享密码访问，同一密码进入同一界面
- 📅 响应式日历视图，桌面与手机端自适应
- 🖼️ 浏览器通过预签名 URL 直传图片到 Cloudflare R2
- ✍️ 每天可填写可选备注
- 🔍 右侧详情图支持点击放大预览
- ☁️ 元数据存储在 Cloudflare KV

## 技术栈

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `jose`
- Cloudflare R2
- Cloudflare KV（优先使用原生 binding，非原生运行时回退 REST API）

## 架构示意

```
Browser ──(1) 登录 cookie──▶ Next.js API / Cloudflare Runtime
        ──(2) 请求预签名────▶ Next.js API ──▶ Cloudflare R2
        ──(3) PUT 图片直传─▶ Cloudflare R2
        ──(4) 保存元数据──▶ Next.js API ──▶ Cloudflare KV binding / REST API
```

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── login/route.ts
│   │   ├── upload-url/route.ts
│   │   └── memories/route.ts
│   ├── login/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── CalendarApp.tsx
│   └── DayDetail.tsx
├── lib/
│   ├── auth.ts
│   ├── date.ts
│   ├── kv.ts
│   ├── memories.ts
│   └── r2.ts
└── proxy.ts
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 名称 | 说明 |
| --- | --- |
| `APP_PASSWORD` | 登录密码 |
| `SESSION_SECRET` | 会话 JWT 签名密钥 |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_BUCKET` | R2 bucket 名称 |
| `R2_ACCESS_KEY_ID` | R2 S3 API 访问密钥 ID |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API 访问密钥 |
| `R2_PUBLIC_BASE_URL` | R2 公网访问地址 |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID |
| `CF_KV_NAMESPACE_ID` | Cloudflare KV namespace ID |
| `CF_API_TOKEN` | Cloudflare API Token，需有 KV 读写权限 |

> 如果部署到 Cloudflare 原生运行时，推荐直接使用 bindings：
> - `SOUVENIR_KV`
> - `SOUVENIR_R2`
>
> 当前代码会优先读取 bindings；只有在本地开发或非 Cloudflare 原生运行时下才回退到 `.env` 中的 REST/API 凭证。

## Cloudflare 准备

### 1. 创建 R2 Bucket

1. 登录 Cloudflare Dashboard，进入 **R2**。
2. 新建 bucket，例如 `souvenir-assets`。
3. 启用 **Public access** 或配置自定义域名。
4. 创建 **R2 API Token**，权限选择 **Object Read & Write**。
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

### 2. 创建 Cloudflare KV Namespace

1. 进入 **Workers & Pages → KV**。
2. 创建一个 namespace，例如 `souvenir-data`。
3. 记录 namespace ID。
4. 创建一个 API Token，权限至少包含：
   - `Account` → `Workers KV Storage` → `Edit`

### 3. 原生绑定名称

如果后续部署到 Cloudflare 原生运行时，请将绑定名称配置为：

- KV binding：`SOUVENIR_KV`
- R2 binding：`SOUVENIR_R2`

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 http://localhost:3000，输入 `APP_PASSWORD` 登录。

## 部署

当前版本已经具备 Cloudflare 原生绑定优先架构：

- Cloudflare 原生运行时：优先使用 `SOUVENIR_KV` / `SOUVENIR_R2` bindings
- 本地开发 / 非原生运行时：自动回退到 `.env` 中的 R2 / KV REST 凭证

## 说明

- 所有 API 路由由 `src/proxy.ts` 保护
- 会话是 HttpOnly cookie + JWT，默认 30 天
- 图片上传后在 R2 中按 `年份/月份/文件名` 存储
- 元数据使用单一 key `memories:index` 保存在 Cloudflare KV 中

## 脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
```
