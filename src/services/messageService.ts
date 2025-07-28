/**
 * 消息服务 - 统一处理 Chrome 扩展内部通信
 * 提供类型安全的消息传递接口
 */

// 消息类型定义
export interface ChromeMessage {
  action: string;
  data?: any;
  requestId?: string;
}

export interface TranslateMessage extends ChromeMessage {
  action: 'translate';
  data: {
    text: string;
    context?: string;
  };
}

export interface SaveWordMessage extends ChromeMessage {
  action: 'saveWord';
  data: {
    text: string;
    translation: string;
    type: 'word' | 'sentence';
    context?: string;
  };
}

export interface ValidateApiKeyMessage extends ChromeMessage {
  action: 'validateApiKey';
  data: {
    provider: string;
    apiKey: string;
  };
}

export interface UpdateBadgeMessage extends ChromeMessage {
  action: 'updateBadge';
}

export interface GetReviewItemsMessage extends ChromeMessage {
  action: 'getReviewItems';
}

export interface SyncDataMessage extends ChromeMessage {
  action: 'syncData';
}

// 响应类型定义
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 发送消息到 background script
 */
export async function sendMessageToBackground<T = any>(
  message: ChromeMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    const messageWithId = {
      ...message,
      requestId: generateRequestId()
    };

    chrome.runtime.sendMessage(messageWithId, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        resolve(response || { success: false, error: 'No response received' });
      }
    });
  });
}

/**
 * 发送消息到 content script
 */
export async function sendMessageToContentScript<T = any>(
  tabId: number,
  message: ChromeMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    const messageWithId = {
      ...message,
      requestId: generateRequestId()
    };

    chrome.tabs.sendMessage(tabId, messageWithId, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        resolve(response || { success: false, error: 'No response received' });
      }
    });
  });
}

/**
 * 发送消息到 popup
 */
export async function sendMessageToPopup<T = any>(
  message: ChromeMessage
): Promise<MessageResponse<T>> {
  return sendMessageToBackground(message);
}

/**
 * 监听消息 - 用于各个脚本中设置消息监听器
 */
export function setupMessageListener(
  handler: (
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => void | Promise<void>
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message, sender, sendResponse);
    
    // 如果处理函数返回 Promise，等待其完成
    if (result instanceof Promise) {
      result.catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
      return true; // 保持消息通道开放
    }
    
    return false;
  });
}

/**
 * 翻译文本的便捷方法
 */
export async function translateText(text: string, context?: string) {
  const message: TranslateMessage = {
    action: 'translate',
    data: { text, context }
  };
  
  return sendMessageToBackground(message);
}

/**
 * 保存单词的便捷方法
 */
export async function saveWord(
  text: string,
  translation: string,
  type: 'word' | 'sentence',
  context?: string
) {
  const message: SaveWordMessage = {
    action: 'saveWord',
    data: { text, translation, type, context }
  };
  
  return sendMessageToBackground(message);
}

/**
 * 验证 API Key 的便捷方法
 */
export async function validateApiKey(provider: string, apiKey: string) {
  const message: ValidateApiKeyMessage = {
    action: 'validateApiKey',
    data: { provider, apiKey }
  };
  
  return sendMessageToBackground(message);
}

/**
 * 更新徽章计数的便捷方法
 */
export async function updateBadgeCount() {
  const message: UpdateBadgeMessage = {
    action: 'updateBadge'
  };
  
  return sendMessageToBackground(message);
}

/**
 * 获取复习项目的便捷方法
 */
export async function getReviewItems() {
  const message: GetReviewItemsMessage = {
    action: 'getReviewItems'
  };
  
  return sendMessageToBackground(message);
}

/**
 * 同步数据的便捷方法
 */
export async function syncData() {
  const message: SyncDataMessage = {
    action: 'syncData'
  };
  
  return sendMessageToBackground(message);
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 错误处理工具
 */
export class MessageError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MessageError';
  }
}

/**
 * 重试机制
 */
export async function sendMessageWithRetry<T = any>(
  message: ChromeMessage,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<MessageResponse<T>> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await sendMessageToBackground<T>(message);
      if (response.success) {
        return response;
      }
      lastError = new Error(response.error || 'Unknown error');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}