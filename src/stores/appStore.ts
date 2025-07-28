import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { LearningItem, ReviewStats, SyncStatus } from '../types';
import { getLearningItems } from '../services/storageService';
import { getReviewStats, getTodayReviewItems } from '../services/reviewEngine';
import { getSyncStatus, isFirebaseConnected } from '../services/firebaseService';

/**
 * 应用主状态管理 - 统一管理学习数据和应用状态
 */

interface AppState {
  // 数据状态
  learningItems: LearningItem[];
  reviewQueue: LearningItem[];
  reviewStats: ReviewStats;
  syncStatus: SyncStatus;
  
  // UI 状态
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initializeApp: () => Promise<void>;
  loadLearningItems: () => Promise<void>;
  addLearningItem: (item: LearningItem) => void;
  updateLearningItem: (item: LearningItem) => void;
  removeLearningItem: (itemId: string) => void;
  refreshReviewQueue: () => void;
  refreshStats: () => void;
  refreshSyncStatus: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    learningItems: [],
    reviewQueue: [],
    reviewStats: {
      todayReviews: 0,
      pendingReviews: 0,
      totalItems: 0,
      upcomingReviews: 0,
      studyStreak: 0,
      progress: 0
    },
    syncStatus: {
      lastSyncTime: 0,
      cloudItemCount: 0,
      localItemCount: 0,
      isConnected: false,
      pendingSyncCount: 0
    },
    isLoading: false,
    isInitialized: false,
    error: null,

    // Actions
    initializeApp: async () => {
      const { setLoading, loadLearningItems, refreshSyncStatus } = get();
      
      try {
        setLoading(true);
        await loadLearningItems();
        await refreshSyncStatus();
        set({ isInitialized: true });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize app',
          isInitialized: true 
        });
      } finally {
        setLoading(false);
      }
    },

    loadLearningItems: async () => {
      try {
        const items = await getLearningItems();
        set({ learningItems: items });
        
        // 自动刷新相关数据
        const { refreshReviewQueue, refreshStats } = get();
        refreshReviewQueue();
        refreshStats();
      } catch (error) {
        console.error('Failed to load learning items:', error);
        set({ error: 'Failed to load learning items' });
      }
    },

    addLearningItem: (item: LearningItem) => {
      const { learningItems } = get();
      const newItems = [...learningItems, item];
      set({ learningItems: newItems });
      
      // 自动刷新相关数据
      const { refreshReviewQueue, refreshStats } = get();
      refreshReviewQueue();
      refreshStats();
    },

    updateLearningItem: (updatedItem: LearningItem) => {
      const { learningItems } = get();
      const newItems = learningItems.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      set({ learningItems: newItems });
      
      // 自动刷新相关数据
      const { refreshReviewQueue, refreshStats } = get();
      refreshReviewQueue();
      refreshStats();
    },

    removeLearningItem: (itemId: string) => {
      const { learningItems } = get();
      const newItems = learningItems.filter(item => item.id !== itemId);
      set({ learningItems: newItems });
      
      // 自动刷新相关数据
      const { refreshReviewQueue, refreshStats } = get();
      refreshReviewQueue();
      refreshStats();
    },

    refreshReviewQueue: () => {
      const { learningItems } = get();
      const reviewQueue = getTodayReviewItems(learningItems);
      set({ reviewQueue });
    },

    refreshStats: () => {
      const { learningItems } = get();
      const stats = getReviewStats(learningItems);
      
      // 计算学习进度和连续天数
      const reviewedItems = learningItems.filter(item => item.lastReviewedAt > 0).length;
      const progress = learningItems.length > 0 ? Math.round((reviewedItems / learningItems.length) * 100) : 0;
      
      // 计算连续学习天数
      const reviewDates = learningItems
        .filter(item => item.lastReviewedAt > 0)
        .map(item => new Date(item.lastReviewedAt).toDateString())
        .sort()
        .filter((date, index, arr) => arr.indexOf(date) === index);

      let studyStreak = 0;
      const today = new Date().toDateString();
      
      if (reviewDates.length > 0 && reviewDates[reviewDates.length - 1] === today) {
        studyStreak = 1;
        for (let i = reviewDates.length - 2; i >= 0; i--) {
          const currentDate = new Date(reviewDates[i + 1]);
          const prevDate = new Date(reviewDates[i]);
          const diffTime = currentDate.getTime() - prevDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          if (diffDays === 1) {
            studyStreak++;
          } else {
            break;
          }
        }
      }

      const reviewStats: ReviewStats = {
        ...stats,
        progress,
        studyStreak
      };
      
      set({ reviewStats });
    },

    refreshSyncStatus: async () => {
      try {
        const syncStatus = await getSyncStatus();
        const { getPendingSyncItems } = await import('../services/storageService');
        const pendingItems = await getPendingSyncItems();
        
        set({ 
          syncStatus: {
            ...syncStatus,
            isConnected: isFirebaseConnected(),
            pendingSyncCount: pendingItems.length
          }
        });
      } catch (error) {
        console.error('Failed to refresh sync status:', error);
      }
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);

// 订阅学习项目变化，自动更新相关数据
useAppStore.subscribe(
  (state) => state.learningItems,
  () => {
    const { refreshReviewQueue, refreshStats } = useAppStore.getState();
    refreshReviewQueue();
    refreshStats();
  }
);

// 导出便捷的选择器
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useLearningItems = () => useAppStore((state) => state.learningItems);
export const useReviewQueue = () => useAppStore((state) => state.reviewQueue);
export const useReviewStats = () => useAppStore((state) => state.reviewStats);
export const useSyncStatus = () => useAppStore((state) => state.syncStatus);
export const useAppError = () => useAppStore((state) => state.error);
export const useIsInitialized = () => useAppStore((state) => state.isInitialized);