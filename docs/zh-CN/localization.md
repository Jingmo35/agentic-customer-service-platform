# 中文化范围与验证记录

日期：2026-10-03。基准：上游 `d2523b0`。本次工作是开源复现项目的显示层中文化与学习资料整理。

## 修改范围

- 新增 11 篇完整 Markdown 中文译文，并保留英文原文、命令、配置键、原有数据与生产限制。
- 新增中文阅读入口、学习路线、简历贡献审计和面试问答。
- 前端采用集中词典和 `zh()` / `zhFragment()` 显示函数，将导航、标题、按钮、表单提示、无数据状态、安全说明、演示证据、枚举和动态模板翻译成中文。
- 页面语言设为 `zh-CN`，补充中文字体回退，保持原有页面布局与业务交互。
- 更新已有前端展示断言，并新增显示与数据边界测试。
- 补充 `node_modules/` 忽略规则，防止依赖目录进入 Git 备份。

## 为什么只在显示层翻译

中文词典作用于 JSX 显示值，API 字段、路由、工具标识、状态判断、表单原始值、后端模型提示和业务数据保持原样。源码仍可对照英文标识符搜索。

真实客户消息和 Agent 端点返回的正文原样显示，不在浏览器中冒充模型翻译。记录演示的固定对话可以使用明确的中文映射。示例输入保留上游英文请求，避免在没有中文模型与检索评测的情况下改变演示行为。

因此，**中文界面不等于已验证中文客服、中文知识库或真实模型的中文理解能力**。未知动态正文、技术 ID、路径、代码片段和 JSON 保留原文。

## 本次验证

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 前端 Vitest | 52 项通过，16 个文件 | 已有展示行为及新增本地化边界测试 |
| 前端 TypeScript | 通过 | 应用、配置和 E2E 源码类型检查 |
| 前端 ESLint | 通过 | 前端源码 |
| 前端生产构建 | 通过 | 本地构建与 Docker 前端镜像 |
| 后端核心 Pytest | 98 项通过 | `test_agent.py`、`test_rag.py`、`test_tools.py` |
| 中文文档结构 | 已核对 | 相对链接、代码围栏、命令和原文出处 |
| 浏览器检查 | 中文导航、总览、试验台、退款演示可正常显示 | 本地 `localhost:5173`，不是生产部署 |

后端核心测试有上游依赖的弃用提示，测试通过不等于消除这些提示。本次未运行全部后端测试、完整 Playwright 隔离业务旅程或真实模型/检索效果评测；不要在简历中写成全量验收。

构建输出有约 505 kB 主 JS 包的体积提示，词典使体积略增。本次 `npm ci` 报告依赖存在 5 项高严重级别问题，未修改锁文件或执行自动升级；这属于继承依赖的待处理事项，本次未做安全认证。

## 复现检查（PowerShell）

在项目根目录运行：

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m pytest tests/test_agent.py tests/test_rag.py tests/test_tools.py
docker compose up --build --detach --no-deps frontend
```

打开 <http://localhost:5173>。如浏览器仍显示旧资源，刷新页面；静态 HTML 与带哈希资源通过原有缓存规则加载。

## GitHub 备份

- [个人 Fork](https://github.com/Jingmo35/agentic-customer-service-platform) 保留上游来源与 MIT 许可证。
- [修改前备份分支](https://github.com/Jingmo35/agentic-customer-service-platform/tree/backup/pre-zh-cn-2026-10-03) 固定在 `d2523b027f8280319ba22ec2e0ae1e981c5f79a2`。
- [中文化分支](https://github.com/Jingmo35/agentic-customer-service-platform/tree/feat/zh-cn-learning) 为 `feat/zh-cn-learning`，已推送至个人 Fork；修改前备份分支不随中文化修改。

`.env`、虚拟环境、依赖目录和 Docker 数据卷没有进入源码备份。此备份是源码版本备份，不是数据库内容或本地密钥备份。
