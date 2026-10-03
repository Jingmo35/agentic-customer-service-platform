# 身份、授权与执行边界

> 中文译文｜[英文原文](../security.md)｜基准提交：`d2523b0`。本文描述上游项目设计，不代表个人已完成的开发成果。

身份认证确定谁在调用平台，授权确定该身份可以访问哪些内容。这两步都不会授予 LLM 执行权限（execution authority）：决策编译器（Decision Compiler）、策略引擎、确认生命周期、工具校验和幂等运行时仍然是各自独立、确定性的边界。

## 生产环境 OIDC 边界

生产配置使用 `AUTH_MODE=oidc`。后端根据配置的发行方发现提供者的 JWKS URI，只接受配置的 RSA 签名算法；遇到未知或轮换后的密钥 ID 时刷新缓存密钥，并在构造应用 `Principal` 之前验证签名、发行方、受众、主体标识和过期时间。

部署必须配置：

```text
AUTH_MODE=oidc
OIDC_ISSUER=https://identity.example.com
OIDC_AUDIENCE=agent-control-plane
```

`OIDC_DISCOVERY_URL` 可以覆盖发行方的标准发现地址。声明字段名称、可识别角色、有界时钟偏差、HTTP 超时和 JWKS 缓存时长均可配置。生产环境的发行方和发现 URL 必须使用 HTTPS。

默认声明映射要求：

- `sub`：提供者的稳定主体标识；
- `email`：可选身份元数据，不进入检查点序列化或日志；
- `roles`：恰好一个可识别的参与者角色（`support_operator`、`customer` 或 `service`）；
- `groups`：不具有授权效力的组元数据；
- `tenant_id`：必需的租户范围元数据；
- `customer_ids`：客户和客服身份明确允许访问的正整数客户范围。

主体标识会转换为稳定、单向生成的参与者标识符，用于运行时关联。令牌、授权头、原始声明、主体标识和邮箱地址都不会成为指标属性或身份认证日志字段。

## 由服务端掌控的授权

通过验证的 JWT 声明先转换为受约束的 `Principal`，再转换为 `ExecutionContext`。现有 `resolve_customer_scope()` 函数仍是最终客户访问边界：

```text
Verified OIDC token
    -> Application Principal
    -> resolve_customer_scope()
    -> ExecutionContext
```

OIDC 客服操作员只能选择其已验证范围内的客户 ID。客户身份绑定且仅绑定一个客户 ID。跨范围请求以“未找到”方式失败。组名、邮箱、租户标签和模型输出本身都不能选择实际生效的客户。

## 开发与兼容模式

`local_demo` 仅允许用于开发、演示、测试和集成环境。它使用配置的不透明本地凭据，不是生产级身份与访问管理（IAM）。`static` 仍可作为明确的非生产兼容／测试适配器。生产配置拒绝这两种模式；未配置 OIDC 发行方和受众时，系统默认拒绝（fail-closed）。

浏览器中的操作员控制台在生产环境仍需要可信的外部会话适配器。OIDC 令牌获取、Authorization Code + PKCE、身份提供者的配置，以及退出登录／会话操作，都属于部署方负责的前端或 BFF 边界；本仓库验证的是提交给后端的访问令牌。

## 受约束的可观测性

`authentication_attempts_total` 仅记录：

- `auth_success`；
- 范围有限的 `auth_failure_reason` 分类；
- `principal_type`。

它从不记录 bearer 值、请求头、原始声明、邮箱、组、客户列表或提供者错误载荷。返回给调用方的身份认证错误不会泄露凭据。
