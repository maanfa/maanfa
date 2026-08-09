# AGENTS.md

仓库级协作规范，AI 协作代理与开发者共同遵守。

## 1. 仓库概览

- pnpm monorepo：`packages/*` 为库包，`apps/*` 为演示应用，`scripts/*` 为构建脚本，`docs/*` 为设计文档。
- 默认分支 `main`；功能开发在独立分支进行，完成后合并回 `main`。
- 库包职责边界：`ElementStore` 持有真值、渲染器只消费 Element、反馈样式由外观层合成（详见 `docs/sketcher/`）。

## 2. 提交规范

- 提交信息格式：`type: 中文描述`，例如 `feat: 新增多边形绘制`、`fix: 修复闭合边标签缺失`。
- 常用 type（社区惯例）：

  | type | 用途 |
  |---|---|
  | `feat` | 新功能 |
  | `fix` | 缺陷修复 |
  | `docs` | 文档 |
  | `refactor` | 重构 |
  | `test` | 测试 |
  | `style` | 格式 / 样式调整 |
  | `perf` | 性能优化 |
  | `build` | 构建 / 依赖 |
  | `ci` | 持续集成 |
  | `chore` | 杂项（配置、工具链） |
  | `revert` | 回滚 |

- 单行描述不够时，空一行追加多行正文说明背景与影响。
- 改动较多时：按功能拆分、顺次提交，保持每个提交主题单一；无法清晰拆分时，先与用户确认是一次提交还是分批提交。
- `docs/` 下的讨论性设计文档按需提交，默认放在提交序列末尾。

## 3. 提交前检查

- `pnpm typecheck`：TypeScript 类型检查通过。
- `pnpm vitest run`：全部单元测试通过。
- `pnpm lint`：oxlint 无错误。
- 依赖变更需同步更新 `pnpm-lock.yaml`。

## 4. 工程约定

- TypeScript 使用 strict 模式；核心纯逻辑（坐标换算、状态流转、策略）须有单元测试。
- 依赖统一由 pnpm 管理，新增依赖在对应包的 `package.json` 中声明。
- 内置实现不带 `Default` 前缀（直接以角色命名）；仅当外部需要扩充时才新增实现类。
