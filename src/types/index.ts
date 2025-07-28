// 核心数据类型定义

export interface LearningItem {
  id: string;
  type: 'word' | 'sentence';
  content: string; // 单词或句子本身
  translation: string; // AI 生成的翻译/解释
  context?: string; // 来源句或上下文
  sourceUrl?: string; // 来源页面URL
  sourceTitle?: string; // 来源页面标题
  createdAt: number; // Timestamp
  lastReviewedAt: number; // Timestamp
  nextReviewAt: number; // Timestamp, 核心字段，用于查询今天要复习的项目
  interval: number; // 复习间隔天数
  easeFactor: number; // 记忆因子 (e.g., SM-2算法中的E-Factor)
  userId: string; // 关联的 Firebase User ID
}

export interface UserSettings {
  aiProvider: 'openai' | 'deepseek' | 'gemini' | 'qwen';
  apiKey: string;
  language: 'zh' | 'en';
  dailyReviewLimit: number;
  enableNotifications: boolean;
}

export interface ReviewResult {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 算法中的质量评分
  // 0: 完全不记得, 1: 错误答案, 2: 错误但记得, 3: 困难但正确, 4: 犹豫但正确, 5: 完美记忆
}

export interface AITranslationRequest {
  text: string;
  context?: string;
  targetLanguage: string;
}

export interface AITranslationResponse {
  translation: string;
  wordType?: string;
  explanation?: string;
  pronunciation?: string;
  examples?: string[];
}

export interface StreamTranslationChunk {
  content: string;
  done: boolean;
  data?: Partial<AITranslationResponse>;
}

// AI 提供商配置
export interface AIProviderConfig {
  name: string;
  apiUrl: string;
  headers: Record<string, string>;
  requestFormatter: (request: AITranslationRequest, apiKey: string) => any;
  responseParser: (response: any) => AITranslationResponse;
}

// Chrome 存储数据结构
export interface ChromeStorageData {
  learningItems: LearningItem[];
  userSettings: UserSettings;
  lastSyncTime: number;
  pendingSync: LearningItem[]; // 待同步到 Firebase 的项目
}

// UI 状态类型
export interface UIState {
  isLoading: boolean;
  currentPage: 'home' | 'review' | 'settings' | 'wordList';
  selectedItem: LearningItem | null;
  reviewQueue: LearningItem[];
}

// Chrome 消息类型
export interface ChromeMessage {
  action: string;
  data?: any;
  requestId?: string;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  streaming?: boolean;
}

// 复习统计类型
export interface ReviewStats {
  todayReviews: number;
  pendingReviews: number;
  totalItems: number;
  upcomingReviews: number;
  studyStreak: number;
  progress: number;
}

// 同步状态类型
export interface SyncStatus {
  lastSyncTime: number;
  cloudItemCount: number;
  localItemCount: number;
  isConnected: boolean;
  pendingSyncCount: number;
}

// 学习建议类型
export interface LearningRecommendation {
  shouldReview: boolean;
  reviewCount: number;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

// 应用配置类型
export interface AppConfig {
  version: string;
  environment: 'development' | 'production';
  features: {
    firebase: boolean;
    notifications: boolean;
    analytics: boolean;
  };
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// 通知类型
export interface NotificationConfig {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // HH:MM format
  reviewReminder: boolean;
  streakReminder: boolean;
}

// 主题配置类型
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

// 扩展的用户设置
export interface ExtendedUserSettings extends UserSettings {
  notifications: NotificationConfig;
  theme: ThemeConfig;
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
}