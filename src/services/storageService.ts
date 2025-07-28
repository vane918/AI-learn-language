import { LearningItem, UserSettings, ChromeStorageData } from '../types';

/**
 * 存储服务 - 管理本地存储和 Firebase 同步
 * 实现本地优先 (Local-First) 模式
 */

// 默认用户设置
const DEFAULT_SETTINGS: UserSettings = {
  aiProvider: 'openai',
  apiKey: '',
  language: 'zh',
  dailyReviewLimit: 50,
  enableNotifications: true
};

// 存储键名
const STORAGE_KEYS = {
  LEARNING_ITEMS: 'learningItems',
  USER_SETTINGS: 'userSettings',
  LAST_SYNC_TIME: 'lastSyncTime',
  PENDING_SYNC: 'pendingSync'
} as const;

/**
 * 获取所有学习项目
 */
export async function getLearningItems(): Promise<LearningItem[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LEARNING_ITEMS);
    return result[STORAGE_KEYS.LEARNING_ITEMS] || [];
  } catch (error) {
    console.error('Failed to get learning items:', error);
    return [];
  }
}

/**
 * 保存学习项目
 */
export async function saveLearningItem(item: LearningItem): Promise<void> {
  try {
    const items = await getLearningItems();
    const existingIndex = items.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.LEARNING_ITEMS]: items
    });
    
    // 添加到待同步队列
    await addToPendingSync(item);
  } catch (error) {
    console.error('Failed to save learning item:', error);
    throw error;
  }
}

/**
 * 批量保存学习项目
 */
export async function saveLearningItems(items: LearningItem[]): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LEARNING_ITEMS]: items
    });
    
    // 添加到待同步队列
    for (const item of items) {
      await addToPendingSync(item);
    }
  } catch (error) {
    console.error('Failed to save learning items:', error);
    throw error;
  }
}

/**
 * 删除学习项目
 */
export async function deleteLearningItem(itemId: string): Promise<void> {
  try {
    const items = await getLearningItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.LEARNING_ITEMS]: filteredItems
    });
  } catch (error) {
    console.error('Failed to delete learning item:', error);
    throw error;
  }
}

/**
 * 获取用户设置
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.USER_SETTINGS] };
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存用户设置
 */
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  try {
    const currentSettings = await getUserSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_SETTINGS]: newSettings
    });
  } catch (error) {
    console.error('Failed to save user settings:', error);
    throw error;
  }
}

/**
 * 获取待同步的项目
 */
export async function getPendingSyncItems(): Promise<LearningItem[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PENDING_SYNC);
    return result[STORAGE_KEYS.PENDING_SYNC] || [];
  } catch (error) {
    console.error('Failed to get pending sync items:', error);
    return [];
  }
}

/**
 * 添加项目到待同步队列
 */
async function addToPendingSync(item: LearningItem): Promise<void> {
  try {
    const pendingItems = await getPendingSyncItems();
    const existingIndex = pendingItems.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      pendingItems[existingIndex] = item;
    } else {
      pendingItems.push(item);
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_SYNC]: pendingItems
    });
  } catch (error) {
    console.error('Failed to add to pending sync:', error);
  }
}

/**
 * 清空待同步队列
 */
export async function clearPendingSync(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_SYNC]: []
    });
  } catch (error) {
    console.error('Failed to clear pending sync:', error);
  }
}

/**
 * 获取最后同步时间
 */
export async function getLastSyncTime(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC_TIME);
    return result[STORAGE_KEYS.LAST_SYNC_TIME] || 0;
  } catch (error) {
    console.error('Failed to get last sync time:', error);
    return 0;
  }
}

/**
 * 更新最后同步时间
 */
export async function updateLastSyncTime(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_SYNC_TIME]: Date.now()
    });
  } catch (error) {
    console.error('Failed to update last sync time:', error);
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<{ used: number; total: number }> {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    return {
      used: usage,
      total: chrome.storage.local.QUOTA_BYTES
    };
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    return { used: 0, total: 0 };
  }
}

/**
 * 清空所有本地数据
 */
export async function clearAllData(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Failed to clear all data:', error);
    throw error;
  }
}

/**
 * 导出数据
 */
export async function exportData(): Promise<ChromeStorageData> {
  try {
    const [items, settings, lastSync, pending] = await Promise.all([
      getLearningItems(),
      getUserSettings(),
      getLastSyncTime(),
      getPendingSyncItems()
    ]);
    
    return {
      learningItems: items,
      userSettings: settings,
      lastSyncTime: lastSync,
      pendingSync: pending
    };
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

/**
 * 导入数据
 */
export async function importData(data: ChromeStorageData): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LEARNING_ITEMS]: data.learningItems,
      [STORAGE_KEYS.USER_SETTINGS]: data.userSettings,
      [STORAGE_KEYS.LAST_SYNC_TIME]: data.lastSyncTime,
      [STORAGE_KEYS.PENDING_SYNC]: data.pendingSync
    });
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
}