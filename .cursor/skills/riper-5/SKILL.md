---
name: riper-5-protocol
description: >-
  Applies the RIPER-5 phased agent workflow (Research, Innovate, Plan, Execute,
  Review) with strict mode declarations, Chinese prose, and English structured
  blocks. Use when the user says RIPER-5, ENTER [MODE] MODE, asks for phased
  planning without unauthorized edits, or wants task files and review gates
  before coding.
---

# RIPER-5 协议（技能摘要）

在适用本技能时，将本文件与 [reference.md](reference.md) 一并视为操作规范。项目内完整规则副本见 `.cursor/rules/my-custom-rule.mdc`；若与技能冲突，以用户当次指令为准。

## 每条回复开头（强制）

用方括号声明当前模式，无例外：

`[MODE: RESEARCH | INNOVATE | PLAN | EXECUTE | REVIEW]`

新对话默认：**RESEARCH**（除非用户另行指定）。

语言：常规说明用**中文**；模式标签、代码块标签、实施清单、模板占位符等结构化内容用**英文**以保持格式一致。

## 五模式速查

| 模式 | 目的 | 允许（摘要） | 禁止（摘要） |
|------|------|--------------|--------------|
| RESEARCH | 信息收集与理解 | 读文件、提问、映射架构与约束、可选建分支/任务文件 | 建议、规划、实施、任何“该怎么做”的暗示 |
| INNOVATE | 方案发散 | 多方案、利弊、架构替代、记入任务文件“提议的解决方案” | 具体规划、实现细节、写代码、承诺唯一方案 |
| PLAN | 可执行规格 | 精确路径/签名/数据结构/错误处理/依赖/测试；结尾必须编号**实施清单** | 任何实现或“示例代码” |
| EXECUTE | 按清单落地 | 只做已批准计划中的项；更新任务进度；完成后请求用户确认成败 | 偏离计划、计划外优化、跳过步骤 |
| REVIEW | 对照计划验收 | 逐条核对、标偏差、安全与可维护性、准备提交 | 擅自扩大范围 |

## 模式切换（仅当用户发出**确切**英文指令）

允许的信号（整句）：

- `ENTER RESEARCH MODE`
- `ENTER INNOVATE MODE`
- `ENTER PLAN MODE`
- `ENTER EXECUTE MODE`
- `ENTER REVIEW MODE`

未收到上述指令则**保持当前模式**。  
**EXECUTE** 仅在用户明确说 `ENTER EXECUTE MODE` 后进入。  
EXECUTE 中若必须偏离计划 → 回到 **PLAN**。  
用户确认执行成功后，可从 EXECUTE 进入 **REVIEW**。

## RESEARCH / INNOVATE 输出形态（提醒）

- RESEARCH：以 `[MODE: RESEARCH]` 起头，随后主要是**观察与问题**；除非用户明确要求，避免项目符号堆砌。
- INNOVATE：以 `[MODE: INNOVATE]` 起头，用连贯段落讨论可能性；仍不写实现细节。

## EXECUTE / REVIEW 要点

- EXECUTE：以 `[MODE: EXECUTE]` 起头；标明正在完成的清单序号；代码块使用 `language:file_path` 形式；展示必要上下文。
- REVIEW：以 `[MODE: REVIEW]` 起头；偏差格式 ``检测到偏差：...``；结论二选一：`实施与计划完全匹配` 或 `实施偏离计划`。成功时 staging/commit 步骤见 reference。

## 代码与编辑纪律（所有写代码阶段）

- 最小必要修改；不无关重构；不删无关注释。
- 禁止未验证依赖、占位符式“假代码”、未测试残留。
- 编辑片段用“现有代码 + 修改点”风格，见 reference 中的块模板。

## 任务文件与占位符

任务文件路径、分支命名、`Yolo模式`、进度块格式等**完整模板与占位符表**见 [reference.md](reference.md)。

## 跨平台

规则中的 shell 示例偏 Unix；在 Windows 上用 PowerShell/CMD 等价命令，先确认可行再执行。
