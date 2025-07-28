import { create } from 'zustand';
import { UIState } from '../types';

/**
 * 全局 UI 状态管理 (Zustand)
 */

interface UIStore extends UIState {
  // Actions
  setLoading: (loading: boolean) => void;
  setCurrentPage: (page: UIState['currentPage']) => void;
  setSelectedItem: (item: UIState['selectedItem']) => void;
  setReviewQueue: (queue: UIState['reviewQueue']) => void;
  
  // Computed
  hasReviewItems: () => boolean;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  isLoading: false,
  currentPage: 'home',
  selectedItem: null,
  reviewQueue: [],
  
  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setReviewQueue: (queue) => set({ reviewQueue: queue }),
  
  // Computed
  hasReviewItems: () => get().reviewQueue.length > 0,
}));