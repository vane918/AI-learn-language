# LexiMemo AI 技术文档

## 🏗️ 架构设计

### 整体架构

LexiMemo AI 采用现代化的 Chrome 扩展架构，基于 Manifest V3 规范，实现了本地优先的数据同步模式。

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content Script │    │   Popup (React) │    │ Background SW   │
│                 │    │                 │    │                 │
│ • 划词检测       │    │ • 主界面        │    │ • AI API 调用   │
│ • 翻译卡片       │◄──►│ • 复习页面      │◄──►│ • Firebase 同步 │
│ • 流式显示       │    │ • 设置页面      │    │ • 定时任务      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Chrome Storage  │
                    │                 │
                    │ • 本地缓存      │
                    │ • 用户设置      │
                    │ • 学习数据      │
                    └─────────────────┘
```

### 数据流设计

#### 本地优先模式 (Local-First)

1. **读取流程**:
   - UI 组件优先从 `chrome.storage.local` 读取数据
   - TanStack Query 管理数据缓存和加载状态
   - Background 脚本在后台与 Firestore 同步

2. **写入流程**:
   - 用户操作立即写入本地存储
   - UI 立即响应（乐观更新）
   - 后台异步同步到 Firebase

## 🔧 核心服务

### AI 服务适配器 (`aiService.ts`)

使用适配器模式统一处理不同 AI 提供商：

```typescript
interface AIProviderConfig {
  name: string;
  apiUrl: string;
  headers: Record<string, string>;
  requestFormatter: (request: AITranslationRequest, apiKey: string) => any;
  responseParser: (response: any) => AITranslationResponse;
}
```

**支持的 AI 模型**:
- OpenAI (GPT-3.5/GPT-4)
- DeepSeek
- Google Gemini
- Qwen (通义千问)

**流式翻译实现**:
```typescript
export async function* streamTranslateWithAI(
  request: AITranslationRequest,
  provider: string,
  apiKey: string
): AsyncIterable<StreamTranslationChunk>
```

### 复习引擎 (`reviewEngine.ts`)

基于 SM-2 算法实现艾宾浩斯记忆曲线：

```typescript
interface LearningItem {
  interval: number;        // 复习间隔天数
  easeFactor: number;      // 记忆因子 (1.3-2.5)
  repetitions: number;     // 重复次数
  quality: number;         // 质量评分 (0-5)
  nextReviewAt: number;    // 下次复习时间
}
```

**算法核心**:
- 质量评分 < 3: 重置间隔，从第一天开始
- 质量评分 ≥ 3: 根据记忆因子计算下次间隔
- 记忆因子动态调整，范围 1.3-2.5

### Firebase 服务 (`firebaseService.ts`)

**功能特性**:
- 匿名登录，无需注册
- 自动数据同步
- 冲突检测和解决
- 演示模式支持

**数据结构**:
```
users/{userId}/
├── learningItems/{itemId}     # 学习项目
├── settings/userSettings      # 用户设置
└── stats/                     # 学习统计
```

### 存储服务 (`storageService.ts`)

**存储策略**:
- `chrome.storage.local`: 学习数据、缓存
- `chrome.storage.sync`: 用户偏好设置
- 自动数据迁移和版本管理

## 🎨 前端架构

### 状态管理

**Zustand Store** (`appStore.ts`):
```typescript
interface AppState {
  learningItems: LearningItem[];
  reviewQueue: LearningItem[];
  reviewStats: ReviewStats;
  syncStatus: SyncStatus;
  isLoading: boolean;
  error: string | null;
}
```

**TanStack Query**:
- 管理异步数据获取
- 自动缓存和重新验证
- 乐观更新支持

### 组件结构

```
popup/
├── App.tsx                    # 主应用组件
├── components/               # 可复用组件
│   ├── ReviewCard.tsx        # 复习卡片
│   ├── ProgressChart.tsx     # 进度图表
│   └── SettingsForm.tsx      # 设置表单
└── pages/                    # 页面组件
    ├── HomePage.tsx          # 主页
    ├── ReviewPage.tsx        # 复习页面
    └── SettingsPage.tsx      # 设置页面
```

## 🔄 消息通信

### 消息类型定义

```typescript
interface ChromeMessage {
  action: 'translate' | 'save' | 'sync' | 'settings';
  data?: any;
  requestId?: string;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 通信流程

1. **Content → Background**: 翻译请求
2. **Background → AI API**: 流式翻译
3. **Background → Content**: 流式响应
4. **Popup → Background**: 数据操作
5. **Background → Firebase**: 数据同步

## 🎯 性能优化

### 代码分割

- 按页面懒加载组件
- AI 服务按需导入
- 减少初始包大小

### 内存管理

- 及时清理事件监听器
- 使用 WeakMap 避免内存泄漏
- 限制本地缓存大小

### 网络优化

- 请求去重和缓存
- 批量操作减少 API 调用
- 离线模式支持

## 🔒 安全设计

### API Key 管理

- 仅存储在 `chrome.storage.local`
- 仅 Service Worker 可访问
- 支持加密存储（可选）

### Firebase 安全规则

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Content Security Policy

- 严格的 CSP 配置
- 防止 XSS 攻击
- 限制外部资源加载

## 🧪 测试策略

### 单元测试

- 核心算法测试 (SM-2)
- AI 适配器测试
- 数据同步逻辑测试

### 集成测试

- 消息通信测试
- Firebase 同步测试
- 存储服务测试

### E2E 测试

- 划词翻译流程
- 复习完整流程
- 设置保存流程

## 🚀 部署流程

### 构建配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: false,  // 避免 Service Worker 兼容性问题
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        content: 'src/content/index.ts',
        background: 'src/background/index.ts'
      }
    }
  }
});
```

### 发布检查清单

- [ ] 构建无错误
- [ ] 所有测试通过
- [ ] Manifest 版本更新
- [ ] 权限配置正确
- [ ] 图标和截图准备
- [ ] 隐私政策更新

## 📊 监控和调试

### 日志系统

- Content Script: 网页控制台
- Background Script: 扩展页面 Service Worker
- Popup: 弹窗检查器

### 性能监控

- 翻译响应时间
- 数据同步延迟
- 内存使用情况
- 错误率统计

### 调试工具

- Chrome DevTools
- React DevTools
- TanStack Query DevTools
- Firebase Emulator

## 🔮 未来规划

### 技术升级

- React 19 升级
- Vite 6 支持
- TypeScript 5.3+
- 更多 AI 模型集成

### 功能扩展

- PWA 移动端支持
- 桌面应用版本
- 浏览器扩展多平台支持
- 社交学习功能

### 性能优化

- Web Workers 重型计算
- IndexedDB 大数据存储
- Service Worker 缓存策略
- CDN 静态资源加速