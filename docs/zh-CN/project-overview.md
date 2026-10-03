# Agentic Customer Service Platform（智能体客服平台）

> 原文：[README.md](../../README.md)。翻译基准：`d2523b0`。下文功能、发布证据和截图描述的是上游参考实现，不是学习者的个人成果。截图仍保留英文。

**面向生产工程的智能体 AI 控制平面，用于可靠的客服工作流。**

这个参考实现可以回答知识问题，并执行订单查询、退款、取消订单、创建工单和人工升级等受控动作。

与常见的工具调用聊天机器人不同，LLM 从不直接获得修改业务状态的权限。它只产生语义建议（semantic proposal）；身份认证、作用域、目标解析、策略、确认、再次校验（revalidation）、幂等（idempotency）和执行都由服务端掌握，通过确定性的逻辑处理。

> **LLM 提出建议。确定性软件决定哪些操作可以执行。**

![退款工作流停在确认边界（英文截图）](../demo/refund-happy-path.png)

## 平台能做什么

### 客服支持

- 查询订单和工单。
- 通过受控工作流申请退款、取消订单。
- 创建客服工单，并升级到人工专员处理。

### 知识

- 使用混合检索和经过依据校验的证据回答政策与 FAQ 问题。
- 验证摘录和引用，证据不足时放弃作答。
- 将检索到的知识与执行权限分离。

### 有状态工作流

- 将有实质影响的动作停在显式确认边界。
- 在浏览器或后端重启前后挂起、恢复、替换和恢复故障中的工作流。
- 执行前再次校验业务状态及精确的动作参数。
- 利用幂等和数据库约束，防止重复产生业务效果。

## 请求如何经过系统

假设客户说：

> “取消我的最新订单。”

```text
请求 → 身份认证/上下文 → LLM 建议
     → 目标解析 → 业务验证 → 策略
     → 确认（如果需要）→ 再次校验
     → 带类型约束的工具 → 幂等 + 数据库 → 操作员审计
```

建议中，`intent = cancel_order`，`target = latest_order`。模型不选择可信的订单 ID，也不执行取消。后端在经过认证的客户作用域内解析这一引用，然后在策略与确认之前检查归属和是否允许取消。

## 模型控制什么，服务端控制什么

| 模型 / 概率性组件 | 确定性逻辑 / 服务端掌握 |
| --- | --- |
| 理解自然语言请求 | 身份认证和请求上下文 |
| 提出语义意图 | 租户和客户作用域 |
| 理解有歧义的语言 | 业务目标解析 |
| 协助生成客户回答 | 带类型约束的工具参数 |
| 使用检索上下文回答 | 风险与策略决策 |
| 建议一个动作 | 确认状态 |
| | 确认后再次校验 |
| | 幂等与重放处理 |
| | 数据库归属/状态约束 |
| | 执行权限 |

模型是不可信的语义组件，不是授权或事务引擎。记忆丰富上下文，RAG 支撑回答；二者都不能授予权限。

## 为什么不让 LLM 直接调用工具

直接调用的设计如下：

```text
LLM → refund_order(order_id=123) → 执行
```

本平台保持清晰的权限边界：

```text
LLM → 语义建议
    → 目标解析 → 授权/验证
    → 策略 → 确认（如果需要）→ 再次校验
    → 带类型约束的工具 → 幂等 + 数据库
```

标识符或工具参数不会仅仅因为由模型生成，就被视为可信。

## 架构

~~~mermaid
flowchart TB
    AUTH[已认证请求] --> SECURITY[安全边界]
    SECURITY --> PROPOSAL[LLM 语义建议]
    PROPOSAL --> COMPILER[确定性编译器]
    COMPILER --> TARGET[业务目标解析]
    TARGET --> VALIDATE[类型 / 业务验证]
    VALIDATE --> POLICY[策略]
    POLICY --> DECISION{决策}
    DECISION -->|允许| TOOL[带类型约束的工具]
    DECISION -->|需要确认| CONFIRM[确认边界]
    DECISION -->|人工| HUMAN[人工升级]
    DECISION -->|拒绝| BLOCK[不执行]
    CONFIRM --> REVALIDATE[再次校验]
    REVALIDATE --> TOOL
    HUMAN --> IDEMPOTENCY[幂等 + 数据库]
    TOOL --> IDEMPOTENCY
    IDEMPOTENCY --> TRACE[操作员视图投影 / 审计]
    BLOCK --> TRACE
    QUESTION[知识问题] --> RETRIEVE[混合检索]
    RETRIEVE --> GROUND[依据校验]
    GROUND --> ANSWER[范围受限的回答]
    MEMORY[记忆 = 仅用于上下文] -.-> PROPOSAL
    MEMORY -.-> RETRIEVE
    GROUND -.->|不授予权限| TRACE
~~~

安全检查先于语义路由。编译器将建议与服务端掌握的身份、目标、业务、策略、确认、再次校验及幂等状态结合；只有带类型约束的工具才能提交业务效果。知识路径使用稠密向量/BM25 混合检索和依据校验，其证据绝不授权业务状态修改。

## 工程决策

| 决策 | 原因 |
| --- | --- |
| 使用语义建议，而非可信工具调用 | 模型输出不能变成执行权限。 |
| 服务端掌握目标解析 | 防止伪造标识符或访问其他客户的标识符。 |
| 有实质影响的动作绑定确认 | 客户受影响的业务效果仍由人控制。 |
| 执行前再次校验 | 防范过期状态，以及检查与使用之间的状态变化（TOCTOU）。 |
| 幂等写入 | 防止重复业务效果和重放引起的重复修改。 |
| 不盲目重试结果未知的写操作 | 避免网络故障导致结果不明确后再次修改。 |
| 记忆仅用于上下文 | 已存储文本不能创建权限。 |
| RAG 证据不能授予权限 | 知识与执行保持分离。 |
| 数据库约束维护关键不变量 | 应用层检查不是最后一道防线。 |

## 展示场景

这些是已有操作员控制台的确定性视图投影，不是真实生产遥测或认证。

### 受控业务状态修改：退款确认

退款建议在确认之前被阻止执行；带类型约束的工具运行前，会再次校验精确的待执行载荷。

### 安全边界：拒绝指令覆盖

指令覆盖尝试在成为已授权工作流之前被拒绝；视图投影分别展示拒绝、权限和执行状态。

![安全边界遏制指令覆盖（英文截图）](../demo/security-boundary.png)

### 有依据的智能：RAG 证据

政策回答与检索来源和依据校验状态一起展示。证据支撑回答生成，但不授予权限。

![RAG 有依据的回答与证据（英文截图）](../demo/rag-grounded-faq-conversation.png)

更多场景见[演示指南](demo-walkthrough.md)。

## 评测与发布证据

语义、运维、韧性和真实 LLM 证据分别统计；保留各自分母，不合并成一个人为综合分数。

| 证据分类 | 已记录结果 |
| --- | --- |
| D2c 语义/安全验证 | 540/540 次已测量尝试；0 个仍可执行的不安全建议；0 次不安全执行 |
| D2d 运维发布关卡 | 18/18 个运维场景；8/8 个必需阶段；6/6 类故障 |
| 确定性韧性快照 | 28 个场景，28 个通过；运行 `eval-9fc295817532` |
| 真实 LLM 对抗审计 | 100 个真实 LLM 样本：82 个通过全部已评测断言；18 个产生范围受限的语义/质量警告或部分结果。没有安全不变量失败；未授权修改、绕过确认、重复效果、赋予权限的记忆写入或客户数据泄露均为 0。 |
| 已记录发布 QA 快照 | 后端 844 项通过；前端 49 项通过；Playwright 6/6；带身份认证的冒烟检查通过 |

82/18 是质量结果分类，不是安全率。

当前发布证据为 **READY WITH WARNINGS（就绪但有警告）**：剩余警告涉及范围受限的可观测性或未经验证的覆盖范围，不是观察到的安全故障。这是参考部署的证据，不是无范围限制的生产认证。

参见[评测概览](../evaluation-overview.md)、[发布证据](../release-evidence.md)、[最终发布 QA 报告（英文）](../security/final-release-qa-report.md)及[真实 LLM QA 报告（英文）](../security/real-llm-production-qa-report.md)。

## 操作员可观测性

操作员控制台是只读调查界面，连接以下内容：

~~~text
请求 → 证据 → 建议 → 决策 → 权限 → 结果
~~~

操作员查看范围受限的请求/工作流状态、记忆/RAG 证据、建议、验证、策略、确认、权限、执行、生命周期及重放结果。以后端视图投影为准；控制台不包含思维链、原始提示词/回答、秘密或模型令牌流。

## 遥测与运行时验证

FastAPI 原生 OpenTelemetry 覆盖 HTTP 请求和框架操作；应用插桩覆盖智能体、策略、工具、RAG、记忆和韧性工作流。两者都使用应用自身掌握的提供者：链路直接发送到 Jaeger；可选启用的领域指标与原生 HTTP 指标共享同一条计量管线，经 Collector 发送到 Prometheus。隐私过滤器清理最终 OTLP 载荷，指标维度使用范围受限的目录和已注册路由模板。HTTP 访问日志不记录原始路径和查询字符串。

运行时验收覆盖真实 SIGTERM 关闭、在途请求处理完毕、遥测关闭、Jaeger 故障，以及两个遥测目标都不可用。真实本地 gRPC TLS/认证测试覆盖链路与指标传输。测量结果、复现命令和限制见[运行时与 TLS 证据（英文）](../fastapi-native-otel-t5-runtime-release-evidence.md)和[架构及回滚指南](../observability.md)。这些是仓库/作品集检查，未验证预发布或生产部署。

## 技术栈

| 领域 | 技术 |
| --- | --- |
| 智能体编排 | LangGraph + PostgreSQL 检查点 |
| API | FastAPI + Pydantic |
| 持久化 | PostgreSQL + SQLAlchemy + Alembic |
| 检索 | Qdrant + 稠密向量/BM25 混合检索 |
| 可观测性 | FastAPI 原生 OpenTelemetry + Jaeger；可选 Collector/Prometheus 指标 |
| 前端 | React + TypeScript + Vite + Tailwind |
| 验证 | Pytest + Ruff + Mypy + Vitest + Playwright |
| 运行环境 | Docker Compose |

## 本地运行

要求：Docker Compose、Python 3.12 与 [uv](https://docs.astral.sh/uv/)、Node.js 和 npm。

~~~bash
cp .env.example .env
docker compose up --build --detach
~~~

打开 <http://localhost:5173>。初始化过程执行迁移、插入种子记录并加载随附知识库；用 `docker compose down` 停止。可选的真实模型路径只使用 OpenAI 兼容提供者生成语义建议；依据校验、编译、策略、确认、幂等及执行权限仍由服务端掌握。

健康状态、就绪状态和拓扑详情见[部署文档](../deployment.md)。

启用可选的领域指标与原生 HTTP 指标：

~~~bash
OTEL_METRICS_ENABLED=true docker compose --profile metrics up --build --detach
~~~

Prometheus 位于 <http://localhost:9090>。指标默认关闭；仅启动该 profile 不会启用应用指标。链路保留现有 Jaeger 路径。参考指标配置支持一个后端进程；多 worker 与多副本聚合不在其验收范围内。

## 测试

~~~bash
make test && make lint && make typecheck
make frontend-test && make frontend-typecheck && make frontend-lint && make frontend-build
make eval && make eval-safety && make eval-resilience
~~~

隔离的浏览器场景流程：

~~~bash
npm --prefix frontend ci
npx --prefix frontend playwright install chromium
bash scripts/run_operator_e2e.sh
~~~

场景流程覆盖有依据的建议、提示注入遏制、重放、澄清、RAG 证据及运行调查。

## 项目结构

~~~text
app/                 FastAPI、LangGraph 图、策略、持久化、RAG、工具
frontend/            React/TypeScript/Vite/Tailwind 操作员控制台
tests/               后端单元测试与集成测试
evaluation/          确定性评测与发布关卡工具
docs/                架构、部署、评测、安全和演示
alembic/             数据库迁移
scripts/             种子数据、知识导入、验证与集成辅助脚本
docker-compose*.yml  本地、集成及生产 Compose 定义
Makefile             开发与验证命令
~~~

## 限制与范围

- 这是面向生产工程的参考实现，不是托管生产服务或合规认证，也不声称承载真实客服生产流量。
- 模型仍可能发生语义错误；确定性遏制不能证明未见过的故障绝不可能发生。
- 控制台展示范围受限的视图投影，省略原始提示词/回答、秘密、不受限制的记忆和隐藏推理。
- 证据覆盖参考部署，不认证公网 TLS、企业 IdP 配置、多区域运行、监管合规或无限容量。
- 真实模型提供者配置、浏览器登录、秘密管理及部署责任仍取决于具体环境。

## 深入文档

- [架构](architecture.md)
- [身份与安全边界](../security.md)
- [分布式可靠性边界](../reliability.md)
- [记忆隐私边界](../memory-privacy.md)
- [工程强化路线图（英文）](../engineering-hardening-roadmap.md)
- [评测概览](../evaluation-overview.md)
- [评测产物保留策略（英文）](../evaluation-artifact-policy.md)
- [发布证据](../release-evidence.md)
- [可观测性架构与回滚](../observability.md)
- [遥测运行时及 TLS 证据（英文）](../fastapi-native-otel-t5-runtime-release-evidence.md)
- [部署要求](../deployment.md)
- [面向生产工程的演示指南](demo-walkthrough.md)
- [前端设计指南（英文）](../frontend-design-guidelines.md)

## 许可证

MIT — 见 [LICENSE](../../LICENSE)。
