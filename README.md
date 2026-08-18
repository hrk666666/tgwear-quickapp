# TG Wear · 快应用端

[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](./LICENSE)
[![Platform: Vela](https://img.shields.io/badge/Platform-Xiaomi%20Vela-ff6900.svg)](https://dev.mi.com/)
[![Companion: Android](https://img.shields.io/badge/Companion-DrKLO%2FTelegram-3DDC84.svg)](https://github.com/hrk666666/tgwear-android-patch)

> 小米 Vela 穿戴设备上的 Telegram 客户端（快应用端）。
>
> 配套手机端：[hrk666666/tgwear-android-patch](https://github.com/hrk666666/tgwear-android-patch)（基于开源 [DrKLO/Telegram](https://github.com/DrKLO/Telegram) 改造的双端桥接）。

## 设计原则

1. **完全开源**：与手机端一同以 GPL v2 协议开源
2. **零原生依赖**：纯 JS 快应用，不依赖任何需要 NDK 的能力
3. **包名对齐**：`package: com.hrk.tgwear`，与手机端 Android App 完全一致
4. **签名对齐**：本仓库内置 `sign/` 目录的 pem 文件与手机端 jks 同源（保证 interconnect 通信）
5. **MVP 范围**：会话列表 + 单聊 + 设置（约 4 个页面 + 1 个 InputMethod 组件）

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│ Xiaomi Vela 穿戴设备（212dp 窄长屏 / 466dp 圆屏）              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ tgwear-quickapp（本仓库）                              │  │
│  │  - splash.ux     连接检查 + 登录状态                    │  │
│  │  - chats.ux      会话列表（虚拟滚动 list）              │  │
│  │  - chat.ux       单聊页 + InputMethod 输入法            │  │
│  │  - setting.ux    设置（字号/振动/屏幕常亮）             │  │
│  │  - api.js        JSON-RPC 客户端                       │  │
│  │  - interconn.js  @system.interconnect 封装            │  │
│  │  - store.js      globalThis 跨页状态                    │  │
│  │  - format.js      时间格式化/文本截断                    │  │
│  └─────────────┬──────────────────────────────────────────┘  │
│                │ @system.interconnect                          │
└────────────────┼─────────────────────────────────────────────┘
                 │ JSON-RPC over Bluetooth
┌────────────────┼─────────────────────────────────────────────┐
│ Android Phone  ▼                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ tgwear-android-patch（基于 DrKLO/Telegram）            │  │
│  │  - WearBridgeService  前台 Service                     │  │
│  │  - BridgeRouter       JSON-RPC 路由                    │  │
│  │  - AuthHandler        auth.*                           │  │
│  │  - DialogsHandler     dialogs.get                      │  │
│  │  - MessagesHandler    messages.getHistory / sendText   │  │
│  │  - NotificationCenterBridge 推送事件                  │  │
│  │  - MessagesController / SendMessagesHelper（原生）    │  │
│  └────────────────────────────────────────────────────────┘  │
│                 │                                              │
│                 ▼ MTProto over TCP                             │
│        ┌─────────────────────┐                                 │
│        │ Telegram Datacenter │                                 │
│        └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────────┘
```

## 目录结构

```
tgwear-quickapp/
├── README.md                  本文件
├── LICENSE                    GPL v2
├── .gitignore
├── manifest.json             快应用配置（权限/路由/minPlatformVersion: 1100）
├── app.ux                    应用入口
├── sign/                     统一签名（与手机端 jks 同源）
│   ├── debug/
│   │   ├── private.pem       私钥
│   │   └── certificate.pem  证书
│   └── release/
│       ├── private.pem
│       └── certificate.pem
└── src/
    ├── common/
    │   ├── images/           通用 PNG 图标（header/back/more/switch 等）
    │   └── styles/
    │       └── theme.css     设计令牌（配色/字号/间距）
    ├── components/
    │   └── InputMethod/      自定义键盘组件（来自 vela-watch-design 技能）
    │       ├── InputMethod.ux
    │       └── assets/       键盘按键图（full/t9/arc/horizontal 4 种布局）
    ├── pages/
    │   ├── splash/splash.ux  启动页：检查 interconnect 连接 + 登录状态
    │   ├── chats/chats.ux    会话列表：下拉刷新 + 分页加载 + 未读计数
    │   ├── chat/chat.ux      单聊：消息气泡 + InputMethod 输入 + 发送
    │   └── setting/setting.ux 设置：字号/振动/屏幕常亮
    └── utils/
        ├── api.js            JSON-RPC 客户端，封装所有 RPC 方法
        ├── interconn.js      @system.interconnect 封装，连接管理
        ├── store.js          globalThis 跨页状态，含 storage 持久化
        └── format.js         时间格式化/文本截断
```

## RPC 协议

与手机端 [tgwear-android-patch](https://github.com/hrk666666/tgwear-android-patch) 的 `WearConstants.java` 严格对齐：

| 方法 | 参数 | 返回 |
|---|---|---|
| `auth.getState` | 无 | `{authorized: bool, user?: {id, name, phone}}` |
| `auth.logout` | 无 | `{ok: true}` |
| `dialogs.get` | `{limit?, offset_id?}` | `{dialogs: [Dialog]}` |
| `messages.getHistory` | `{peer, limit?, offset_id?}` | `{messages: [Message]}` |
| `messages.sendText` | `{peer, text, reply_to?}` | `{message: Message}` |
| `messages.markRead` | `{peer, max_id}` | `{ok: true}` |

事件推送：
- `update.newMessage`：新消息到达，附带 `peer` / `message` / `dialog`
- `update.connectionState`：interconnect 连接状态变化

完整协议定义见 [plan-quickapp-tg.md 第四节](../.trae/documents/plan-quickapp-tg.md)。

## 多屏适配策略

| 设备类型 | screenShape | InputMethod screentype | 策略 |
|---|---|---|---|
| 212dp 手环（基准） | rect | rect | 全屏布局，212px 等比宽度 |
| 466dp 圆屏手表 | circle | circle | `@media (shape: circle)` 调整气泡 max-width |
| 胶囊屏 | pill-shaped | pill-shaped | `@media (shape: pill-shaped)` 调整布局 |

实现要点：
- 所有页面 `width: 212px`（相对 designWidth 等比，任意屏宽都=100%）
- chat.ux 通过 `@system.device.getInfo()` 检测 `screenShape`，动态切换 InputMethod 的 `screentype`
- `@media (shape: ...)` 媒体查询微调样式

## 设计规范

来自 `vela-watch-design` 技能：

- **配色**：黑底白字（`--bg-page: #000000` / `--text-primary: #ffffff`），强调色 `#2ea0ff`（蓝）
- **字号**：标题 26dp / 列表项 18dp / 正文 16dp / 辅助 14dp
- **间距**：8dp / 12dp / 16dp 三档
- **圆角**：卡片 14dp / 按钮 22dp
- **不使用 emoji**：所有图标用 PNG/SVG 替代
- **列表必须用 `<list>`**：虚拟滚动避免长列表卡顿

## 开发

### 前置条件

- [Vela IDE / Wearable Studio](https://dev.mi.com/)
- [Node.js](https://nodejs.org/) 18+
- 已配对的小米手环 / 手表（与手机蓝牙连接）

### 本地运行

```bash
# 1. clone
git clone https://github.com/hrk666666/tgwear-quickapp.git
cd tgwear-quickapp

# 2. 在 Vela IDE 中打开本目录

# 3. 选择目标设备（212dp 手环 或 466dp 圆屏手表）

# 4. 点击运行（IDE 自动通过 adb 安装到手表）
```

### 调试技巧

```bash
# 查看 logcat（过滤快应用日志）
adb logcat -s "js:V" "quickapp:V"

# 强制停止快应用
adb shell am force-stop com.hrk.tgwear

# 查看是否已安装
adb shell pm list packages | grep tgwear
```

## 签名

本仓库已内置签名（`sign/{debug,release}/{private,certificate}.pem`），与手机端 [tgwear-android-patch/signing/tgwear.jks](https://github.com/hrk666666/tgwear-android-patch/tree/main/signing) 同源。

- 两端签名一致是小米穿戴 interconnect 通信的前提（按包名+签名路由消息）
- 如需替换为你自己的签名，参考 [signing/README.md](https://github.com/hrk666666/tgwear-android-patch/blob/main/signing/README.md) 重新生成

## 协议同步

修改任何 RPC 方法名/参数/返回字段时，必须同步修改：

1. 本仓库 `src/utils/api.js`
2. 手机端 `src/org/telegram/tgwear/WearConstants.java`
3. 计划文档 `.trae/documents/plan-quickapp-tg.md` 第四节

## 已知限制

1. **不支持圆屏手表的 InputMethod 完美适配**：键盘内部用 480px 宽，假设 designWidth=466；本仓库 designWidth=212，圆屏上手感可能偏大
2. **不支持媒体消息**：图片/视频/语音暂不展示，仅文本和贴纸占位
3. **不支持群组管理**：仅展示会话和收发消息，不能创建/退出群组
4. **单帧大小限制**：interconnect 单帧约 64KB，超过会分片（未实现，限制单页消息 ≤30 条）

## License

[GPL v2](./LICENSE) © 2026 hrk666666

继承自 DrKLO/Telegram 的 GPL v2 协议，修改后的代码必须开源。

## 致谢

- [DrKLO/Telegram](https://github.com/DrKLO/Telegram)：Telegram for Android 开源实现
- [小米穿戴第三方 APP 能力开放接口文档 1.4](https://dev.mi.com/)：interconnect 通信能力
- [vela-watch-design](https://www.bandbbs.cn/resources/7086/)：设计规范与 InputMethod 输入法组件
- [vela-quickapp-dev](https://www.bandbbs.cn/resources/6173/)：快应用 API 文档与开发指南
