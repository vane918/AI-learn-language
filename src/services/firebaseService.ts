import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { LearningItem, UserSettings } from '../types';

/**
 * Firebase 服务 - 处理云端数据同步
 * 实现本地优先 (Local-First) 架构
 */

// Firebase 配置 - 支持环境变量
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

// 检查是否为演示模式 - 更严格的判断
const isDemoMode = !import.meta.env.VITE_FIREBASE_API_KEY || 
                   import.meta.env.VITE_FIREBASE_API_KEY === "demo-api-key" ||
                   firebaseConfig.apiKey === "demo-api-key";

// 初始化 Firebase (仅在非演示模式下)
let app: any = null;
let db: any = null;
let auth: any = null;

if (!isDemoMode) {
  try {
    console.log('Initializing Firebase with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasApiKey: !!firebaseConfig.apiKey
    });
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    console.warn('Falling back to demo mode');
    // 强制进入演示模式
    app = null;
    db = null;
    auth = null;
  }
}

// 当前用户状态
let currentUser: User | null = null;

/**
 * 初始化 Firebase 服务
 */
export async function initializeFirebase(): Promise<void> {
  if (isDemoMode || !auth) {
    console.log('Running in demo mode - Firebase features disabled');
    return;
  }

  try {
    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            currentUser = user;
            console.log('Firebase user authenticated:', user.uid);
          } else {
            // 匿名登录
            console.log('Attempting anonymous sign-in...');
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
            console.log('Firebase anonymous user created:', currentUser.uid);
          }
          unsubscribe();
          resolve();
        } catch (error) {
          console.error('Firebase authentication error:', error);
          unsubscribe();
          // 不要 reject，而是继续以演示模式运行
          console.warn('Continuing in demo mode due to auth error');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.warn('Continuing in demo mode');
  }
}

/**
 * 获取当前用户ID
 */
export function getCurrentUserId(): string | null {
  return currentUser?.uid || null;
}

/**
 * 同步学习项目到云端
 */
export async function syncLearningItemsToCloud(items: LearningItem[]): Promise<void> {
  if (isDemoMode || !currentUser || !db) {
    console.log('Demo mode: skipping cloud sync');
    return;
  }

  const batch = [];
  const userItemsRef = collection(db, 'users', currentUser.uid, 'learningItems');

  for (const item of items) {
    const itemRef = doc(userItemsRef, item.id);
    batch.push(setDoc(itemRef, {
      ...item,
      createdAt: Timestamp.fromMillis(item.createdAt),
      lastReviewedAt: Timestamp.fromMillis(item.lastReviewedAt),
      nextReviewAt: Timestamp.fromMillis(item.nextReviewAt),
      updatedAt: Timestamp.now()
    }));
  }

  // Firebase 批量写入限制为 500 个操作
  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    const batchSlice = batch.slice(i, i + batchSize);
    await Promise.all(batchSlice);
  }
}

/**
 * 从云端获取学习项目
 */
export async function getLearningItemsFromCloud(): Promise<LearningItem[]> {
  if (isDemoMode || !currentUser || !db) {
    console.log('Demo mode: returning empty items array');
    return [];
  }

  const userItemsRef = collection(db, 'users', currentUser.uid, 'learningItems');
  const q = query(userItemsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const items: LearningItem[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    items.push({
      ...data,
      id: doc.id,
      createdAt: data.createdAt.toMillis(),
      lastReviewedAt: data.lastReviewedAt.toMillis(),
      nextReviewAt: data.nextReviewAt.toMillis()
    } as LearningItem);
  });

  return items;
}

/**
 * 同步用户设置到云端
 */
export async function syncUserSettingsToCloud(settings: UserSettings): Promise<void> {
  if (isDemoMode || !currentUser || !db) {
    console.log('Demo mode: skipping settings sync');
    return;
  }

  const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'userSettings');
  await setDoc(userSettingsRef, {
    ...settings,
    updatedAt: Timestamp.now()
  });
}

/**
 * 从云端获取用户设置
 */
export async function getUserSettingsFromCloud(): Promise<UserSettings | null> {
  if (isDemoMode || !currentUser || !db) {
    console.log('Demo mode: returning null settings');
    return null;
  }

  const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'userSettings');
  const docSnap = await getDoc(userSettingsRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      aiProvider: data.aiProvider,
      apiKeys: data.apiKeys || {
        openai: data.apiKey || '',
        deepseek: '',
        gemini: '',
        qwen: ''
      },
      language: data.language,
      dailyReviewLimit: data.dailyReviewLimit,
      enableNotifications: data.enableNotifications
    };
  }

  return null;
}

/**
 * 删除云端学习项目
 */
export async function deleteLearningItemFromCloud(itemId: string): Promise<void> {
  if (isDemoMode || !currentUser || !db) {
    console.log('Demo mode: skipping cloud deletion');
    return;
  }

  const itemRef = doc(db, 'users', currentUser.uid, 'learningItems', itemId);
  await deleteDoc(itemRef);
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<{
  lastSyncTime: number;
  cloudItemCount: number;
  localItemCount: number;
}> {
  if (isDemoMode || !currentUser) {
    const { getLearningItems } = await import('./storageService');
    const localItems = await getLearningItems();
    
    return {
      lastSyncTime: 0,
      cloudItemCount: 0,
      localItemCount: localItems.length
    };
  }

  try {
    const cloudItems = await getLearningItemsFromCloud();
    const { getLearningItems } = await import('./storageService');
    const localItems = await getLearningItems();

    return {
      lastSyncTime: Date.now(),
      cloudItemCount: cloudItems.length,
      localItemCount: localItems.length
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      lastSyncTime: 0,
      cloudItemCount: 0,
      localItemCount: 0
    };
  }
}

/**
 * 执行完整同步
 */
export async function performFullSync(): Promise<{
  success: boolean;
  syncedItems: number;
  error?: string;
}> {
  if (isDemoMode) {
    console.log('Demo mode: skipping full sync');
    return {
      success: true,
      syncedItems: 0,
      error: 'Running in demo mode'
    };
  }

  try {
    if (!currentUser) {
      await initializeFirebase();
    }

    const { getLearningItems, saveLearningItems, getPendingSyncItems, clearPendingSync } = 
      await import('./storageService');

    // 1. 上传待同步的项目
    const pendingItems = await getPendingSyncItems();
    if (pendingItems.length > 0) {
      await syncLearningItemsToCloud(pendingItems);
      await clearPendingSync();
    }

    // 2. 下载云端项目并合并到本地
    const cloudItems = await getLearningItemsFromCloud();
    const localItems = await getLearningItems();

    // 简单的合并策略：以最新的 lastReviewedAt 为准
    const mergedItems = mergeItems(localItems, cloudItems);
    await saveLearningItems(mergedItems);

    return {
      success: true,
      syncedItems: mergedItems.length
    };
  } catch (error) {
    console.error('Full sync failed:', error);
    return {
      success: false,
      syncedItems: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 合并本地和云端数据
 */
function mergeItems(localItems: LearningItem[], cloudItems: LearningItem[]): LearningItem[] {
  const itemMap = new Map<string, LearningItem>();

  // 先添加本地项目
  localItems.forEach(item => {
    itemMap.set(item.id, item);
  });

  // 合并云端项目，以最新的为准
  cloudItems.forEach(cloudItem => {
    const localItem = itemMap.get(cloudItem.id);
    if (!localItem || cloudItem.lastReviewedAt > localItem.lastReviewedAt) {
      itemMap.set(cloudItem.id, cloudItem);
    }
  });

  return Array.from(itemMap.values());
}

/**
 * 检查 Firebase 连接状态
 */
export function isFirebaseConnected(): boolean {
  return currentUser !== null;
}

/**
 * 获取用户统计信息
 */
export async function getUserStats(): Promise<{
  totalItems: number;
  totalReviews: number;
  studyDays: number;
  lastActiveDate: string;
} | null> {
  if (isDemoMode || !currentUser) {
    // 在演示模式下返回模拟数据
    const { getLearningItems } = await import('./storageService');
    const items = await getLearningItems();
    
    return {
      totalItems: items.length,
      totalReviews: items.filter(item => item.lastReviewedAt > 0).length,
      studyDays: 0,
      lastActiveDate: ''
    };
  }

  try {
    const items = await getLearningItemsFromCloud();
    const totalReviews = items.filter(item => item.lastReviewedAt > 0).length;
    
    // 计算学习天数
    const reviewDates = items
      .filter(item => item.lastReviewedAt > 0)
      .map(item => new Date(item.lastReviewedAt).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index);

    const lastActiveDate = reviewDates.length > 0 
      ? reviewDates[reviewDates.length - 1] 
      : '';

    return {
      totalItems: items.length,
      totalReviews,
      studyDays: reviewDates.length,
      lastActiveDate
    };
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return null;
  }
}