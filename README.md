# 位面 · 互动叙事游戏应用

> 本地优先 · API 驱动 · 蓝白简约 · 微信风格对话

一个用于**个人本地使用**的互动叙事 / 角色扮演游戏客户端。数据全部存于浏览器 `localStorage`，不上传任何服务器。接入大模型 API 后即可让「位面系统」自动驱动剧情。

---

## 📁 精简结构（4 个文件）

```
game-app/
├── index.html   # 入口（布局 + 弹窗）
├── styles.css   # 蓝白简约主题
├── data.js      # 数据层（localStorage 存储 + 默认示例数据）
├── app.js       # 主逻辑（路由 / 卡片 / 对话 / API 调用）
└── README.md
```

无构建步骤、无依赖、无框架 —— 直接用浏览器打开即可运行。

---

## 🎮 核心模块

| 模块 | 说明 | 定位 |
|------|------|------|
| 💬 **对话** | 微信风格聊天界面，Enter 发送 | 游玩主界面 |
| 🌌 **世界观** | 名称 / 核心设定 / 规则 / 背景 | 游玩背景根基 |
| 🎴 **位面系统** | 任务卡片（进行中/已完成/待触发） | 向宿主下发任务、传达信息 |
| 📖 **故事线** | 剧情节点卡片 | 事情发展的重要走向 |
| 🧑 **玩家(宿主)** | 单人卡片 | 操控核心角色 |
| ⭐ **目标对象** | 角色卡片 | 除宿主外**最重要**的角色 |
| 👥 **配角** | 角色卡片 | 推动剧情的次要角色 |
| 🤖 **NPC** | 角色卡片 | 场景普通存在（**最末**层级） |

> 每个模块都有**卡片**界面，点击卡片即可编辑。角色层级 **目标对象 > 配角 > NPC** 已体现在模块排序与默认数据中。

---

## 🔌 API 接入

1. 点击右上角 **⚙** 打开设置
2. 填入：
   - **API 地址**：如 `https://api.openai.com/v1/chat/completions`（兼容 OpenAI 格式即可，如 DeepSeek、通义、Moonshot 等）
   - **API Key**：你的密钥
   - **模型名称**：如 `gpt-4o` / `deepseek-chat` / `qwen-plus`
   - **Temperature**：0–2，默认 0.8
3. 点击「测试连接」验证，再「保存」

配置仅存于本地浏览器，**不上传任何服务器**。

### API 兼容说明
调用遵循 **OpenAI Chat Completions 格式**（`messages` 数组）。如果使用其他格式的服务，修改 `app.js` 中的 `callAI()` 即可。

### 智能指令系统
AI 回复中可含隐藏指令块（自动驱动游戏状态，用户不可见）：
```
[CMD]{"type":"set_relation","target":"林晚","value":"信任"}[/CMD]
[CMD]{"type":"add_story","title":"初遇","summary":"宿主在中央广场与林晚会面"}[/CMD]
[CMD]{"type":"finish_task","id":"初入镜界"}[/CMD]
```
让剧情推进**自动同步**到故事线、角色关系、任务状态。

---

## 🖥️ 电脑端打包为桌面 APP

### 方式一：Electron（推荐，跨平台）
```bash
# 1. 安装 Electron
npm install -g electron electron-builder

# 2. 在此目录创建 main.js
cat > main.js <<'EOF'
const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1100, height: 800, webPreferences: { nodeIntegration: false } });
  win.loadFile('index.html');
});
EOF

# 3. 直接运行预览
electron .

# 4. 打包（先 npm init -y，再安装 electron-builder）
npx electron-builder --win   # Windows
npx electron-builder --mac   # macOS
npx electron-builder --linux # Linux
```
> 打包产物在 `dist/` 目录。localStorage 数据会随应用持久保存。

### 方式二：直接双击使用
无需打包 —— 双击 `index.html` 即可用 Chrome / Edge 打开。

> ⚠️ **注意**：`file://` 协议下 `localStorage` 可用，但**跨域 API 请求可能被浏览器拦截**。建议：
> - 使用桌面端打包（Electron 无此限制），或
> - 用本地服务器打开：`python -gametest server.py` 见下，或
> - 选择**支持 CORS** 或提供浏览器可用端点的 API 服务。

### 本地服务器（开发调试）
```bash
# Python
python -m http.server 8080
# Node
npx serve .
```
然后访问 `http://localhost:8080`。

---

## 🚀 快速开始

1. 双击 `index.html` 打开
2. 右上角 ⚙ 填入 API（**不填也能玩离线演示模式**）
3. 先在左侧维护「世界观 / 玩家 / 目标对象」等卡片
4. 进入「对话」界面，输入行动，AI 将作为位面系统驱动剧情
5. 剧情中 AI 会通过指令自动：新增故事线节点、更新角色关系、完成任务

---

## 🎨 主题
- **主色**：蓝 `#2b6cff` + 白
- **风格**：简约扁平、卡片化、圆角、轻阴影
- 如需换肤，修改 `styles.css` 顶部的 CSS 变量（`--blue` 等）

---
祝游玩愉快 🎴 —— 让位面为你展开故事。
