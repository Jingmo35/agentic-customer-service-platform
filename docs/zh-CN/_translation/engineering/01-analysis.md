# 工程文档翻译分析

来源：`docs/deployment.md`、`docs/security.md`、`docs/memory-privacy.md`、`docs/reliability.md`、`docs/observability.md`、`docs/evaluation-overview.md`。基准提交：`d2523b0`。

领域为容器部署、身份认证和授权、记忆隐私、分布式可靠性、OpenTelemetry 可观测性、评测及发布门禁。读者是初次学习 Agent 应用开发的实习求职者；采用简体中文技术文档风格，保持所有事实、限制、数字和原有层次。

核心区分：配置成功不代表依赖可用；健康检查不代表真实模型语义质量通过验证；可观测性和操作员投影不能授予执行权限；评测数字属于上游证据，不能归为用户个人成果。生产导向参考实现不等于已部署的生产系统。

术语：semantic proposal=语义建议；execution authority=执行权限；grounding=依据校验；checkpoint=检查点；idempotency=幂等；operator projection=操作员视图投影；revalidation=再次校验；principal=主体；fail-closed=默认拒绝；bulkhead=舱壁；circuit breaker=熔断器；readiness=就绪状态；liveness=存活状态。

所有命令、配置键、API、代码标识符和路径原样保留。Mermaid 仅翻译显示文本。链接移动后重新定位，无中文译文的链接指向上一级英文文档。按空白分词统计：部署 3,092 词，安全 427 词，记忆隐私 352 词，可靠性 487 词，可观测性 870 词，评测概览 272 词；每个独立文档均低于 4,000 词分块阈值，按独立单元保持各节顺序完整翻译。注意 `.env` 的配置不能替代实际 Compose 环境；本地 Compose 明确启用追踪，指标默认关闭。
