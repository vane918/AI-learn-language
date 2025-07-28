/**
 * Content Script - 页面划词翻译功能
 * 轻量级实现，主要负责捕获选中文本和创建 UI 锚点
 */

// 直接包含消息服务功能，避免 ES6 模块导入问题

import { StreamTranslationChunk, AITranslationResponse } from '../types';

// 消息类型定义
interface ChromeMessage {
  action: string;
  data?: any;
  requestId?: string;
}

interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 生成请求 ID
function generateRequestId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 发送消息到 background script
async function sendMessageToBackground<T = any>(
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

// 翻译文本
async function translateText(text: string, context?: string) {
  const message = {
    action: 'translate',
    data: { text, context }
  };
  
  return sendMessageToBackground(message);
}

// 保存单词
async function saveWord(
  text: string,
  translation: string,
  type: 'word' | 'sentence',
  context?: string
) {
  const message = {
    action: 'saveWord',
    data: { text, translation, type, context }
  };
  
  return sendMessageToBackground(message);
}

// 翻译卡片和图标相关变量
let translationCard: HTMLElement | null = null;
let translationIcon: HTMLElement | null = null;
let isCardVisible = false;
let selectedText = '';
let selectionRange: Range | null = null;
let currentTranslationData: any = null;
let ignoreNextClick = false;

// 防抖定时器

// 初始化内容脚本
function initContentScript() {
  console.log('🚀 [initContentScript] 内容脚本开始初始化');
  
  // 绑定事件监听器
  console.log('🔗 [initContentScript] 绑定 mouseup 事件监听器');
  document.addEventListener('mouseup', processTextSelection);
  
  console.log('🔗 [initContentScript] 绑定 click 事件监听器');
  document.addEventListener('click', handleDocumentClick);
  
  console.log('🔗 [initContentScript] 绑定 keydown 事件监听器');
  document.addEventListener('keydown', handleKeyDown);
  
  // 添加消息监听器
  chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) => {
  if (message.action === 'translationChunk') {
    handleTranslationChunk(message.data);
    return true;
  }
  if (message.action === 'translationComplete') {
    handleTranslationComplete(message.data);
    return true;
  }
});
  
  // 清理函数
  window.addEventListener('beforeunload', cleanup);
  
  console.log('✅ [initContentScript] 内容脚本初始化完成');
}


// 处理文本选择的核心逻辑
function processTextSelection(event: MouseEvent) {
  console.log('🔍 [processTextSelection] 开始处理文本选择');
  console.log('🔍 [processTextSelection] 事件坐标:', event.pageX, event.pageY);
  console.log('🔍 [processTextSelection] 事件目标:', event.target);
  
  // 如果事件目标是翻译图标，忽略
  if (translationIcon && translationIcon.contains(event.target as Node)) {
    console.log('❌ [processTextSelection] 事件目标是翻译图标，忽略');
    return;
  }
  
  // 获取当前选择
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    console.log('❌ [processTextSelection] 没有文本选择');
    clearSelection();
    return;
  }
  
  const text = selection.toString().trim();
  console.log('📝 [processTextSelection] 选中的文本:', `"${text}"`);
  console.log('📏 [processTextSelection] 文本长度:', text.length);
  
  // 验证文本有效性
  if (!text || text.length === 0) {
    console.log('❌ [processTextSelection] 文本为空');
    clearSelection();
    return;
  }
  
  if (text.length > 200) {
    console.log('❌ [processTextSelection] 文本过长:', text.length);
    clearSelection();
    return;
  }
  
  // 检查是否是有意义的文本（不是纯空格或特殊字符）
  if (!/\w/.test(text)) {
    console.log('❌ [processTextSelection] 文本不包含有效字符');
    clearSelection();
    return;
  }
  
  // 更新选择状态
  selectedText = text;
  selectionRange = selection.getRangeAt(0).cloneRange();
  ignoreNextClick = true;
  
  console.log('✅ [processTextSelection] 文本选择有效，准备显示翻译图标');
  console.log('📍 [processTextSelection] 选择范围:', selectionRange.toString());
  
  // 隐藏之前的卡片，显示翻译图标
  setTimeout(() => {
    hideTranslationCard();
    showTranslationIcon(event);
  }, 0);
  
  console.log('✅ [processTextSelection] 处理完成');
}

// 显示翻译图标
function showTranslationIcon(event: MouseEvent) {
  console.log('🌟 [showTranslationIcon] 被调用');
  console.log('🔍 [showTranslationIcon] 当前 selectedText:', selectedText);
  console.log('🔍 [showTranslationIcon] 事件坐标:', event.pageX, event.pageY);
  
  // 先隐藏之前的图标
  hideTranslationIcon();
  
  // 创建翻译图标
  if (!translationIcon) {
    console.log('🔧 [showTranslationIcon] 创建翻译图标');
    createTranslationIcon();
  }

  if (!translationIcon) {
    console.log('❌ [showTranslationIcon] 翻译图标创建失败');
    return;
  }

  // 定位图标（基于鼠标位置）
  positionIcon(event);
  
  console.log('📍 [showTranslationIcon] 图标位置设置:', translationIcon.style.left, translationIcon.style.top);

  // 显示图标
  console.log('👁️ [showTranslationIcon] 设置 display: block');
  translationIcon.style.display = 'block';
  
  console.log('🔍 [showTranslationIcon] 图标是否在DOM中:', document.body.contains(translationIcon));
console.log('🔍 [showTranslationIcon] 图标样式 visibility:', translationIcon.style.visibility);
console.log('🔍 [showTranslationIcon] 图标样式 opacity:', translationIcon.style.opacity);
console.log('showTranslationIcon: Icon bounding rect:', translationIcon.getBoundingClientRect());
console.log('showTranslationIcon: Icon computed style visibility:', window.getComputedStyle(translationIcon).visibility);
console.log('showTranslationIcon: Icon computed style opacity:', window.getComputedStyle(translationIcon).opacity);
console.log('showTranslationIcon: Icon computed style display:', window.getComputedStyle(translationIcon).display);
console.log('✅ [showTranslationIcon] 图标显示完成');
setTimeout(() => {
  if (translationIcon) {
    console.log('⏰ [showTranslationIcon] 延迟检查 - Icon bounding rect:', translationIcon.getBoundingClientRect());
    console.log('⏰ [showTranslationIcon] 延迟检查 - Computed visibility:', window.getComputedStyle(translationIcon).visibility);
    console.log('⏰ [showTranslationIcon] 延迟检查 - Computed opacity:', window.getComputedStyle(translationIcon).opacity);
    console.log('⏰ [showTranslationIcon] 延迟检查 - Computed display:', window.getComputedStyle(translationIcon).display);
  }
}, 300);
}

// 创建翻译图标
function createTranslationIcon() {
  translationIcon = document.createElement('div');
  translationIcon.id = 'ai-translation-icon';
  translationIcon.innerHTML = `
    <div class="ai-icon-button" title="点击翻译">
      🌐
    </div>
  `;
  
  // 添加图标样式
  const iconStyle = document.createElement('style');
  iconStyle.id = 'ai-translation-icon-style';
  iconStyle.textContent = `
    #ai-translation-icon {
      position: absolute;
      z-index: 10001;
      display: none;
      animation: ai-icon-appear 0.2s ease-out;
    }
    
    @keyframes ai-icon-appear {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .ai-icon-button {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      border: 2px solid white;
    }
    
    .ai-icon-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    
    .ai-icon-button:active {
      transform: scale(0.95);
    }
  `;
  
  // 添加到页面
  if (!document.getElementById('ai-translation-icon-style')) {
    document.head.appendChild(iconStyle);
  }
  document.body.appendChild(translationIcon);
  
  // 添加点击事件
  const iconButton = translationIcon.querySelector('.ai-icon-button');
  iconButton?.addEventListener('click', handleIconClick);
}

// 处理图标点击
async function handleIconClick(event: Event) {
  console.log('🔍 [handleIconClick] 图标被点击了');
  console.log('🔍 [handleIconClick] 事件类型:', event.type);
  console.log('🔍 [handleIconClick] 事件目标:', event.target);
  
  event.stopPropagation();
  event.stopImmediatePropagation();
  event.preventDefault();
  
  console.log('🔍 [handleIconClick] 事件传播已阻止');
  
  console.log('📝 [handleIconClick] 当前选中文本:', selectedText);
  if (!selectedText) {
    console.log('❌ [handleIconClick] 没有选中文本，退出');
    return;
  }
  
  console.log('🚀 [handleIconClick] 开始显示翻译卡片');
  console.log('🔍 [handleIconClick] 当前 isCardVisible:', isCardVisible);
  
  // 隐藏图标，显示翻译卡片
  hideTranslationIcon();
  
  // 立即显示翻译卡片
  await showTranslationCard();
  
  console.log('✅ [handleIconClick] 图标点击处理完成');
  console.log('🔍 [handleIconClick] 处理完成后 isCardVisible:', isCardVisible);
}

// 定位图标（基于鼠标事件）
function positionIcon(event: MouseEvent) {
  if (!translationIcon) return;
  
  const iconSize = 32;
  const margin = 8;
  
  let x = event.pageX + margin;
  let y = event.pageY - iconSize - margin;
  
  const viewportWidth = window.innerWidth;
  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;
  
  // 确保图标不超出视窗
  if (x + iconSize > scrollX + viewportWidth) {
    x = event.pageX - iconSize - margin;
  }
  if (y < scrollY) {
    y = event.pageY + margin;
  }
  
  translationIcon.style.left = `${Math.max(scrollX + margin, x)}px`;
  translationIcon.style.top = `${Math.max(scrollY + margin, y)}px`;
}

// 隐藏翻译图标
function hideTranslationIcon() {
  if (translationIcon) {
    translationIcon.style.display = 'none';
  }
}

// 显示翻译卡片
let pendingChunks = '';

async function showTranslationCard() {
  try {
    console.log('🎯 [showTranslationCard] 开始执行');
    if (!selectedText) {
      console.log('❌ [showTranslationCard] selectedText 为空，退出');
      return;
    }
    
    if (!translationCard) {
      createTranslationCard();
    }
    
    if (!translationCard) return;
    
    positionCardBySelection();
    updateCardContent('正在翻译...', true);
    translationCard.style.display = 'block';
    isCardVisible = true;
    
    const context = getTextContext(selectedText);
    const initialResult = await translateText(selectedText, context);
    
    if (initialResult.success && initialResult.data?.streaming) {
      pendingChunks = '';
      // 等待流式更新
    } else if (initialResult.success && initialResult.data) {
      currentTranslationData = initialResult.data;
      updateCardContent(initialResult.data.translation, false);
    } else {
      updateCardContent(initialResult.error || '翻译失败', false);
    }
  } catch (error) {
    console.error('Translation error:', error);
    updateCardContent('翻译服务暂时不可用', false);
  }
}

function handleTranslationChunk(chunk: StreamTranslationChunk) {
  pendingChunks += chunk.content;
  updateCardContent(pendingChunks, !chunk.done);
}

function handleTranslationComplete(data: AITranslationResponse) {
  currentTranslationData = data;
  console.log('🔍 handleTranslationComplete:', data);
  let formattedContent = '';
  if (data.translation) {
    formattedContent += '<p>翻译</p>';
    formattedContent += `<p>${data.translation}</p>`;
  }
  if (data.wordType) {
    formattedContent += '<p>类型</p>';
    formattedContent += `<p>${data.wordType}</p>`;
  }
  if (data.pronunciation) {
    formattedContent += '<p>发音</p>';
    formattedContent += `<p>${data.pronunciation}</p>`;
  }
  if (data.explanation) {
    formattedContent += '<p>解析</p>';
    const explanations = data.explanation.split('\n- ').filter(Boolean);
    explanations.forEach(exp => {
      formattedContent += `<p>${exp.replace(/^- /, '')}</p>`;
    });
  }
  if (data.examples && data.examples.length > 0) {
    formattedContent += '<p>例句</p>';
    data.examples.forEach(example => {
      formattedContent += `<p>${example.replace(/\n/g, '<br>')}</p>`;
    });
  }
  updateCardContent(formattedContent, false);
}

// 创建翻译卡片DOM
function createTranslationCard() {
  translationCard = document.createElement('div');
  translationCard.id = 'ai-translation-card';
  translationCard.innerHTML = `
    <div class="ai-card-header">
      <span class="ai-card-title">AI 翻译</span>
      <button class="ai-card-close" title="关闭">×</button>
    </div>
    <div class="ai-card-content">
      <div class="ai-original-text"></div>
      <div class="ai-translation-text"></div>
      <div class="ai-card-actions">
        <button class="ai-save-btn" title="保存到单词本">📚 保存</button>
        <button class="ai-speak-btn" title="朗读">🔊</button>
      </div>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #ai-translation-card {
      position: absolute;
      z-index: 10000;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      max-width: 525px;
      min-width: 420px;
      display: none;
      backdrop-filter: blur(10px);
      animation: ai-card-appear 0.2s ease-out;
    }
    
    @keyframes ai-card-appear {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .ai-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }
    
    .ai-card-title {
      font-weight: 600;
      font-size: 13px;
    }
    
    .ai-card-close {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .ai-card-close:hover {
      background-color: rgba(255,255,255,0.2);
    }
    
    .ai-card-content {
      padding: 16px;
    }
    .ai-translation-text strong {
      color: #333;
    }
    .ai-translation-text ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    .ai-translation-text li {
      margin-bottom: 4px;
    }
    
    .ai-original-text {
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }
    
    .ai-translation-text {
      color: #555;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    
    .ai-card-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    .ai-save-btn, .ai-speak-btn, .ai-config-btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    
    .ai-save-btn:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .ai-speak-btn:hover {
      background: #28a745;
      color: white;
      border-color: #28a745;
    }
    
    .ai-config-btn {
      background: #ff9800;
      color: white;
      border-color: #ff9800;
    }
    
    .ai-config-btn:hover {
      background: #f57c00;
      border-color: #f57c00;
    }
    
    .ai-loading {
      color: #666;
      font-style: italic;
    }
    
    .ai-error {
      color: #dc3545;
    }
    
    .ai-phonetic {
      color: #666;
      font-size: 12px;
      margin-top: 4px;
    }
    
    .ai-word-type {
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 4px;
    }
    
    .ai-translation {
      font-weight: 500;
      color: #333;
      margin-bottom: 12px;
      font-size: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .ai-explanation {
      margin-top: 12px;
      margin-bottom: 8px;
      padding-top: 8px;
    }
    
    .ai-explanation-item {
      margin-bottom: 6px;
      line-height: 1.5;
      color: #555;
      font-size: 13px;
    }
    
    .ai-explanation-item:first-child {
      margin-top: 4px;
    }
    
    .ai-explanation-item:last-child {
      margin-bottom: 0;
    }
    
    .ai-examples {
      margin-top: 12px;
      margin-bottom: 8px;
    }
    
    .ai-examples-title {
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
      font-size: 13px;
    }
    
    .ai-example-item {
      margin-bottom: 4px;
      line-height: 1.4;
      color: #666;
      font-size: 12px;
      padding-left: 8px;
    }
    
    .ai-example-item:last-child {
      margin-bottom: 0;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(translationCard);
  
  // 绑定事件
  const closeBtn = translationCard.querySelector('.ai-card-close');
  const saveBtn = translationCard.querySelector('.ai-save-btn');
  const speakBtn = translationCard.querySelector('.ai-speak-btn');
  
  closeBtn?.addEventListener('click', hideTranslationCard);
  saveBtn?.addEventListener('click', handleSaveWord);
  speakBtn?.addEventListener('click', handleSpeak);
}


// 基于选择的文本位置定位翻译卡片
function positionCardBySelection() {
  console.log('📍 positionCardBySelection 开始执行');
  
  if (!translationCard) {
    console.log('❌ translationCard 不存在');
    return;
  }
  
  if (!selectionRange) {
    console.log('❌ selectionRange 不存在');
    return;
  }
  
  const rect = selectionRange.getBoundingClientRect();
  
  console.log('📏 选择文本的位置:', rect);
  
  const cardWidth = 525;
  const cardHeight = 200;
  const margin = 10;
  
  let x = rect.left + window.pageXOffset;
  let y = rect.bottom + window.pageYOffset + margin;
  
  // 确保卡片不超出视窗
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;
  
  // 如果右侧空间不够，向左调整
  if (x + cardWidth > scrollX + viewportWidth) {
    x = Math.max(scrollX + margin, rect.right + window.pageXOffset - cardWidth);
  }
  
  // 如果下方空间不够，显示在选择文本上方
  if (y + cardHeight > scrollY + viewportHeight) {
    y = rect.top + window.pageYOffset - cardHeight - margin;
  }
  
  // 确保不超出视窗边界
  x = Math.max(scrollX + margin, Math.min(x, scrollX + viewportWidth - cardWidth - margin));
  y = Math.max(scrollY + margin, y);
  
  console.log('📍 计算出的卡片位置:', { x, y });
  
  translationCard.style.left = `${x}px`;
  translationCard.style.top = `${y}px`;
  
  console.log('✅ 卡片位置设置完成');
}

// 更新卡片内容
function updateCardContent(content: string, isLoading: boolean) {
  console.log('🔍 updateCardContent:', content);
  if (!translationCard) return;
  
  const originalTextElem = translationCard.querySelector('.ai-original-text');
  if (originalTextElem) {
    originalTextElem.textContent = selectedText;
  }
  
  const translationElem = translationCard.querySelector('.ai-translation-text');
  if (translationElem) {
    translationElem.innerHTML = content;  // 使用innerHTML以支持格式化
  }
  
  // 更新保存按钮
  const saveBtn = translationCard.querySelector('.ai-save-btn') as HTMLButtonElement;
  if (saveBtn) {
    saveBtn.disabled = isLoading;
  }
  
  // 更新朗读按钮
  const speakBtn = translationCard.querySelector('.ai-speak-btn') as HTMLButtonElement;
  if (speakBtn) {
    speakBtn.disabled = isLoading;
  }
}

// 隐藏翻译卡片
function hideTranslationCard() {
  console.log('🙈 [hideTranslationCard] 开始隐藏翻译卡片');
  console.log('🔍 [hideTranslationCard] 当前 isCardVisible:', isCardVisible);
  console.log('🔍 [hideTranslationCard] translationCard 存在:', !!translationCard);
  
  if (translationCard) {
    console.log('🔍 [hideTranslationCard] 设置 display: none');
    translationCard.style.display = 'none';
  }
  isCardVisible = false;
  currentTranslationData = null;
  
  console.log('✅ [hideTranslationCard] 翻译卡片已隐藏，isCardVisible:', isCardVisible);
}

// 完全清空选择状态
function clearSelection() {
  console.log('🧹 [clearSelection] 开始清空选择状态');
  console.log('🔍 [clearSelection] 当前状态 - selectedText:', selectedText);
  console.log('🔍 [clearSelection] 当前状态 - isCardVisible:', isCardVisible);
  console.log('🔍 [clearSelection] 当前状态 - selectionRange:', !!selectionRange);
  
  selectedText = '';
  selectionRange = null;
  currentTranslationData = null;
  hideTranslationIcon();
  hideTranslationCard();
  
  console.log('✅ [clearSelection] 选择状态已清空');
}

// 处理文档点击
function handleDocumentClick(event: Event) {
  const target = event.target as HTMLElement;
  
  console.log('📄 [handleDocumentClick] 文档点击事件触发');
  console.log('🔍 [handleDocumentClick] 事件目标:', target.tagName, target.className);
  console.log('🔍 [handleDocumentClick] 事件类型:', event.type);
  console.log('🔍 [handleDocumentClick] 当前 isCardVisible:', isCardVisible);
  console.log('🔍 [handleDocumentClick] translationCard 存在:', !!translationCard);
  console.log('🔍 [handleDocumentClick] translationIcon 存在:', !!translationIcon);
  
  // 打印调用栈，帮助理解是什么触发了这个事件
  console.log('🔍 [handleDocumentClick] 调用栈:', new Error().stack);
  
  if (ignoreNextClick) {
    ignoreNextClick = false;
    console.log('❌ [handleDocumentClick] 忽略本次点击，因为它是选取操作后的自动点击');
    return;
  }
  
  // 如果点击的是翻译卡片内部，不隐藏
  if (translationCard && translationCard.contains(target)) {
    console.log('🎯 [handleDocumentClick] 点击了翻译卡片内部，不隐藏');
    return;
  }
  
  // 如果点击的是翻译图标，不隐藏
  if (translationIcon && translationIcon.contains(target)) {
    console.log('🎯 [handleDocumentClick] 点击了翻译图标，不隐藏');
    return;
  }
  
  // 完全清空选择状态
  console.log('🧹 [handleDocumentClick] 准备清空选择状态');
  clearSelection();
}

// 处理键盘事件
function handleKeyDown(event: KeyboardEvent) {
  // ESC键隐藏翻译卡片
  if (event.key === 'Escape') {
    hideTranslationCard();
  }
}


// 保存单词
async function handleSaveWord() {
  if (!selectedText) return;
  
  try {
    const saveBtn = translationCard?.querySelector('.ai-save-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.textContent = '保存中...';
      saveBtn.disabled = true;
    }
    
    const context = getTextContext(selectedText);
    
    const result = await saveWord(
      selectedText,
      currentTranslationData?.translation || '',
      'word',
      context
    );
    
    if (result.success) {
      if (saveBtn) {
        saveBtn.textContent = '✓ 已保存';
        saveBtn.style.background = '#28a745';
        saveBtn.style.color = 'white';
        saveBtn.style.borderColor = '#28a745';
      }
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.textContent = '📚 保存';
          saveBtn.style.background = '';
          saveBtn.style.color = '';
          saveBtn.style.borderColor = '';
          saveBtn.disabled = false;
        }
      }, 2000);
    } else {
      throw new Error(result.error || '保存失败');
    }
    
  } catch (error) {
    console.error('Save word error:', error);
    const saveBtn = translationCard?.querySelector('.ai-save-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.textContent = '保存失败';
      saveBtn.style.background = '#dc3545';
      saveBtn.style.color = 'white';
      saveBtn.disabled = false;
      
      setTimeout(() => {
        saveBtn.textContent = '📚 保存';
        saveBtn.style.background = '';
        saveBtn.style.color = '';
      }, 2000);
    }
  }
}

// 朗读单词
function handleSpeak() {
  if (!selectedText) return;
  
  try {
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Speech synthesis error:', error);
  }
}

// 获取文本上下文
function getTextContext(text: string): string {
  if (!selectionRange) return '';
  
  try {
    const container = selectionRange.commonAncestorContainer;
    const textNode = container.nodeType === Node.TEXT_NODE ? container : container.parentNode;
    
    if (textNode && textNode.textContent) {
      const fullText = textNode.textContent;
      const index = fullText.indexOf(text);
      
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(fullText.length, index + text.length + 50);
        return fullText.substring(start, end).trim();
      }
    }
  } catch (error) {
    console.error('Get context error:', error);
  }
  
  return '';
}

// 清理函数
function cleanup() {
  if (translationCard) {
    translationCard.remove();
    translationCard = null;
  }
  isCardVisible = false;
  selectedText = '';
  selectionRange = null;
  currentTranslationData = null;
}

// 初始化
initContentScript();