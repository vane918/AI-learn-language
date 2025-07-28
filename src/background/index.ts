import { 
  translateWithAI,
  streamTranslateWithAI,
  AITranslationRequest,
  parseFormattedResponse
} from '../services/aiService';
import { 
  getUserSettings, 
  saveLearningItem, 
  getLearningItems,
  getPendingSyncItems 
} from '../services/storageService';
import { 
  createLearningItem, 
  getTodayReviewItems, 
  getReviewStats,
  updateItemAfterReview 
} from '../services/reviewEngine';
import { 
  setupMessageListener, 
  MessageResponse 
} from '../services/messageService';
import { 
  initializeFirebase, 
  performFullSync, 
  isFirebaseConnected 
} from '../services/firebaseService';
import type { 
  ChromeMessage, 
  ReviewResult
} from '../types';

/**
 * Background Service Worker
 * 处理所有 AI API 调用、数据同步和定时任务
 */

// 初始化标志
let isInitialized = false;

// 监听插件安装
chrome.runtime.onInstalled.addListener(async () => {
  console.log('LexiMemo AI Extension installed');
  
  // 初始化服务
  await initializeServices();
  
  // 设置每日复习提醒
  chrome.alarms.create('dailyReview', {
    when: Date.now() + 1000 * 60, // 1分钟后开始
    periodInMinutes: 60 * 24 // 每24小时重复
  });
  
  // 设置同步定时器
  chrome.alarms.create('autoSync', {
    when: Date.now() + 1000 * 60 * 5, // 5分钟后开始
    periodInMinutes: 60 // 每小时同步一次
  });
});

// 监听定时器
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'dailyReview':
      checkDailyReview();
      break;
    case 'autoSync':
      performAutoSync();
      break;
  }
});

// 设置消息监听器
setupMessageListener(handleMessage);

/**
 * 初始化服务
 */
async function initializeServices() {
  if (isInitialized) return;
  
  try {
    // 初始化 Firebase（如果配置了的话）
    await initializeFirebase().catch(error => {
      console.warn('Firebase initialization failed:', error);
    });
    
    // 更新徽章计数
    await updateBadgeCount();
    
    isInitialized = true;
    console.log('Background services initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

/**
 * 处理消息
 */
async function handleMessage(
  message: ChromeMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) {
  try {
    // 确保服务已初始化
    if (!isInitialized) {
      await initializeServices();
    }

    switch (message.action) {
      case 'translate':
        await handleTranslateRequest(message, _sender, sendResponse);
        break;
        
      case 'saveWord':
        await handleSaveWordRequest(message, sendResponse);
        break;
        
      case 'validateApiKey':
        await handleValidateApiKeyRequest(message, sendResponse);
        break;
        
      case 'updateBadge':
        await updateBadgeCount();
        sendResponse({ success: true });
        break;
        
      case 'getReviewItems':
        await handleGetReviewItemsRequest(sendResponse);
        break;
        
      case 'submitReview':
        await handleSubmitReviewRequest(message, sendResponse);
        break;
        
      case 'syncData':
        await handleSyncDataRequest(sendResponse);
        break;
        
      case 'getStats':
        await handleGetStatsRequest(sendResponse);
        break;
        
      case 'openExtensionPage':
        await handleOpenExtensionPageRequest(sendResponse);
        break;
        
      default:
        sendResponse({ 
          success: false, 
          error: `Unknown action: ${message.action}` 
        });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理翻译请求
 */
async function handleTranslateRequest(
  message: ChromeMessage, 
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const settings = await getUserSettings();
    
    if (!settings.apiKey) {
      sendResponse({ 
        success: false, 
        error: 'API Key not configured' 
      });
      return true;
    }

    const { text, context } = message.data;
    const translationRequest: AITranslationRequest = {
      text,
      context,
      targetLanguage: settings.language === 'zh' ? 'Chinese' : 'English'
    };

    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return true;
    }

    sendResponse({ success: true, data: { streaming: true } });
    
    const stream = streamTranslateWithAI(
      translationRequest,
      settings.aiProvider,
      settings.apiKey
    );

    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk.content;
      await chrome.tabs.sendMessage(tabId, {
        action: 'translationChunk',
        data: chunk,
        requestId: message.requestId
      });
    }

    const parsedResponse = parseFormattedResponse(fullContent);
    // 发送最终完整响应
    await chrome.tabs.sendMessage(tabId, {
      action: 'translationComplete',
      data: parsedResponse,
      requestId: message.requestId
    });

  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed' 
    });
  }
  return true; // 保持消息通道开放
}

/**
 * 处理保存单词请求
 */
async function handleSaveWordRequest(
  message: ChromeMessage, 
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const learningItemData = message.data;
    
    // 创建学习项目
    const learningItem = createLearningItem(
      learningItemData.word || learningItemData.text,
      learningItemData.translation || '',
      learningItemData.wordType || learningItemData.type || 'word',
      learningItemData.context || '',
      'local' // 暂时使用本地用户ID
    );

    // 添加额外信息
    if (learningItemData.sourceUrl) {
      learningItem.sourceUrl = learningItemData.sourceUrl;
    }
    if (learningItemData.sourceTitle) {
      learningItem.sourceTitle = learningItemData.sourceTitle;
    }

    await saveLearningItem(learningItem);
    await updateBadgeCount();

    sendResponse({ success: true, data: learningItem });
  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save word' 
    });
  }
}

/**
 * 处理 API Key 验证请求
 */
async function handleValidateApiKeyRequest(
  message: ChromeMessage, 
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const { provider, apiKey } = message.data;
    
    // 验证参数
    if (!provider || !apiKey) {
      sendResponse({ success: true, data: { valid: false, error: 'Provider and API key are required' } });
      return;
    }

    // 简单的验证请求
    const testRequest: AITranslationRequest = {
      text: 'hello',
      targetLanguage: 'Chinese'
    };

    console.log(`Validating API key for provider: ${provider}`);
    await translateWithAI(testRequest, provider, apiKey);
    console.log(`API key validation successful for provider: ${provider}`);
    sendResponse({ success: true, data: { valid: true } });
  } catch (error) {
    console.error(`API key validation failed for provider: ${message.data?.provider}`, error);
    sendResponse({ 
      success: true, 
      data: { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      } 
    });
  }
}

/**
 * 处理打开扩展页面请求
 */
async function handleOpenExtensionPageRequest(
  sendResponse: (response: MessageResponse) => void
) {
  try {
    // 打开扩展的 popup 页面
    const extensionUrl = chrome.runtime.getURL('popup.html');
    await chrome.tabs.create({ url: extensionUrl });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to open extension page:', error);
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open extension page' 
    });
  }
}

/**
 * 处理获取复习项目请求
 */
async function handleGetReviewItemsRequest(
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const items = await getLearningItems();
    const reviewItems = getTodayReviewItems(items);
    
    sendResponse({ 
      success: true, 
      data: { 
        reviewItems,
        totalCount: reviewItems.length 
      } 
    });
  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review items' 
    });
  }
}

/**
 * 处理提交复习结果请求
 */
async function handleSubmitReviewRequest(
  message: ChromeMessage, 
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const { itemId, result } = message.data;
    const items = await getLearningItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      sendResponse({ 
        success: false, 
        error: 'Learning item not found' 
      });
      return;
    }

    const updatedItem = updateItemAfterReview(item, result as ReviewResult);
    await saveLearningItem(updatedItem);
    await updateBadgeCount();

    sendResponse({ success: true, data: updatedItem });
  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit review' 
    });
  }
}

/**
 * 处理数据同步请求
 */
async function handleSyncDataRequest(
  sendResponse: (response: MessageResponse) => void
) {
  try {
    if (!isFirebaseConnected()) {
      sendResponse({ 
        success: false, 
        error: 'Firebase not connected' 
      });
      return;
    }

    const syncResult = await performFullSync();
    sendResponse({ success: true, data: syncResult });
  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed' 
    });
  }
}

/**
 * 处理获取统计信息请求
 */
async function handleGetStatsRequest(
  sendResponse: (response: MessageResponse) => void
) {
  try {
    const items = await getLearningItems();
    const stats = getReviewStats(items);
    const pendingItems = await getPendingSyncItems();
    
    sendResponse({ 
      success: true, 
      data: {
        ...stats,
        pendingSyncCount: pendingItems.length,
        isFirebaseConnected: isFirebaseConnected()
      }
    });
  } catch (error) {
    sendResponse({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats' 
    });
  }
}

/**
 * 更新插件图标角标
 */
async function updateBadgeCount() {
  try {
    const items = await getLearningItems();
    const todayReviewItems = getTodayReviewItems(items);
    
    const count = todayReviewItems.length;
    
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Failed to update badge count:', error);
  }
}

/**
 * 检查每日复习
 */
async function checkDailyReview() {
  try {
    const [items, settings] = await Promise.all([
      getLearningItems(),
      getUserSettings()
    ]);
    
    const todayReviewItems = getTodayReviewItems(items);
    
    if (todayReviewItems.length > 0 && settings.enableNotifications) {
      // 显示通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'LexiMemo AI',
        message: `You have ${todayReviewItems.length} words to review today!`
      });
    }
    
    await updateBadgeCount();
  } catch (error) {
    console.error('Failed to check daily review:', error);
  }
}

/**
 * 执行自动同步
 */
async function performAutoSync() {
  try {
    if (!isFirebaseConnected()) {
      console.log('Firebase not connected, skipping auto sync');
      return;
    }

    const pendingItems = await getPendingSyncItems();
    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return;
    }

    console.log(`Auto syncing ${pendingItems.length} items...`);
    const result = await performFullSync();
    
    if (result.success) {
      console.log(`Auto sync completed: ${result.syncedItems} items synced`);
    } else {
      console.error('Auto sync failed:', result.error);
    }
  } catch (error) {
    console.error('Auto sync error:', error);
  }
}

// 初始化时更新角标
updateBadgeCount();