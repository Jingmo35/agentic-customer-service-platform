# 核心文档翻译分析

源文件：README.md、docs/architecture.md、docs/demo/walkthrough.md、docs/semantic-target-authority.md、frontend/README.md。基准提交：d2523b0。各文档均低于 4000 个英文单词，分别作为完整单元翻译，不需要分块。

领域：客服 Agent 的受控业务执行、检索、状态持久化、前端操作台与工程验证。读者是初次学习 Agent 应用开发的实习求职者。采用技术文档风格，保持原有结构、命令、参数、数字和限定条件。

术语：semantic proposal=语义建议；execution authority=执行权限；grounding=依据校验；checkpoint=检查点；idempotency=幂等；operator projection=操作员视图投影；revalidation=再次校验；tenant=租户；mutation=业务状态修改；provenance=来源；admissibility=可接受性。

注意：原文 README 的 latest_order 取消示例与 semantic-target-authority 中严格限制的说明存在表述差异，译文保留两者，不擅自修改上游含义。所有发布证据和截图均为上游结果，不能作为用户个人成果。前端示例输入保留英文原文并提供中文理解，避免暗示后端支持中文语义路由。图片仍含英文文字。链接按 docs/zh-CN 的新位置修正。
