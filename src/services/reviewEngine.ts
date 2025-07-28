import { LearningItem, ReviewResult } from '../types';

/**
 * 艾宾浩斯记忆曲线复习引擎
 * 基于 SM-2 (SuperMemo 2) 算法实现
 */

// SM-2 算法的默认参数
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const INITIAL_INTERVAL = 1; // 首次复习间隔（天）

/**
 * 根据复习结果更新学习项目的复习参数
 * @param item 学习项目
 * @param result 复习结果
 * @returns 更新后的学习项目
 */
export function updateItemAfterReview(item: LearningItem, result: ReviewResult): LearningItem {
  const now = Date.now();
  let newInterval = item.interval;
  let newEaseFactor = item.easeFactor;

  // SM-2 算法核心逻辑
  if (result.quality >= 3) {
    // 回答正确
    if (item.interval === 0) {
      newInterval = 1;
    } else if (item.interval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(item.interval * newEaseFactor);
    }
  } else {
    // 回答错误，重置间隔
    newInterval = 1;
  }

  // 更新记忆因子
  newEaseFactor = newEaseFactor + (0.1 - (5 - result.quality) * (0.08 + (5 - result.quality) * 0.02));
  
  // 确保记忆因子不低于最小值
  if (newEaseFactor < MIN_EASE_FACTOR) {
    newEaseFactor = MIN_EASE_FACTOR;
  }

  // 计算下次复习时间
  const nextReviewAt = now + (newInterval * 24 * 60 * 60 * 1000);

  return {
    ...item,
    lastReviewedAt: now,
    nextReviewAt,
    interval: newInterval,
    easeFactor: newEaseFactor
  };
}

/**
 * 创建新的学习项目
 * @param content 学习内容
 * @param translation 翻译
 * @param type 类型
 * @param context 上下文
 * @param userId 用户ID
 * @returns 新的学习项目
 */
export function createLearningItem(
  content: string,
  translation: string,
  type: 'word' | 'sentence',
  context?: string,
  userId: string = 'local'
): LearningItem {
  const now = Date.now();
  
  return {
    id: generateId(),
    type,
    content,
    translation,
    context,
    createdAt: now,
    lastReviewedAt: 0,
    nextReviewAt: now + (INITIAL_INTERVAL * 24 * 60 * 60 * 1000),
    interval: INITIAL_INTERVAL,
    easeFactor: DEFAULT_EASE_FACTOR,
    userId
  };
}

/**
 * 获取今天需要复习的项目
 * @param items 所有学习项目
 * @returns 需要复习的项目列表
 */
export function getTodayReviewItems(items: LearningItem[]): LearningItem[] {
  const now = Date.now();
  return items.filter(item => item.nextReviewAt <= now);
}

/**
 * 获取复习统计信息
 * @param items 所有学习项目
 * @returns 统计信息
 */
export function getReviewStats(items: LearningItem[]) {
  const now = Date.now();
  const today = new Date().toDateString();
  
  const todayReviews = items.filter(item => 
    new Date(item.lastReviewedAt).toDateString() === today
  ).length;
  
  const pendingReviews = items.filter(item => item.nextReviewAt <= now).length;
  
  const totalItems = items.length;
  
  const upcomingReviews = items.filter(item => {
    const reviewDate = new Date(item.nextReviewAt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return reviewDate.toDateString() === tomorrow.toDateString();
  }).length;

  return {
    todayReviews,
    pendingReviews,
    totalItems,
    upcomingReviews
  };
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 计算学习进度
 * @param items 学习项目列表
 * @returns 进度百分比 (0-100)
 */
export function calculateProgress(items: LearningItem[]): number {
  if (items.length === 0) return 0;
  
  const reviewedItems = items.filter(item => item.lastReviewedAt > 0).length;
  return Math.round((reviewedItems / items.length) * 100);
}

/**
 * 获取学习连续天数
 * @param items 学习项目列表
 * @returns 连续学习天数
 */
export function getStudyStreak(items: LearningItem[]): number {
  const reviewDates = items
    .filter(item => item.lastReviewedAt > 0)
    .map(item => new Date(item.lastReviewedAt).toDateString())
    .sort()
    .filter((date, index, arr) => arr.indexOf(date) === index); // 去重

  if (reviewDates.length === 0) return 0;

  let streak = 1;
  const today = new Date().toDateString();
  
  if (reviewDates[reviewDates.length - 1] !== today) {
    return 0; // 今天没有学习
  }

  for (let i = reviewDates.length - 2; i >= 0; i--) {
    const currentDate = new Date(reviewDates[i + 1]);
    const prevDate = new Date(reviewDates[i]);
    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}