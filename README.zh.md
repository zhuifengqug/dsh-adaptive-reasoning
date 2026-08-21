# dsh-adaptive-reasoning

面向 DeepSeek Harness Web GUI 的、基于模型能力的推理档位滑块。

插件保留 DSH 官方的模型选择器与 `/model` 命令不动。点击选择器里的 **推理等级 / Reasoning effort** 行会弹出无障碍的滑块面板：面板读取当前模型在 Host 上的确切推理元数据，并通过常规的 `session.selectModel` RPC 把选择写回。

## 安装（两种方式）

从 npm 安装：

```sh
dsh plugin --profile web add dsh-adaptive-reasoning
```

从 GitHub 安装（可锁定到已发布 tag 以获得可复现性）：

```sh
dsh plugin --profile web add github:zhuifengqug/dsh-adaptive-reasoning#v0.2.0
```

安装完成后**重启 dsh web**。详细说明、卸载与可选的 models.dev 补全见下文。

## 功能

- 只使用当前模型公布的 `reasoning.efforts`，不会自造一套全局档位表。
- 支持稀疏、非连续、以及供应商自定义的档位（如 `off`/`high`/`max` 或适配器自定义标识）。
- 拖动实时预览，松开或键盘操作时提交；若 Host 拒绝改动，会回到上一次接受的档位。
- 火焰动画滑块：基于 Canvas 把档位强度可视化为从小火苗到烈焰的实时火焰效果；原生 range 控件隐藏但保留交互与无障碍。
- 使用 DSH 语义设计 token，并尊重 `prefers-reduced-motion`。
- 不改变官方模型选择、加载失败、无障碍行为与 `/model` 命令。

## 一键自动补全

当你在一个「未声明 `reasoningEfforts`」的模型上打开档位面板时，面板会显示提示和「自动补全」按钮。点击后请 Host 为该供应商所有「缺少档位」的模型填一份保守声明，然后重载面板，滑块随即出现。

来源优先级遵循**模式 C**：目录可达时，命中且唯一定位到 [models.dev](https://models.dev) 的记录优先；否则按家族启发式判断（`deepseek`/`qwen`/`glm`/`claude`/`grok` → `off`/`low`/`high`/`max`；`gpt`/`gemini`/`minimax`/`step`/`kimi`/`moonshot`/`mimo`/`mistral`/… → `off`/`low`/`medium`/`high`；图像模型跳过）。**已声明档位的模型绝不改动。**

按钮是一次显式的、逐次点击的用户操作，因此**不受任何配置开关控制**；它写入的就是你在 `llm-pi-ai` 设置里（持久化到 `settings.yaml`）会手写的那份 `reasoningEfforts` 字段。它通过宿主命令 `/adaptive-reasoning-declare <provider>` 派发——你也可以直接运行该命令，为整个供应商回填。

## 可选的 models.dev 启动补全

某些手填的 `llm-pi-ai` 模型没有声明 `reasoningEfforts`，因此 DSH 正确地不展示任何档位 UI。本插件可以在启动时可选地从 [models.dev](https://models.dev) 补全这些缺失的声明。

该行为默认关闭，因为目录记录并不能证明某个私有网关接受相同的推理协议。

启用时，Host 半区会：

- 抓取 `https://models.dev/api.json` 并缓存在系统临时目录；
- 只更新没有 `reasoningEfforts` 字段的模型；
- 只接受精确或唯一归一化的模型 id 匹配；
- 从不为未知或歧义模型提供家族启发式回退（那份回退只存在于上面显式的「自动补全」按钮之后）；
- 把推断出的条目写入 `llm-pi-ai` 设置段，DSH 在使用前会校验它们。

在 profile 的 `cordis.patch.yml` 里覆盖该条目以启用：

```yaml
- replace:
    - id: adaptive-reasoning
      name: dsh-adaptive-reasoning
      config:
        enrichFromModelsDev: true
        cacheHours: 24
```

`cacheHours` 必须是正数。目录不可用只会让本次运行的补全失效，不会阻止 DSH 启动。

## 安装

包是纯 JavaScript、没有 `prepare` 脚本，因此从 git 安装**无需任何 pnpm 构建授权**。直接从 GitHub 安装：

```sh
dsh plugin --profile web add github:zhuifengqug/dsh-adaptive-reasoning

# 锁定到已发布版本以获得可复现性（推荐）：
dsh plugin --profile web add github:zhuifengqug/dsh-adaptive-reasoning#v0.2.0

# 验证 bundle 补丁已参与 Web profile：
dsh --profile web --dump-config
```

你也可以改从本地 checkout 安装——在其所在目录执行 `dsh plugin --profile web add ./dsh-adaptive-reasoning`。

安装完成后**重启 dsh web**。客户端插件的热更新只在 DSH checkout 的 `pnpm run dev:web` 监听器已重建其 bundle 时生效；这个独立 bundle 否则只能在 Web 进程下次启动时加载。

卸载：

```sh
dsh plugin --profile web remove dsh-adaptive-reasoning
```

## 设计说明

Host 是权威。UI 不解释某个档位的协议拼写、不把 `off` 映射成别的值、也不静默裁剪不支持的选项。只展示 `session.models` 为确切路由公布的值，是否让提交值成为会话下一次请求配置，由 Host 决定。

浏览器集成刻意把官方选择器的档位行作为入口，而不是占用那个单实例的 `conversation.input.model` 席位。这样不会替换 DSH 官方选择器，并保留其模型目录、重试、本地化与错误界面。

## 故障排查

### 自定义中继拒绝带 `role: developer` 的请求

pi-ai 只要模型启用推理、且判定端点支持该角色，就会用 OpenAI 的 `developer` 角色发送系统提示。对未知/自定义中继 URL，该自动检测默认判定为「支持」，而很多 OpenAI 兼容中继只接受 `system`——于是请求报错，形如 `developer is not one of ['system', 'assistant', 'user', 'tool', 'function']`。

`llm-pi-ai` 的配置层（截至 `0.1.0-rc.7`）不暴露 pi-ai 的 `supportsDeveloperRole` 开关，因此必须把补丁打进已安装的 bundle。若你的部署碰到此问题，请对 `<dsh-install>/node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js` 做同样的手术式修补（先备份，任何 `dsh` 升级后再重打），然后按路由设置：

```yaml
compat:
  supportsDeveloperRole: false
```

确实接受 `developer` 角色的中继可保持默认，或设为 `true`。

## 文件

```text
dsh-adaptive-reasoning/
├── index.js            # Host 半区与可选的 models.dev 补全
├── lib/client.js       # 浏览器半区与滑块面板
├── cordis.patch.yml    # Web profile bundle 补丁
├── package.json
└── README.md
```

## 许可

MIT
