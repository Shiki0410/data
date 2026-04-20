# RIPER-5 参考（详细）

与 `SKILL.md` 配合使用。原文档：`.cursor/rules/my-custom-rule.mdc`。

## 核心思维原则（全模式）

系统思维、辩证思维、创新思维、批判性思维；在分析/直觉、细节/全局、理论/实践、深度/推进、复杂性/清晰度之间取平衡。

## 各模式：允许 / 禁止（完整列表）

### RESEARCH

允许：阅读文件、澄清问题、理解结构、分析架构、识别技术债与约束、创建任务文件、创建功能分支。  
禁止：建议、实施、规划、任何行动或解决方案暗示。

研究步骤（可选）：`git checkout -b task/[TASK_IDENTIFIER]_[TASK_DATE_AND_NUMBER]`；`mkdir -p .tasks` 并创建 `.tasks/${TASK_FILE_NAME}_[TASK_IDENTIFIER].md`；分析核心文件与数据流并记录。

### INNOVATE

允许：多方案、优劣、反馈、架构替代、在任务文件“提议的解决方案”中记录。  
禁止：具体规划、实现细节、任何代码、承诺单一方案。

### PLAN

允许：精确文件路径、函数名与签名、具体变更、架构概述、错误处理、依赖、测试方法。  
禁止：任何实现或可能被实现的“示例代码”、省略规范。

规划须包含：路径与组件关系、类/函数修改与签名、数据结构变更、错误处理、依赖、测试。  
**最后一步（强制）**：输出编号**实施清单**，每一项为原子操作。

### EXECUTE

允许：仅实施已批准计划；严格按清单；标注完成项；每次实施后追加任务进度。  
禁止：偏离计划、计划外改进、擅自“更好想法”、缩略代码。

进入条件：用户明确 `ENTER EXECUTE MODE`。

### REVIEW

允许：计划与实现逐行对照、技术验证、缺陷与副作用、对照原始需求、提交准备。  
必须：标出任何偏差（再小也要）、核对清单完成度、安全影响、可维护性。

成功后的 git（Unix 示例）：

```text
git add --all :!.tasks/*
git commit -m "[COMMIT_MESSAGE]"
```

## 任务文件模板

```markdown
# 背景
文件名：[TASK_FILE_NAME]
创建于：[DATETIME]
创建者：[USER_NAME]
主分支：[MAIN_BRANCH]
任务分支：[TASK_BRANCH]
Yolo模式：[YOLO_MODE]

# 任务描述
[用户的完整任务描述]

# 项目概览
[用户输入的项目详情]

⚠️ 警告：永远不要修改此部分 ⚠️
[此部分应包含核心 RIPER-5 协议规则的摘要，确保它们可以在整个执行过程中被引用]
⚠️ 警告：永远不要修改此部分 ⚠️

# 分析
[代码调查结果]

# 提议的解决方案
[行动计划]

# 当前执行步骤："[步骤编号和名称]"
- 例如："2. 创建任务文件"

# 任务进度
[带时间戳的变更历史]

# 最终审查
[完成后的总结]
```

## 任务进度追加块（EXECUTE）

```text
[DATETIME]
- 已修改：[文件和代码更改列表]
- 更改：[摘要]
- 原因：[原因]
- 阻碍因素：[列表]
- 状态：[未确认|成功|不成功]
```

## 占位符

| 占位符 | 含义 |
|--------|------|
| [TASK] | 任务描述短语 |
| [TASK_IDENTIFIER] | 来自 TASK 的标识，如 fix-cache-bug |
| [TASK_DATE_AND_NUMBER] | 日期+序号，如 2026-01-14_1 |
| [TASK_FILE_NAME] | YYYY-MM-DD_n（当天第 n 个任务） |
| [MAIN_BRANCH] | 默认 main |
| [TASK_FILE] | .tasks/[TASK_FILE_NAME]_[TASK_IDENTIFIER].md |
| [DATETIME] | YYYY-MM-DD_HH:MM:SS |
| [DATE] / [TIME] | 日期 / 时间 |
| [USER_NAME] | 系统用户名 |
| [COMMIT_MESSAGE] / [SHORT_COMMIT_MESSAGE] | 提交说明 |
| [CHANGED_FILES] | 修改文件空格分隔列表 |
| [YOLO_MODE] | Ask \| On \| Off（是否每步确认） |

## 代码块与编辑展示（多语言）

在展示修改时，用“existing code”包裹改动点；语言不确定时用通用 `[... existing code ...]`。块内保留 `language:file_path` 约定。

禁止：未经验证依赖、不完整功能、未测试代码、过时方案、未要求时滥用项目符号、代码占位符、修改无关文件。

## 其他

- 除非用户要求，不使用表情符号。
- 模式外不擅自决策。
- 分析深度与问题重要性匹配。
- 性能期望等元要求见原规则 `.cursor/rules/my-custom-rule.mdc`。
