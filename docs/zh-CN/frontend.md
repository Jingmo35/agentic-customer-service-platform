# 操作员控制台前端

> 原文：[frontend/README.md](../../frontend/README.md)。翻译基准：`d2523b0`。本文描述上游参考实现。

修改此前端之前，请阅读：

- [前端设计指南（英文）](../frontend-design-guidelines.md)，了解视觉与交互体系。
- [项目内的 UI/UX 技能](../../skills/ui-ux-pro-max/SKILL.md)，了解项目本地设计工作流。

控制台使用 React、TypeScript、Vite、Tailwind CSS 和 npm。前端改进应保持在此技术栈内，除非某个依赖确实必要且已得到明确批准。进行 UX 改进时不要修改后端契约。

使用 `npm ci` 可重复地安装依赖。提交变更前运行 `npm run typecheck`、`npm run lint`、`npm test` 和 `npm run build`。

生产 nginx 镜像以非特权用户运行在 8080 端口。它设置安全响应头；对带内容指纹的 `/assets/` 文件使用不可变缓存；使 HTML 和代理的 API 响应需要再次验证缓存有效性，或不允许缓存；未知客户端路径通过 SPA 入口处理。

## 本地带身份认证的开发

先创建仓库根目录环境文件，再启动后端与 Vite：

```bash
cp .env.example .env
uv sync --frozen
make migrate
make seed
make dev
```

```bash
cd frontend
npm ci
npm run dev
```

Vite 从根目录 `.env` 读取 `FRONTEND_AUTH_MODE`，并创建一个显式的内存认证提供者。在 `local_demo` 模式下，它读取有意设为非秘密的 `LOCAL_DEMO_AUTH_TOKEN`；在 `integration` 模式下，Compose 提供确定性的 CI 凭证。API 客户端统一附加 Bearer 请求头，不会将凭证写入 localStorage，也不会把凭证放入检查器视图投影。设置 `VITE_BACKEND_TARGET` 可覆盖默认代理目标 `http://localhost:8000`。代理覆盖 `/agent`、`/ui`、`/customers`、`/orders`、`/tickets`、`/memories`、`/escalations`、`/health` 和 `/ready`，无需修改前端 API 契约。

使用容器工作流时，在仓库根目录运行 `cp .env.example .env` 和 `docker compose up --build`，然后打开 <http://localhost:5173>。nginx 将相同的 API 路由代理到后端，并显式转发 `Authorization`，同时保留现有 CSP 和安全响应头。

操作员控制台的记忆面板只接收生命周期元数据。`/ui/memory` 客户端类型不包含已持久化的记忆正文；面板展示类型、规范化键、来源、状态、时间戳和过期时间。记忆内容仍可根据记忆策略供智能体运行时内部使用；控制台没有显示其正文的路径。

`local-demo-support-token` 是确定性的、公开的 localhost/演示配置，绝不能作为生产凭证使用。生产 Compose 叠加配置使用 `FRONTEND_AUTH_MODE=external_session` 构建，且不带演示令牌。因此，生产环境会保持认证失败时拒绝访问的状态，直到可信的外部会话/BFF 集成提供已文档化的 `window.__OPERATOR_AUTH__` 适配器。该适配器可以使用 HTTP-only 会话 Cookie 或外部获取的访问凭证；仓库没有提供企业登录流程。

前端认证提供者有四种状态：加载中（loading）、已认证（authenticated）、未认证（unauthenticated）和配置错误（misconfigured）。它控制受保护 API 调用，区分 401 与 403，在 401 后清空内存中的操作员数据，并且从不持久化凭证。外部适配器是未来 OIDC/OAuth2 PKCE 流程、BFF、认证网关或反向代理身份层的集成边界。

控制台将身份认证、API 可达性和后端运行时就绪状态分开。成功且已认证的 `/ui/system-health` 响应会显示为 `ready` 或 `not ready`，并带有 `healthy`、`unavailable`、`incompatible`、`configured`、`not_probed` 等组件状态。控制台不会显示固定的“API 已连接”声明；由于没有主动探测模型提供者，也不会把已配置的 LLM 标记为健康。
