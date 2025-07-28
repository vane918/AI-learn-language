# LexiMemo AI Chrome Extension

一款基于 AI 和艾宾浩斯记忆曲线的智能语言学习 Chrome 插件。

## 🌟 功能特点

- **AI 驱动翻译**: 支持 OpenAI、DeepSeek、Google Gemini 多种 AI 模型
- **智能记忆系统**: 基于艾宾浩斯记忆曲线的 SM-2 算法
- **划词翻译**: 在任何网页上选择文本即可获得翻译
- **复习提醒**: 智能安排复习计划，提高记忆效果
- **数据同步**: 本地存储，未来支持 Firebase 云同步

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建插件

```bash
npm run build
```

### 加载到 Chrome

1. 运行 `npm run build` 构建插件
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录

## 📁 项目结构

```
src/
├── background/          # Service Worker
├── content/            # Content Script
├── popup/              # 插件主界面
│   ├── components/     # React 组件
│   ├── pages/         # 页面组件
│   └── stores/        # 状态管理
├── services/          # 核心服务
│   ├── aiService.ts   # AI 适配器
│   ├── storageService.ts  # 存储服务
│   └── reviewEngine.ts    # 复习引擎
└── types/             # TypeScript 类型定义
```

## 🔧 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI 库**: Material-UI (MUI)
- **状态管理**: Zustand + TanStack Query
- **AI 服务**: OpenAI / DeepSeek / Google Gemini
- **存储**: Chrome Storage API
- **构建工具**: Vite

## 📖 使用说明

### 1. 配置 AI 服务

1. 点击插件图标打开主界面
2. 进入"Settings"页面
3. 选择 AI 提供商并输入 API Key
4. 点击"Validate & Save"验证并保存

### 2. 开始学习

1. 在任何网页上选择要学习的文本
2. 在弹出的翻译卡片中点击"Save to Memory"
3. 返回插件主界面查看学习进度

### 3. 复习单词

1. 在主页查看待复习的单词数量
2. 点击"Start Review"开始复习
3. 根据记忆情况选择难度评级

## 🔑 API Key 获取

- **OpenAI**: https://platform.openai.com/api-keys
- **DeepSeek**: https://platform.deepseek.com/api-keys
- **Google Gemini**: https://makersuite.google.com/app/apikey

## 🛠️ 开发指南

### 添加新的 AI 提供商

1. 在 `src/services/aiService.ts` 中添加新的提供商配置
2. 实现 `requestFormatter` 和 `responseParser` 函数
3. 在设置页面添加新选项

### 自定义复习算法

修改 `src/services/reviewEngine.ts` 中的 `updateItemAfterReview` 函数来调整记忆算法参数。

## 📝 待办事项

- [ ] Firebase 用户认证和数据同步
- [ ] 更多 AI 提供商支持
- [ ] 导入/导出功能
- [ ] 学习统计图表
- [ ] 多语言界面支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License