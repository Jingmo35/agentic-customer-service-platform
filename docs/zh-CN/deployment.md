# 生产容器要求

> 中文译文｜[英文原文](../deployment.md)｜基准提交：`d2523b0`。本文描述上游项目设计及操作方法，不代表个人已完成生产部署。

仓库提供经过安全加固的后端和前端镜像，以及面向生产的 Compose 覆盖配置（overlay）。它不负责创建基础设施、管理秘密、发布镜像或部署服务。

## 镜像

后端采用多阶段构建。uv 在构建阶段根据 `uv.lock` 解析生产环境，随后只把虚拟环境和运行所需迁移文件复制到运行镜像。运行环境不包含 uv 或前端／构建依赖，使用不可登录的 `app` 用户运行（UID/GID 10001）。

前端通过 `npm ci` 构建，复制到使用 8080 端口的非特权 nginx 运行环境。`/assets/` 下带哈希的资源按不可变资源缓存一年。HTML 使用缓存再次验证，API 响应不缓存；未知应用路径回退到 `index.html`，静态响应和代理响应都设置安全头。

后端配置在运行时提供。本地前端构建只接收公开、非秘密的演示令牌，供静态控制台访问需要认证的路由。集成环境使用明确仅供测试的凭据。生产覆盖配置以 `FRONTEND_AUTH_MODE=external_session` 构建，不提供凭据，因此其打包产物不含凭据。两个镜像都不会复制真实凭据或环境文件。

## 健康检查契约

| 端点 | 含义 | 依赖 | 响应体 |
| --- | --- | --- | --- |
| `GET /health` | 进程存活状态 | 无 | `{"status":"ok"}` |
| `GET /ready` | 接收流量的就绪状态 | PostgreSQL、检查点后端、配置的 RAG 后端 | `{"status":"ready"}` 或 `{"status":"not_ready"}` |
| `GET /ui/system-health` | 需认证的组件健康快照 | 与 `/ready` 相同的运行时检查，另加安全的配置状态 | `{"status":"ready|not_ready", "components":[...]}` |

就绪检查失败返回 HTTP 503，不指出哪个依赖失败。依赖故障期间，存活检查有意保持健康，避免编排系统重启本来健康的进程。后端镜像的 healthcheck 使用存活检查；Compose 使用就绪检查安排服务启动顺序。

`/ready` 和需认证的 `/ui/system-health` 共用一个请求范围内的运行时健康模型。健康视图将 PostgreSQL、检查点和检索检查报告为 `healthy`、`unavailable` 或 `incompatible`；未进行主动提供者探测时，也会将 LLM 配置报告为 `not_probed`。配置完成不等于可用，因此没有实际健康探测时，已配置的 LLM 绝不会显示为健康。`/health` 仍是轻量进程存活检查，不查询依赖。

对于 `RAG_BACKEND=qdrant`，只有配置的别名存在、其活动物理快照存在，且元数据与运行时契约相符时，`/ready` 才不再默认拒绝：需要一个未命名稠密向量、一个名为 `lexical` 的稀疏向量、`Distance.COSINE` 和 `EMBEDDING_DIMENSION`。集合还必须包含有效的确定性词法元数据，以及至少一个已索引知识点；这是普通演示和生产 RAG 路径采用的摄取完整性策略。

就绪检查只观察 Qdrant 元数据，绝不会创建、重建、upsert 或删除集合。它还检查持久化的嵌入提供者／模型身份，以及支持的快照、分块和词法索引版本。`RAG_BACKEND=local` 完全跳过 Qdrant 就绪检查。对于没有稳定模型身份的提供者，维度匹配只是结构检查，不能证明语义兼容性。生产 Qdrant 检索先通过倒数排名融合（reciprocal-rank fusion）融合稠密和词法分支，再执行可选的重排序。已有的纯稠密集合必须重新摄取到兼容的混合集合中；启动过程不会自动删除或升级它们。切换流量前，创建一个新集合（或在操作员控制的迁移中明确替换旧集合），设置 `QDRANT_COLLECTION`，并运行 `python -m scripts.rag_ingest`。

## 优雅关闭

后端直接接收 `SIGTERM`。Uvicorn 停止接受连接，并允许最多 30 秒完成活动请求。随后 FastAPI lifespan 将进程标记为未就绪，并关闭：

1. 智能体（Agent）运行时和受管理的 Qdrant 客户端；
2. LangGraph 检查点提供者及其连接池；
3. SQLAlchemy 引擎连接池；
4. 在有界 flush 后关闭应用管理的 OpenTelemetry tracer provider，再在独立的 flush／shutdown 尝试后关闭可选的应用管理的 meter provider。

锁定的 Uvicorn 版本可能在优雅关闭完成后重新抛出 SIGTERM，产生退出码 143。退出码本身不是数据送达证据：[运行时验收](../fastapi-native-otel-t5-runtime-release-evidence.md)还检查 lifespan 完成和最终数据送达。请求排空期和随后组件清理都会耗时；Compose 的 35 秒上限不是通用的 flush 保证。

Compose 允许后端在强制停止前使用 35 秒。生命周期日志只包含范围有限的组件名称和状态，不包含提示词、客户数据或凭据。

## 超时与重试协调

网络依赖使用原生、有界请求截止时间：兼容 OpenAI 的模型和嵌入客户端收到明确的连接／读取／写入／连接池超时，SDK 重试被禁用；Qdrant 每次请求接收实际生效的检索尝试超时。重试协调器为整个序列分配预算，并且只有在上一次原生调用返回后才安排下一次尝试；它不会在脱离请求的守护线程中运行同步 I/O。本地 CPU 重排序器不会被包在不可取消的墙钟计时线程中，因此重排序器失败或提供者原生超时会降级为原始融合排序。PostgreSQL 使用连接池获取、连接和语句超时，事务清理由已有会话边界处理。

写入超时保留未知结果安全模型。如果无法确认提交响应，操作会抛出 `UnknownWriteOutcomeError`，不会自动重放，只能使用同一个幂等键对账。这些截止时间限制的是依赖操作；它们不声称能取消没有原生取消机制的任意同步应用代码。

## 检查点反序列化边界

PostgreSQL 检查点数据对完整性敏感。应用为 LangGraph 的 msgpack 序列化器配置了一个较小的允许列表，其中只包含精确的 `(module_name, class_name)` 应用符号，且没有 pickle 回退。未知 Python 类型会导致检查点加载失败，不会被导入或重建。本地 Compose 默认设置 `LANGGRAPH_STRICT_MSGPACK=true`；集成和生产覆盖配置无条件设置它，使 LangGraph 在编译时也从图模式推导允许类型。

严格模式之前写入的检查点，只要包含相同的合法应用类型，仍然可读，因为严格模式改变的是重建授权，而非 msgpack 传输格式。系统有意不提供宽松重试或自动迁移回退。对历史状态做过独立修改的部署，应在发布前验证这些状态。该边界降低了被篡改检查点行的风险；若应用运行时或数据库凭据已完全失陷，它无法保护系统。

## 本地开发服务栈

基础文件保留了明确仅用于开发、需要认证的演示。它迁移数据库、重置并加载演示记录，将随仓库提供的知识摄取到 Qdrant，然后仅在设置成功后启动后端：

```bash
cp .env.example .env
docker compose up --build --detach
curl --fail http://127.0.0.1:8000/health
curl --fail http://127.0.0.1:8000/ready
test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8000/ui/system-health)" = 401
curl --fail -H 'Authorization: Bearer local-demo-support-token' http://127.0.0.1:8000/ui/system-health
curl --fail http://127.0.0.1:5173/
docker compose down
```

`AUTH_MODE=local_demo` 将配置的非秘密演示令牌映射为类型明确的客服操作员主体。它不会让受保护路由变成匿名访问。前端将该令牌保存在内存中，并通过 nginx 发送；nginx 明确保留 `/agent` 和 `/ui` 的 `Authorization`。

前端认证有三种部署模式：`local_demo`、`integration` 和 `external_session`。生产环境选择 `external_session`，不会默默使用演示或静态后端令牌。没有可信外部身份／会话层时，控制台显示“未配置生产环境身份认证”（原文界面文案为“Production authentication is not configured”），不调用受保护 API。可信的 OIDC 客户端、OAuth2 Authorization Code + PKCE 流程、BFF、认证网关或反向代理身份集成可以提供 `window.__OPERATOR_AUTH__` 适配器。适配器可以建立 HTTP-only cookie 会话，或提供从外部获取的访问凭据。后端验证 OIDC JWT；仓库不实现浏览器登录，也不持久化浏览器凭据。

要获得真实 `/agent/chat` 结果，还需要可访问的 OpenAI 兼容 LLM。Compose 默认使用 `http://host.docker.internal:11434/v1`；按需修改 `COMPOSE_LLM_BASE_URL`、`LLM_MODEL` 和 `LLM_API_KEY`。若该运行时不存在，不要报告智能体路径已通过验证。

如果要使用 Ollama 进行可选的本地提供者冒烟检查，安装开发基线 `qwen2.5:7b`，并为宿主进程配置 `LLM_PROVIDER=openai_compatible`、`LLM_BASE_URL=http://localhost:11434/v1`、`LLM_MODEL=qwen2.5:7b` 和 `LLM_API_KEY=ollama`。macOS 上的 Compose 通过 `COMPOSE_LLM_BASE_URL=http://host.docker.internal:11434/v1` 访问宿主。可选的 `LLM_REASONING_EFFORT` 设置接受 `none`、`low`、`medium` 或 `high`。不设置时，OpenAI 兼容提供者不发送推理覆盖参数，保留提供者默认值。这只是非确定性的开发检查；确定性集成模式仍是 CI 路径，Ollama 不是生产依赖。

如果需要隔离、可复现的集成证明，而非真实模型演示，运行 `python3 scripts/e2e_authenticated_smoke.py`。它使用独立 Compose 项目和全新卷，选择明确仅供集成测试的确定性决策提供者，之后拆除全部隔离资源。它验证需要认证的 Risk-2 建议、后端重启后的 PostgreSQL 支撑恢复、一次幂等业务修改、重放安全和安全的操作员投影。它不验证真实模型的语义质量。

## 面向生产的 Compose 覆盖配置

覆盖配置增加重启策略、只读应用文件系统、移除 Linux capabilities、`no-new-privileges`、临时可写文件系统和可配置资源限制。凭据从外部提供，不要放入已提交的 `.env` 文件。

```bash
export POSTGRES_PASSWORD='set-outside-source-control'
export DATABASE_URL='postgresql+psycopg://app:encoded-password@db:5432/customer_service'
export OIDC_ISSUER='https://identity.example.com'
export OIDC_AUDIENCE='agent-control-plane'
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build --detach
```

CPU 和内存默认值可通过以下变量覆盖：`BACKEND_CPU_LIMIT`、`BACKEND_MEMORY_LIMIT`、`FRONTEND_CPU_LIMIT`、`FRONTEND_MEMORY_LIMIT`、`POSTGRES_CPU_LIMIT`、`POSTGRES_MEMORY_LIMIT`、`QDRANT_CPU_LIMIT`、`QDRANT_MEMORY_LIMIT`、`JAEGER_CPU_LIMIT` 和 `JAEGER_MEMORY_LIMIT`。

生产覆盖配置设置 `APP_ENV=production`，强制使用 `AUTH_MODE=oidc`，要求 HTTPS 发行方和明确的受众，移除后端／初始化容器中的演示令牌，并以 `FRONTEND_AUTH_MODE=external_session` 构建前端，不捆绑浏览器凭据。后端从发行方发现 JWKS，并验证签名、密钥轮换、发行方、受众、主体标识和过期时间。覆盖配置还强制设置 `LANGGRAPH_STRICT_MSGPACK=true`。

生产操作员控制台服务默认存在，但有意默认拒绝，直到可信外部身份／会话层提供 `window.__OPERATOR_AUTH__` 适配器。没有该集成时，它显示“未配置生产环境身份认证”（原文界面文案为“Production authentication is not configured”），不调用受保护 API。静态 bearer 认证仍是非生产兼容／测试适配器。仓库实现后端 OIDC 令牌验证，但不实现 Authorization Code + PKCE、BFF、身份提供者配置或企业登录体验。

覆盖配置强制使用 `POLICY_AUDIT_BACKEND=postgres`；生产策略审计是持久、受约束的运行证据轨迹。审计行只包含结构化策略生命周期元数据，绝不作为授权或业务状态来源。数据库保留／清理需要由运维配置；应用不声称具有不可变合规账本保证。每次由智能体发起的业务写入都有策略和执行证据：Risk 1 记录允许及执行结果，Risk 2 记录确认／再次校验及执行结果，Risk 3 记录实际升级持久化的结果。执行结果区分成功、失败和未知。尝试受保护写入前，先写入审计；但审计持久化与业务修改不处于同一个原子分布式事务中。提交后对账仍以幂等回执和业务不变量为准。审计行排除原始提示词、工具载荷和业务自由文本。

运行时诊断使用安全的来源分类：`LLM_ERROR` 表示模型／提供者交互，`TOOL_ERROR` 表示受控业务工具失败，`DEPENDENCY_ERROR` 表示外部服务或基础设施失败，`INTERNAL_ERROR` 表示意外的平台／运行时失败。在适用时，超时、验证、策略、检索和未知写入语义保持区分。分类不意味着可重试；原生依赖重试规则、幂等和未知写入对账仍具有最终效力。原始异常文本不会作为操作员错误载荷返回，也不会持久化到运行投影／审计记录。

操作员控制台的智能体运行投影在集成和生产环境使用 PostgreSQL 的 `agent_run_projections` 表。这是用于检查的受约束、持久化读取模型：后端重启或第二个后端实例可以读取同一份安全投影。每个投影行对应一次图调用；待确认操作会获得新的运行／请求／追踪身份，同时保留相同的对话身份和不透明操作身份。投影数据绝不参与身份认证、授权、确认有效性、业务状态、检查点恢复或幂等判断。默认列表限制为 50，硬上限为 100。投影保留／清理由操作员或数据库管理；该表不是不可变审计账本。仅用于开发／测试的内存存储受到容量限制，且在集成和生产配置中被拒绝。

检查点的 `thread_id` 仍是按参与者／客户／对话范围划分的工作流键。它不会被重复用作 `run_id`：每个 HTTP 请求都会触发一次新的图运行。`action_id` 是待处理操作的稳定生命周期关联标识，因此确认或响应丢失后的重试可以关联到原始建议，而不修改历史调用投影。每个请求同样创建新的追踪；仓库通过安全的对话／操作属性关联相关追踪，不声称跨请求延续同一条追踪。

生产知识摄取是完整快照操作。`QDRANT_COLLECTION` 是稳定的逻辑别名；每次构建创建新的物理 `*_v_<snapshot-spec-hash-prefix>` 集合。`corpus_hash` 是规范化完整语料数据的 SHA-256。`snapshot_id`／`snapshot_spec_hash` 是该语料哈希，加上嵌入提供者／模型／维度，以及语义稠密／稀疏、知识模式、分块和词法索引版本共同计算的 SHA-256。这样，相同语料内容可在不同嵌入／索引规格下安全共存。完整规格哈希保存在来源信息中，物理名称只使用 16 字符前缀。每次构建根据完整语料计算词法词表／IDF，持久化嵌入与模式来源信息，验证知识点数量／模式／规格身份，并原子切换别名。活动快照绝不会在就绪检查／启动过程中被增量修改或删除。新快照激活后，已移除的源文档会消失。操作员可使用 `python -m scripts.rag_ingest list` 检查快照，并使用 `python -m scripts.rag_ingest rollback <physical-collection>` 回滚；旧集合一直保留到被明确退役。构建或别名操作失败时，之前的别名目标仍具有最终效力。缺少快照规格来源信息的旧版纯语料集合会被拒绝，而不会被默默重新解释。回滚会根据当前运行时嵌入提供者／模型和索引规格校验目标；因此，嵌入模型回滚需要协调运行时配置和别名变更。仓库提供工件验证及原子别名切换，不提供协调该发布过程的部署控制平面。

快照来源信息还记录 `build_state` 和 `expected_chunk_count`。新构建保持 `building`，直到完整稠密／稀疏集合、词法元数据、精确知识点数量、模式和快照来源信息都通过验证；之后才标记为 `complete`，并具备别名激活或回滚资格。构建失败后的正常重试会将那个精确的、未激活的受管理工件标记为失败，只删除该工件，然后从头重建完整语料。完整且兼容的工件会被复用，不再摄取。

活动快照不可变：无效或不完整的活动目标会导致就绪检查／激活失败，绝不会被自动删除或修复。来源信息缺失、属于外部，或完整哈希不匹配的集合属于冲突，绝不会自动删除。不支持多个独立构建器并发构建同一个确定性快照；发现 `building` 工件时会拒绝操作，防止竞争构建器破坏它。操作员或 CI 应串行构建快照；进程中断后，可能需要操作员确认该工件已不再构建，再明确清理或重试。

后端启动时会拒绝生产环境禁用认证或使用本地演示认证。静态不透明 bearer 只是仓库当前的集成适配器，不代表生产 IAM；部署方必须提供秘密轮换／存储，以及适用于自身环境的身份集成。

真实部署中，应按需将本地 PostgreSQL 和 Qdrant 服务替换为托管或独立运维的依赖，通过部署环境提供身份与可观测性配置，并在可信入口或负载均衡器处终止 TLS。

## 生产部署拓扑

Compose 覆盖配置是参考服务拓扑。在托管部署中，公共流量应在外部入口或负载均衡器终止，然后到达多个无状态 API 副本：

```text
Frontend / trusted operator session
              |
              v
Ingress / load balancer
              |
              v
      API replicas (stateless)
          |       |       \
          v       v        v
     PostgreSQL  Qdrant  Evidence store
          |
          v
   Checkpoints, audit, idempotency, projections

Supporting plane: metrics, logs, traces, secrets, backups
```

PostgreSQL 是业务状态、幂等回执、策略审计记录、检查点和持久化操作员投影的共享权威来源。Qdrant 是可替换的知识快照服务，不拥有执行权限。证据载荷应存放在不可变、受访问控制的对象存储中；清单与哈希仍可独立验证。入口、TLS 终止、身份／会话网关、秘密管理器、数据库和对象存储，有意不纳入本仓库的 Compose 服务栈。

API 进程按可水平复制方式设计，前提是全部副本使用相同的 PostgreSQL／检查点存储和具备租户感知的配置。本地内存中的检查点、审计、投影或限流模式属于开发／测试模式，不是多实例部署策略。应用不协调领导者选举、数据库故障转移、对象存储复制或入口切换。

## 生产加固检查

生产覆盖配置在支持的场合应用只读文件系统、临时可写路径、移除 capabilities、`no-new-privileges`、重启策略、资源限制、健康检查和优雅关闭窗口。应用镜像以非 root 用户运行。PostgreSQL 的厂商入口程序启动时具有初始化卷所需的权限，然后将服务端进程降权至数据库用户。锁定的上游 Qdrant 镜像目前声明使用 root 运行；在将整个拓扑视为完全加固之前，生产环境必须使用托管 Qdrant 服务，或经批准、以非 root UID 运行的加固衍生镜像。Compose 覆盖配置不会默默宣称该厂商镜像使用非 root 用户。

部署前运行静态拓扑策略检查：

```bash
make production-topology-validate
```

检查使用仅供验证的占位值渲染生产 Compose 模型，验证服务加固和资源策略，确认 OIDC／外部会话配置，并检查数据库、Qdrant 和 Jaeger 的 healthcheck 定义。已有运行环境时，添加 `--check-health` 可验证 `/health` 和 `/ready`，不打印依赖细节。对于开发文件系统证据适配器，添加 `--evidence-root artifacts/evidence-payloads`，检查配置根目录可读写。S3 兼容部署应改用提供者经过认证、不修改数据的 bucket／prefix 检查。

## 数据库、证据与秘密运维

在路由流量前，将数据库迁移作为发布步骤运行。使用连接池以及有界连接／语句超时；业务写入和幂等回执保持在原有事务边界内。PostgreSQL 备份、恢复验证、Qdrant 快照恢复和证据哈希验证见[灾难恢复](../disaster-recovery.md)。

生产秘密必须来自外部管理器，例如 AWS Secrets Manager、Vault，或投射到工作负载中的 Kubernetes Secret。不要将凭据烘焙进镜像、作为 Compose 明文常量提交，或持久化到日志。本仓库中，受约束的追踪通过 OTLP gRPC 直接发送至 Jaeger；按需开启的领域／原生指标经过仅处理指标的 Collector 发送至 Prometheus。这些服务不是业务状态存储。信号管理职责和作品集／部署边界见[可观测性架构](observability.md)。提示词、令牌、客户数据和原始提供者载荷始终不进入遥测与证据投影。

## 可选的真实模型行为评测

真实模型评测是明确的开发操作，不属于普通 CI。本地基线通过现有 OpenAI 兼容边界使用 Ollama：

```bash
ollama list
python -m evaluation.live --model qwen2.5:7b-instruct \
  --base-url http://localhost:11434/v1 --runs-per-case 3 --layer both
```

macOS 上的 Compose 后端访问 Ollama 时，使用 `http://host.docker.internal:11434/v1` 作为 base URL。用例集有版本（`live_eval_v1`），报告写入被 Git 忽略的 `artifacts/live-eval/` 目录。决策层只测量类型明确的模型建议；较小的控制平面层验证确定性策略、确认、幂等和修改安全。模型失败时，绝不会默默回退到确定性提供者。

运行器记录安全指标，默认不持久化 API 密钥、授权头、隐藏提示词或原始模型输出。`qwen2.5:7b-instruct` 是本地开发基线，不是生产推荐。真实模型结果具有非确定性，也不会将全局 LLM 健康状态改为 `healthy`；没有主动探测时，它仍是已配置／未探测状态。
