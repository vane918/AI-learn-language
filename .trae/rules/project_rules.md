# Project Rules: LexiMemo AI Chrome Extension

## 1. 项目总览 (Project Overview)

*   **项目名称 (Project Name):** LexiMemo AI
*   **核心理念 (Core Idea):** 开发一款 Chrome 插件，它不仅仅是一个翻译工具，更是一个基于艾宾浩斯记忆曲线的智能词汇和句子记忆系统。插件支持多种主流 AI 模型，并能通过 Firebase 实现数据云端同步。
*   **目标用户 (Target User):** 希望系统性地、高效地记忆和掌握英语单词和句子的学习者。他们重视数据同步和个性化学习体验。
*   **核心价值 (Value Proposition):**
    1.  **AI 驱动的上下文理解:** 在任何网页上即时获取单词和句子的精准解释。
    2.  **科学记忆:** 利用艾宾浩斯记忆曲线算法，智能安排复习计划，将临时记忆转化为长期记忆。
    3.  **开放与灵活:** 用户可以自由选择并使用自己的 AI 模型 API Key。
    4.  **数据永不丢失:** 通过 Firebase 云同步，在不同设备间无缝访问自己的学习库。

---

## 2. 技术栈 (Technical Stack)

在提供代码或建议时，请严格遵守以下技术栈：

### 2.1 核心技术栈
*   **前端框架 (Frontend Framework):** **React 18+** (使用 Hooks)
*   **编程语言 (Language):** **TypeScript 5.2+**
*   **构建工具 (Build Tool):** **Vite 5.0+** 
    *   配置为 ES 模块格式 (`"type": "module"`)
    *   目标环境：`ES2020`
    *   禁用代码压缩以避免 Service Worker 兼容性问题
*   **UI 库 (UI Library):** **MUI (Material-UI) 5.14+**
    *   使用 Emotion 作为样式引擎
    *   支持主题定制和响应式设计

### 2.2 状态管理
*   **Zustand 4.4+:** 用于管理全局 UI 状态 (如 `isLoading`, `settings`, `currentUser`)
*   **TanStack Query (React Query) 5.8+:** 用于管理和缓存来自 Firebase 的异步数据，处理服务器状态
*   **Chrome Storage API:** 用于本地数据持久化和跨组件状态同步

### 2.3 AI 服务集成
*   **支持的 AI 模型:**
    *   **OpenAI API (GPT-3.5/GPT-4 系列)**
    *   **DeepSeek API**
    *   **Google Gemini API**
*   **架构要求:** AI 请求必须通过 background 脚本中的**适配器模式 (Adapter Pattern)** 来处理，以统一调用不同模型的接口
*   **安全性:** API Keys 仅存储在 `chrome.storage.local` 中，仅供 Service Worker 访问

### 2.4 后端与数据库
*   **Firebase 10.7+:**
    *   **Firebase Authentication:** 用户注册和登录 (支持 Google/Email 方式)
    *   **Cloud Firestore:** 主数据库，存储用户的单词/句子库、复习进度和设置
    *   **Firebase SDK:** 仅在 background 脚本中初始化，避免在 content script 中使用
*   **本地存储策略:**
    *   **`chrome.storage.local`:** 缓存 Firestore 数据，实现快速 UI 响应和离线支持
    *   **`chrome.storage.sync`:** 存储用户偏好设置（如主题、语言等）

### 2.5 Chrome 扩展 APIs
*   **核心 APIs:** `chrome.storage`, `chrome.runtime`, `chrome.scripting`, `chrome.alarms`
*   **权限配置:** `storage`, `activeTab`, `scripting`, `alarms`, `notifications`
*   **Host 权限:** 仅限必要的 AI API 域名
*   **Manifest V3:** 使用 Service Worker 替代 background pages

### 2.6 开发工具链
*   **代码质量:**
    *   **ESLint 8.53+:** TypeScript 和 React 规则
    *   **Prettier 3.1+:** 代码格式化
    *   **TypeScript 严格模式:** 启用所有严格检查
*   **类型定义:**
    *   **@types/chrome:** Chrome 扩展 API 类型定义
    *   **@types/react:** React 类型定义
*   **构建优化:**
    *   自定义 Vite 插件处理 Service Worker 兼容性
    *   静态资源自动复制（manifest.json, icons）

---

## 3. 架构原则 (Architectural Principles)

### 3.1 模块化设计 (Modularity)
*   **`src/popup`:** 插件主界面 React 应用
    *   包含单词列表、复习、设置等页面
    *   使用 React Router 进行页面路由管理
    *   通过 `chrome.runtime.sendMessage` 与 background 脚本通信
*   **`src/content`:** 轻量级 Content Script
    *   仅负责捕获选中文本和创建 UI 锚点
    *   避免引入大型依赖库，保持性能
    *   使用 Shadow DOM 隔离样式
*   **`src/background`:** 核心 Service Worker (Manifest V3)
    *   处理所有 API 调用（AI 和 Firebase）
    *   实现艾宾浩斯算法逻辑
    *   管理 `chrome.alarms` 和通知
    *   作为数据同步的中心枢纽

### 3.2 服务层架构 (Service Layer)
*   **`src/services/aiService.ts`:** AI 适配器服务
    *   实现适配器模式，统一不同 AI 模型的调用接口
    *   处理请求体和响应格式的差异
    *   实现错误重试和降级机制
*   **`src/services/storageService.ts`:** 存储服务
    *   封装 Firestore 和 `chrome.storage` 的读写操作
    *   实现本地优先的数据同步策略
    *   提供离线数据缓存机制
*   **`src/services/reviewEngine.ts`:** 复习引擎
    *   封装艾宾浩斯记忆曲线算法 (SM-2 算法)
    *   计算下次复习时间
    *   处理用户反馈和难度调整
*   **`src/services/messageService.ts`:** 消息通信服务
    *   统一管理 popup、content、background 之间的消息传递
    *   提供类型安全的消息接口
    *   实现消息队列和错误处理

### 3.3 数据流设计 (Data Flow) - 本地优先模式
1.  **读取流程:**
    *   UI 组件优先从 `chrome.storage.local` 读取数据（通过 `storageService`）
    *   TanStack Query 管理数据缓存和加载状态
    *   Background 脚本在后台与 Firestore 同步，更新本地缓存
    *   使用乐观更新提升用户体验

2.  **写入流程:**
    *   用户操作首先写入 `chrome.storage.local`，UI 立即响应
    *   `storageService` 将变更推送到同步队列
    *   Background 脚本异步处理队列，批量写入 Firestore
    *   实现冲突检测和解决机制

### 3.4 安全架构 (Security Architecture)
*   **API Keys 管理:**
    *   用户输入的 API Keys 仅存储在 `chrome.storage.local`
    *   仅 Service Worker 可访问，前端组件无法直接获取
    *   支持 API Key 加密存储（可选）
*   **Firebase 安全规则:**
    *   严格的 Firestore 安全规则，确保用户数据隔离
    *   基于 Firebase Auth 的用户身份验证
    *   实现细粒度的读写权限控制
*   **Content Security Policy:**
    *   严格的 CSP 配置，防止 XSS 攻击
    *   限制外部资源加载
    *   使用 nonce 或 hash 验证内联脚本

### 3.5 性能优化原则
*   **代码分割:**
    *   按功能模块分割代码，减少初始加载时间
    *   懒加载非核心功能组件
    *   使用 Vite 的动态导入优化
*   **内存管理:**
    *   及时清理事件监听器和定时器
    *   使用 WeakMap 和 WeakSet 避免内存泄漏
    *   限制本地缓存大小，实现 LRU 清理策略
*   **网络优化:**
    *   实现请求去重和缓存
    *   使用批量操作减少 API 调用次数
    *   支持离线模式和数据预加载
### 3.6 数据结构设计 (Data Structure)
在 Firestore 和本地存储中，核心数据结构应遵循以下设计：

```typescript
// 学习项目接口
interface LearningItem {
  id: string;
  type: 'word' | 'sentence' | 'phrase';
  content: string; // 单词或句子本身
  translation: string; // AI 生成的翻译/解释
  context?: string; // 来源句或上下文
  sourceUrl?: string; // 来源网页 URL
  createdAt: number; // Timestamp
  lastReviewedAt: number; // Timestamp
  nextReviewAt: number; // Timestamp, 核心字段，用于查询今天要复习的项目
  interval: number; // 复习间隔天数
  easeFactor: number; // 记忆因子 (SM-2算法中的E-Factor)
  repetitions: number; // 重复次数
  quality: number; // 最后一次复习的质量评分 (0-5)
  userId: string; // 关联的 Firebase User ID
  tags?: string[]; // 标签分类
  difficulty: 'easy' | 'medium' | 'hard'; // 难度等级
  isArchived: boolean; // 是否已归档
}

// 用户设置接口
interface UserSettings {
  userId: string;
  aiProvider: 'openai' | 'deepseek' | 'gemini';
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'auto';
  dailyReviewLimit: number;
  notificationsEnabled: boolean;
  autoSaveEnabled: boolean;
  reviewReminder: {
    enabled: boolean;
    time: string; // HH:MM format
  };
  updatedAt: number;
}

// 消息通信接口
interface ChromeMessage {
  type: 'TRANSLATE_TEXT' | 'SAVE_ITEM' | 'GET_REVIEWS' | 'UPDATE_SETTINGS';
  payload: any;
  requestId?: string;
}
```

---

## 4. 代码风格与规范 (Code Style & Conventions)

### 4.1 格式化与代码质量
*   **Prettier 配置:** 使用项目根目录的 `.prettierrc` 进行自动格式化
*   **ESLint 规则:** 
    *   启用 TypeScript 严格模式检查
    *   React Hooks 规则检查
    *   Chrome 扩展特定的最佳实践
*   **代码组织:**
    *   每个文件最多 300 行代码
    *   使用 barrel exports (`index.ts`) 简化导入
    *   按功能而非类型组织文件夹结构

### 4.2 命名约定
*   **组件和类型:** `PascalCase` (如 `LearningItem`, `ReviewCard`)
*   **变量和函数:** `camelCase` (如 `getUserSettings`, `isReviewDue`)
*   **常量:** `UPPER_SNAKE_CASE` (如 `MAX_DAILY_REVIEWS`, `DEFAULT_EASE_FACTOR`)
*   **文件名:** `kebab-case` (如 `review-engine.ts`, `ai-service.ts`)
*   **Chrome 消息类型:** `UPPER_SNAKE_CASE` (如 `TRANSLATE_TEXT`, `SAVE_ITEM`)

### 4.3 TypeScript 最佳实践
*   **严格模式:** 启用所有 TypeScript 严格检查
*   **类型定义:** 
    *   优先使用 `interface` 而非 `type` 定义对象结构
    *   使用 `enum` 定义常量集合
    *   避免使用 `any`，使用 `unknown` 或具体类型
*   **错误处理:**
    *   使用 `Result<T, E>` 模式处理可能失败的操作
    *   自定义错误类型，提供详细的错误信息
    *   在 Service Worker 中实现全局错误捕获

### 4.4 React 开发规范
*   **组件设计:**
    *   优先使用函数式组件和 Hooks
    *   使用 `React.memo` 优化性能
    *   自定义 Hooks 封装复杂逻辑
*   **状态管理:**
    *   使用 Zustand 管理全局状态
    *   TanStack Query 管理服务器状态
    *   避免 prop drilling，使用 Context 或状态管理
*   **性能优化:**
    *   使用 `useCallback` 和 `useMemo` 避免不必要的重渲染
    *   懒加载大型组件
    *   使用 React DevTools 监控性能

### 4.5 Chrome 扩展特定规范
*   **消息传递:**
    *   使用类型安全的消息接口
    *   实现消息超时和错误处理
    *   避免在 content script 中进行重型计算
*   **权限管理:**
    *   最小权限原则，只申请必要的权限
    *   动态权限请求，提升用户体验
    *   清晰的权限说明和用途解释
*   **存储策略:**
    *   使用 `chrome.storage.local` 存储大量数据
    *   使用 `chrome.storage.sync` 存储用户偏好
    *   实现存储配额管理和清理机制

### 4.6 注释和文档
*   **JSDoc 注释:** 为所有公共 API 提供详细的 JSDoc 注释
*   **代码注释:** 解释复杂的业务逻辑和算法实现
*   **README 文档:** 提供清晰的项目设置和开发指南
*   **API 文档:** 记录所有服务接口和数据结构

---

## 5. 开发流程与最佳实践 (Development Workflow)

### 5.1 开发环境设置
*   **Node.js 版本:** 推荐使用 Node.js 18+ 和 npm 9+
*   **IDE 配置:** 
    *   安装 TypeScript、ESLint、Prettier 插件
    *   配置自动格式化和错误检查
    *   使用 Chrome DevTools 进行调试
*   **Chrome 扩展开发模式:**
    *   启用开发者模式
    *   使用 `npm run build` 构建后加载到 Chrome
    *   使用 `chrome://extensions/` 管理和调试

### 5.2 测试策略
*   **单元测试:** 使用 Vitest 测试核心逻辑
    *   重点测试 `reviewEngine.ts` 的算法实现
    *   测试 `aiService.ts` 的适配器逻辑
    *   测试 `storageService.ts` 的数据同步
*   **集成测试:** 测试组件间的交互
    *   popup 与 background 的消息通信
    *   content script 与 background 的数据传递
    *   Firebase 数据同步的完整流程
*   **E2E 测试:** 使用 Playwright 测试完整用户流程
    *   划词翻译功能
    *   单词保存和复习流程
    *   设置页面的配置保存

### 5.3 部署和发布
*   **构建优化:**
    *   使用 `npm run build` 生成生产版本
    *   检查构建产物大小和性能
    *   验证 manifest.json 配置正确性
*   **版本管理:**
    *   遵循语义化版本控制 (Semantic Versioning)
    *   维护详细的 CHANGELOG.md
    *   使用 Git tags 标记发布版本
*   **Chrome Web Store 发布:**
    *   准备应用截图和描述
    *   配置隐私政策和权限说明
    *   遵循 Chrome Web Store 政策

---

## 6. 核心功能清单 (Core Feature List)

### 6.1 [✅ 已完成] 基础搭建与核心翻译
*   **✅ 项目初始化:**
    *   Vite + React + TypeScript 项目结构
    *   Chrome 扩展 Manifest V3 配置
    *   基础的 popup、content、background 脚本
*   **✅ 设置页面:**
    *   AI 模型选择 (OpenAI/DeepSeek/Gemini/Qwen)
    *   API Key 输入和验证
    *   用户偏好设置 (语言、主题等)
*   **✅ 划词/划句翻译:**
    *   文本选择检测和 UI 锚点创建
    *   流式 AI 翻译请求和结果显示
    *   翻译卡片的交互设计和样式隔离
*   **✅ AI 适配器:**
    *   统一的 AI 服务调用接口
    *   四种模型的请求格式适配 (OpenAI/DeepSeek/Gemini/Qwen)
    *   流式翻译支持和错误处理机制

### 6.2 [✅ 已完成] 本地记忆系统
*   **✅ 单词保存:**
    *   翻译卡片上的 "Save to Memory" 按钮
    *   `LearningItem` 对象创建和存储
    *   本地数据持久化 (Chrome Storage API)
*   **✅ 复习引擎:**
    *   SM-2 算法完整实现
    *   用户反馈处理 ("Easy"、"Good"、"Hard")
    *   复习间隔和记忆因子动态调整
*   **✅ 复习页面:**
    *   今日待复习项目列表
    *   复习卡片交互界面
    *   复习进度统计和完成状态

### 6.3 [✅ 已完成] Firebase 用户与同步系统
*   **✅ 用户认证:**
    *   Firebase Authentication 集成
    *   匿名登录自动实现
    *   用户状态管理和演示模式支持
*   **✅ 数据同步:**
    *   本地数据与 Firestore 双向同步
    *   本地优先模式 (Local-First)
    *   离线数据缓存策略和自动同步
*   **✅ Firestore 安全规则:**
    *   用户数据隔离规则
    *   基于 UID 的读写权限控制
    *   数据验证和安全访问

### 6.4 [✅ 已完成] 体验优化
*   **✅ 每日提醒:**
    *   `chrome.alarms` API 集成
    *   每日复习检查和通知
    *   复习通知推送系统
*   **🔄 发音功能:**
    *   基础 TTS 支持 (计划中)
    *   多语言发音支持 (计划中)
    *   发音按钮和快捷键 (计划中)
*   **🔄 高级功能:**
    *   单词本导入/导出 (计划中)
    *   学习统计和进度图表 (基础版已实现)
    *   自定义复习计划 (计划中)

### 6.5 [📋 计划中] 高级特性
*   **📋 智能推荐:**
    *   基于用户行为的单词推荐
    *   相关词汇和短语建议
    *   个性化学习路径
*   **📋 社交功能:**
    *   学习成就和徽章系统
    *   学习进度分享
    *   社区词汇库
*   **📋 多平台支持:**
    *   Firefox 扩展适配
    *   移动端 PWA 版本
    *   桌面应用程序

### 6.6 [✅ 已完成] 技术架构优化
*   **✅ 状态管理:**
    *   Zustand 全局状态管理
    *   TanStack Query 异步数据管理
    *   本地存储与云端同步协调
*   **✅ 性能优化:**
    *   流式翻译实时显示
    *   组件懒加载和代码分割
    *   内存管理和事件清理
*   **✅ 错误处理:**
    *   全局错误捕获机制
    *   用户友好的错误提示
    *   网络请求超时和重试

---

## 7. 技术债务和改进计划 (Technical Debt & Improvements)

### 7.1 当前已知问题
*   **✅ Service Worker 兼容性:** 已通过自定义 Vite 插件解决 `window` 对象问题
*   **🔄 错误处理:** 需要完善全局错误捕获和用户友好的错误提示
*   **📋 性能优化:** 大量数据时的渲染性能需要优化
*   **📋 测试覆盖率:** 当前缺少完整的测试套件

### 7.2 未来改进方向
*   **代码质量:**
    *   增加单元测试和集成测试
    *   实现代码覆盖率监控
    *   引入代码质量检查工具
*   **用户体验:**
    *   优化加载性能和响应速度
    *   改进 UI/UX 设计
    *   增加无障碍访问支持
*   **技术架构:**
    *   考虑引入 Web Workers 处理重型计算
    *   实现更智能的数据同步策略
    *   优化内存使用和垃圾回收

---

## 8. 项目协作指南 (Collaboration Guidelines)

*   **代码审查:** 所有代码变更都需要经过 Code Review
*   **提交规范:** 使用 Conventional Commits 格式
*   **分支策略:** 使用 Git Flow 工作流
*   **文档维护:** 及时更新技术文档和用户手册
*   **问题跟踪:** 使用 GitHub Issues 跟踪 bug 和功能请求

---

**注意:** 这个项目规则文档会随着项目发展不断更新。请确保在开发过程中遵循最新版本的规范和最佳实践。