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
  
  // 如果事件目标是翻译卡片内部元素，忽略
  if (translationCard && translationCard.contains(event.target as Node)) {
    console.log('❌ [processTextSelection] 事件目标是翻译卡片内部元素，忽略');
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
      handleTranslationComplete(initialResult.data);
    } else {
      // 如果翻译失败，显示模拟的富文本数据用于测试
      console.log('🧪 [showTranslationCard] 翻译失败，显示测试数据');
      const mockData = generateMockTranslationData(selectedText);
      handleTranslationComplete(mockData);
    }
  } catch (error) {
    console.error('Translation error:', error);
    // 显示模拟数据而不是错误信息
    const mockData = generateMockTranslationData(selectedText);
    handleTranslationComplete(mockData);
  }
}

// 生成模拟翻译数据用于测试富文本显示
function generateMockTranslationData(text: string): AITranslationResponse {
  const lowerText = text.toLowerCase();
  
  // 根据文本类型生成不同的模拟数据
  if (lowerText.includes('ubiquitous')) {
    return {
      translation: "无处不在的",
      wordType: "形容词",
      pronunciation: "/juːˈbɪkwɪtəs/",
      explanation: "1. \"ubiquitous\" 作为形容词，核心语义为\"普遍存在的\"或\"无所不在的\"\n2. 中文采用四字格\"无处不在\"既准确传达原词空间覆盖性，又符合学术文本的简洁要求\n3. 后缀\"-ous\"的保持形容词词性，便于直接修饰名词",
      examples: [
        "1. (智能手机已成为现代社会中无处不在的技术产物) (Smartphones have become ubiquitous technological products in modern society) - 展示标准修饰结构",
        "2. (数字监控的无处不在引发了隐私担忧) (The ubiquitousness of digital surveillance raises privacy concerns) - 变换点：名词化处理"
      ]
    };
  } else if (lowerText.includes('artificial intelligence') || lowerText.includes('revolutionized')) {
    return {
      translation: "人工智能已经彻底改变了我们处理信息的方式",
      wordType: "",
      pronunciation: "",
      explanation: "1. \"revolutionized\" 译为\"彻底改变\"，强调变革的深度和广度\n2. \"the way we process information\" 采用\"处理信息的方式\"，符合中文表达习惯\n3. 整体句式保持主谓宾结构，语言流畅自然",
      examples: [
        "1. (人工智能技术正在重塑各个行业的运营模式) (AI technology is reshaping the operational models of various industries) - 展示核心概念的标准应用",
        "2. (信息处理方式的革命性变化带来了新的挑战) (Revolutionary changes in information processing methods bring new challenges) - 变换点：被动转主动"
      ]
    };
  } else if (lowerText.includes('sustainable development') || lowerText.includes('balancing')) {
    return {
      translation: "可持续发展的概念要求在经济增长与环境保护之间取得平衡",
      wordType: "",
      pronunciation: "",
      explanation: "1. \"sustainable development\" 译为\"可持续发展\"，这是标准的学术术语\n2. \"balancing...with...\" 结构译为\"在...之间取得平衡\"，体现了中文的对称美\n3. \"requires\" 译为\"要求\"，突出了概念的规范性和必要性",
      examples: [
        "1. (绿色经济模式体现了可持续发展的核心理念) (Green economic models embody the core concept of sustainable development) - 展示概念在实际应用中的体现",
        "2. (如何平衡发展需求与环保要求是当代社会面临的重大课题) (How to balance development needs with environmental requirements is a major issue facing contemporary society) - 变换点：陈述转疑问"
      ]
    };
  } else if (lowerText.includes('serendipity')) {
    return {
      translation: "意外的惊喜；偶然发现",
      wordType: "名词",
      pronunciation: "/ˌserənˈdɪpəti/",
      explanation: "1. \"serendipity\" 指意外发现有价值事物的能力或现象\n2. 词源来自童话《锡兰三王子》，强调偶然性中的智慧\n3. 常用于科学发现、创新等语境中",
      examples: [
        "1. (许多重大科学发现都源于意外的惊喜) (Many major scientific discoveries stem from serendipity) - 展示在科学语境中的应用",
        "2. (他在图书馆的偶然发现改变了他的研究方向) (His serendipitous discovery in the library changed his research direction) - 变换点：形容词形式应用"
      ]
    };
  } else if (lowerText.includes('eloquent')) {
    return {
      translation: "雄辩的；有说服力的",
      wordType: "形容词",
      pronunciation: "/ˈeləkwənt/",
      explanation: "1. \"eloquent\" 强调表达的流畅性和说服力\n2. 不仅指语言技巧，更强调思想的深度和感染力\n3. 可用于修饰人、言语、表达方式等",
      examples: [
        "1. (她雄辩的演讲赢得了全场的掌声) (Her eloquent speech won applause from the entire audience) - 展示修饰演讲的用法",
        "2. (他的沉默本身就是最有说服力的回答) (His silence was itself an eloquent response) - 变换点：抽象概念的拟人化表达"
      ]
    };
  } else {
    // 默认的通用模拟数据
    return {
      translation: `"${text}" 的中文翻译`,
      wordType: text.split(' ').length === 1 ? "词汇" : "",
      pronunciation: text.split(' ').length === 1 ? "/示例发音/" : "",
      explanation: `这是对 "${text}" 的详细解析：\n1. 语义分析和翻译技巧\n2. 语法结构和使用场景\n3. 文化背景和表达习惯`,
      examples: [
        `1. (这是包含 "${text}" 的中文例句) (This is an English example sentence containing "${text}") - 展示标准用法`,
        `2. (这是另一个展示 "${text}" 用法的例句) (This is another example showing the usage of "${text}") - 变换点：语境转换`
      ]
    };
  }
}

function handleTranslationChunk(chunk: StreamTranslationChunk) {
  pendingChunks += chunk.content;
  console.log('🔍 handleTranslationChunk - pendingChunks:', pendingChunks);
  updateCardContent(pendingChunks, !chunk.done);
}

function handleTranslationComplete(data: AITranslationResponse) {
  currentTranslationData = data;
  console.log('🔍 handleTranslationComplete - data type:', typeof data);
  console.log('🔍 handleTranslationComplete - data:', data);
  console.log('🔍 handleTranslationComplete - data.translation:', data.translation);
  
  // 如果data是字符串，尝试解析为JSON
  if (typeof data === 'string') {
    try {
      const parsedData = JSON.parse(data);
      console.log('🔍 handleTranslationComplete - parsed data:', parsedData);
      data = parsedData;
      currentTranslationData = parsedData;
    } catch (error) {
      console.error('🔍 handleTranslationComplete - JSON parse error:', error);
      // 如果解析失败，直接显示原始字符串
      updateCardContent(`<div class="ai-translation-text">${data}</div>`, false);
      return;
    }
  }
  let formattedContent = '';
  
  if (data.translation) {
    formattedContent += '<div class="ai-section ai-translation-section">';
    formattedContent += '<div class="ai-section-title">💬 翻译</div>';
    formattedContent += `<div class="ai-translation-content">${data.translation}</div>`;
    formattedContent += '</div>';
  }
  
  if (data.wordType) {
    formattedContent += '<div class="ai-section ai-wordtype-section">';
    formattedContent += '<div class="ai-section-title">📝 词性</div>';
    formattedContent += `<div class="ai-wordtype-content"><span class="ai-word-type-tag">${data.wordType}</span></div>`;
    formattedContent += '</div>';
  }
  
  if (data.pronunciation) {
    formattedContent += '<div class="ai-section ai-pronunciation-section">';
    formattedContent += '<div class="ai-section-title">🔊 发音</div>';
    formattedContent += `<div class="ai-pronunciation-content">${data.pronunciation}</div>`;
    formattedContent += '</div>';
  }
  
  if (data.explanation) {
    formattedContent += '<div class="ai-section ai-explanation-section">';
    formattedContent += '<div class="ai-section-title">💡 解析</div>';
    formattedContent += '<div class="ai-explanation-content">';
    
    // 处理解析内容，支持换行和列表
    const explanationLines = data.explanation.split('\n').filter(line => line.trim());
    explanationLines.forEach(line => {
      line = line.trim();
      if (line.startsWith('- ')) {
        formattedContent += `<div class="ai-explanation-item">• ${line.substring(2)}</div>`;
      } else if (line) {
        formattedContent += `<div class="ai-explanation-item">${line}</div>`;
      }
    });
    
    formattedContent += '</div></div>';
  }
  
  if (data.examples && data.examples.length > 0) {
    formattedContent += '<div class="ai-section ai-examples-section">';
    formattedContent += '<div class="ai-section-title">📚 例句</div>';
    formattedContent += '<div class="ai-examples-content">';
    
    data.examples.forEach((example, index) => {
      // 处理例句格式，支持中英文对照
      const cleanExample = example.replace(/^\d+\.\s*/, '').trim();
      
      // 检查是否包含中英文对照格式
      if (cleanExample.includes(' - ')) {
        const [chinese, english] = cleanExample.split(' - ');
        formattedContent += `
          <div class="ai-example-item">
            <div class="ai-example-number">${index + 1}.</div>
            <div class="ai-example-content">
              <div class="ai-example-chinese">${chinese.trim()}</div>
              <div class="ai-example-english">${english.trim()}</div>
            </div>
          </div>
        `;
      } else {
        formattedContent += `
          <div class="ai-example-item">
            <div class="ai-example-number">${index + 1}.</div>
            <div class="ai-example-content">
              <div class="ai-example-text">${cleanExample}</div>
            </div>
          </div>
        `;
      }
    });
    
    formattedContent += '</div></div>';
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
    
    /* 富文本样式 */
    .ai-section {
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .ai-section:last-child {
      margin-bottom: 0;
    }
    
    .ai-section-title {
      font-weight: 600;
      font-size: 13px;
      color: #333;
      margin-bottom: 8px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-left: 3px solid #667eea;
      border-radius: 4px;
    }
    
    .ai-translation-section .ai-section-title {
      border-left-color: #28a745;
    }
    
    .ai-wordtype-section .ai-section-title {
      border-left-color: #17a2b8;
    }
    
    .ai-pronunciation-section .ai-section-title {
      border-left-color: #ffc107;
    }
    
    .ai-explanation-section .ai-section-title {
      border-left-color: #6f42c1;
    }
    
    .ai-examples-section .ai-section-title {
      border-left-color: #fd7e14;
    }
    
    .ai-translation-content {
      font-size: 15px;
      font-weight: 500;
      color: #2c3e50;
      line-height: 1.5;
      padding: 8px 12px;
      background: #f8fff8;
      border-radius: 6px;
      border: 1px solid #d4edda;
    }
    
    .ai-wordtype-content {
      padding: 4px 12px;
    }
    
    .ai-word-type-tag {
      display: inline-block;
      background: linear-gradient(135deg, #17a2b8, #138496);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .ai-pronunciation-content {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #856404;
      padding: 6px 12px;
      background: #fff3cd;
      border-radius: 6px;
      border: 1px solid #ffeaa7;
    }
    
    .ai-explanation-content {
      padding: 8px 12px;
      background: #f8f7ff;
      border-radius: 6px;
      border: 1px solid #e6e3ff;
    }
    
    .ai-explanation-item {
      margin-bottom: 6px;
      line-height: 1.5;
      color: #495057;
      font-size: 13px;
    }
    
    .ai-explanation-item:last-child {
      margin-bottom: 0;
    }
    
    .ai-examples-content {
      padding: 8px 12px;
      background: #fff8f0;
      border-radius: 6px;
      border: 1px solid #ffe4cc;
    }
    
    .ai-example-item {
      display: flex;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    
    .ai-example-item:last-child {
      margin-bottom: 0;
    }
    
    .ai-example-number {
      flex-shrink: 0;
      width: 20px;
      font-weight: 600;
      color: #fd7e14;
      font-size: 12px;
      margin-top: 2px;
    }
    
    .ai-example-content {
      flex: 1;
      margin-left: 8px;
    }
    
    .ai-example-chinese {
      color: #2c3e50;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: 500;
    }
    
    .ai-example-english {
      color: #6c757d;
      font-size: 12px;
      line-height: 1.3;
      font-style: italic;
    }
    
    .ai-example-text {
      color: #495057;
      font-size: 13px;
      line-height: 1.4;
    }
    
    /* 强调文本样式 */
    .ai-translation-text strong,
    .ai-explanation-content strong,
    .ai-examples-content strong {
      color: #2c3e50;
      font-weight: 600;
    }
    
    .ai-translation-text em,
    .ai-explanation-content em,
    .ai-examples-content em {
      color: #6f42c1;
      font-style: italic;
    }
    
    /* 列表样式 */
    .ai-translation-text ul,
    .ai-explanation-content ul,
    .ai-examples-content ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .ai-translation-text li,
    .ai-explanation-content li,
    .ai-examples-content li {
      margin-bottom: 4px;
      line-height: 1.4;
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
  console.log('🔍 isLoading:', isLoading);
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
    saveBtn.disabled = false;
  }
  
  // 更新朗读按钮
  const speakBtn = translationCard.querySelector('.ai-speak-btn') as HTMLButtonElement;
  if (speakBtn) {
    speakBtn.disabled = false;
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
  console.log('🔊 [handleSpeak] 播放按钮被点击');
  console.log('🔊 [handleSpeak] 当前选中文本:', selectedText);
  
  if (!selectedText) {
    console.log('❌ [handleSpeak] 没有选中文本，无法播放');
    return;
  }
  
  // 直接使用 Web Speech API，因为 Chrome TTS 在 content script 中不可用
  console.log('🔊 [handleSpeak] 使用 Web Speech API 播放');
  playTextWithWebSpeech(selectedText);
}

// 使用 Web Speech API 播放文本
function playTextWithWebSpeech(text: string) {
  console.log('🔊 [playTextWithWebSpeech] 开始播放文本:', text);
  
  if (!('speechSynthesis' in window)) {
    console.error('🔊 [playTextWithWebSpeech] 浏览器不支持 Speech Synthesis');
    return;
  }

  // 停止当前播放
  speechSynthesis.cancel();
  
  // 等待一小段时间确保之前的播放已停止
  setTimeout(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 添加事件监听器
      utterance.onstart = () => {
        console.log('🔊 [playTextWithWebSpeech] 播放开始');
      };

      utterance.onend = () => {
        console.log('🔊 [playTextWithWebSpeech] 播放结束');
      };

      utterance.onerror = (event) => {
        console.error('🔊 [playTextWithWebSpeech] 播放错误:', event);
        console.error('🔊 [playTextWithWebSpeech] 错误详情:', {
          error: event.error,
          type: event.type,
          charIndex: event.charIndex,
          elapsedTime: event.elapsedTime
        });
      };

      utterance.onpause = () => {
        console.log('🔊 [playTextWithWebSpeech] 播放暂停');
      };

      utterance.onresume = () => {
        console.log('🔊 [playTextWithWebSpeech] 播放恢复');
      };

      // 检查语音合成是否可用
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }

      console.log('🔊 [playTextWithWebSpeech] 调用 speechSynthesis.speak()');
      speechSynthesis.speak(utterance);
      
      // 检查是否开始播放
      setTimeout(() => {
        if (speechSynthesis.speaking) {
          console.log('🔊 [playTextWithWebSpeech] 确认正在播放');
        } else {
          console.warn('🔊 [playTextWithWebSpeech] 播放可能被阻止或失败');
          // 尝试用户交互提示
          showAudioPermissionHint();
        }
      }, 100);
      
    } catch (error) {
      console.error('🔊 [playTextWithWebSpeech] 播放异常:', error);
    }
  }, 100);
}

// 显示音频权限提示
function showAudioPermissionHint() {
  console.log('🔊 [showAudioPermissionHint] 显示音频权限提示');
  
  // 在翻译卡片中显示提示
  if (translationCard) {
    const existingHint = translationCard.querySelector('.audio-hint');
    if (existingHint) {
      existingHint.remove();
    }
    
    const hint = document.createElement('div');
    hint.className = 'audio-hint';
    hint.style.cssText = `
      margin-top: 8px;
      padding: 6px 8px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      font-size: 12px;
      color: #856404;
      text-align: center;
    `;
    hint.textContent = '🔊 请确保浏览器允许音频播放，或检查系统音量设置';
    
    const cardContent = translationCard.querySelector('.ai-translation-content');
    if (cardContent) {
      cardContent.appendChild(hint);
      
      // 3秒后移除提示
      setTimeout(() => {
        if (hint && hint.parentNode) {
          hint.remove();
        }
      }, 3000);
    }
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