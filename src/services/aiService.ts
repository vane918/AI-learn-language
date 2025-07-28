import { AIProviderConfig, AITranslationRequest, AITranslationResponse } from '../types';

// 重新导出类型以供其他模块使用
export type { AITranslationRequest, AITranslationResponse };

/**
 * AI 服务适配器 - 统一处理不同 AI 提供商的 API 调用
 * 在 background 脚本中使用，确保 API Key 安全性
 */

// AI 提供商配置
import { StreamTranslationChunk } from '../types';
const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的英汉翻译专家。请将用户提供的英文内容翻译成地道、简洁的学术化中文。

你必须严格按照以下JSON格式返回结果，不要添加任何其他内容：

{
  "translation": "中文翻译结果",
  "wordType": "词性（仅对单个词汇提供，如：名词、动词、形容词等；短语或句子则为空字符串）",
  "pronunciation": "发音（仅对单个词汇提供国际音标，如：/ˈeksəmpl/；短语或句子则为空字符串）",
  "explanation": "解析说明（关键点、翻译技巧、难点处理等，用\\n分隔多个要点）",
  "examples": [
    "中文例句1 (English example sentence 1) - 展示标准用法",
    "中文例句2 (English example sentence 2) - 变换点：说明变换类型"
  ]
}

要求：
1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯
2. 词性和发音仅对单个英文词汇提供，短语和句子留空
3. 解析要简明扼要，突出核心信息处理
4. 例句必须是完整的中英文对照
5. 严格返回有效的JSON格式，确保可以被JSON.parse()解析
6. 避免使用俚语、网络流行语，保持学术风格`
        },
        {
          role: 'user',
          content: `请翻译: "${request.text}"${request.context ? `\n上下文: "${request.context}"` : ''}`
        }
      ]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.choices[0].message.content),
  },

  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      model: 'deepseek-v3',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的英汉翻译专家。请将用户提供的英文内容翻译成地道、简洁的学术化中文。

你必须严格按照以下JSON格式返回结果，不要添加任何其他内容：

{
  "translation": "中文翻译结果",
  "wordType": "词性（仅对单个词汇提供，如：名词、动词、形容词等；短语或句子则为空字符串）",
  "pronunciation": "发音（仅对单个词汇提供国际音标，如：/ˈeksəmpl/；短语或句子则为空字符串）",
  "explanation": "解析说明（关键点、翻译技巧、难点处理等，用\\n分隔多个要点）",
  "examples": [
    "中文例句1 (English example sentence 1) - 展示标准用法",
    "中文例句2 (English example sentence 2) - 变换点：说明变换类型"
  ]
}

要求：
1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯
2. 词性和发音仅对单个英文词汇提供，短语和句子留空
3. 解析要简明扼要，突出核心信息处理
4. 例句必须是完整的中英文对照
5. 严格返回有效的JSON格式，确保可以被JSON.parse()解析
6. 避免使用俚语、网络流行语，保持学术风格`
        },
        {
          role: 'user',
          content: `请翻译: "${request.text}"${request.context ? `\n上下文: "${request.context}"` : ''}`
        }
      ]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.choices[0].message.content),
  },

  gemini: {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      contents: [{
        parts: [{
          text: `你是一位专业的英汉翻译专家。请将用户提供的英文内容翻译成地道、简洁的学术化中文。

你必须严格按照以下JSON格式返回结果，不要添加任何其他内容：

{
  "translation": "中文翻译结果",
  "wordType": "词性（仅对单个词汇提供，如：名词、动词、形容词等；短语或句子则为空字符串）",
  "pronunciation": "发音（仅对单个词汇提供国际音标，如：/ˈeksəmpl/；短语或句子则为空字符串）",
  "explanation": "解析说明（关键点、翻译技巧、难点处理等，用\\n分隔多个要点）",
  "examples": [
    "中文例句1 (English example sentence 1) - 展示标准用法",
    "中文例句2 (English example sentence 2) - 变换点：说明变换类型"
  ]
}

要求：
1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯
2. 词性和发音仅对单个英文词汇提供，短语和句子留空
3. 解析要简明扼要，突出核心信息处理
4. 例句必须是完整的中英文对照
5. 严格返回有效的JSON格式，确保可以被JSON.parse()解析
6. 避免使用俚语、网络流行语，保持学术风格

待翻译英文原文： [<<<${request.text}>>>]${request.context ? `\n上下文: "${request.context}"` : ''}`
        }]
      }]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.candidates[0].content.parts[0].text),
  },

  qwen: {
    name: 'Qwen (通义千问)',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      model: 'qwen-mt-plus',
      messages: [
        {
          role: 'user',
          content: request.text
        }
      ],
      extra_body: {
        translation_options: {
          source_lang: 'auto',
          target_lang: 'Chinese',
          domains: "The sentence is from Ali Cloud IT domain. It mainly involves computer-related software development and usage methods, including many terms related to computer software and hardware. Pay attention to professional troubleshooting terminologies and sentence patterns when translating. Translate into this IT domain style."
        }
      }
    }),
    responseParser: (response: any): AITranslationResponse => {
      // Qwen-MT 返回的是直接的翻译结果，需要转换为我们的格式
      const translation = response.choices[0].message.content;
      return {
        translation: translation,
        wordType: '',
        pronunciation: '',
        explanation: '',
        examples: []
      };
    },
  },

  "qwen-plus": {
    name: 'Qwen (通义千问)',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的英汉翻译专家。请将用户提供的英文内容翻译成地道、简洁的学术化中文。

你必须严格按照以下JSON格式返回结果，不要添加任何其他内容：

{
  "translation": "中文翻译结果",
  "wordType": "词性（仅对单个词汇提供，如：名词、动词、形容词等；短语或句子则为空字符串）",
  "pronunciation": "发音（仅对单个词汇提供国际音标，如：/ˈeksəmpl/；短语或句子则为空字符串）",
  "explanation": "解析说明（关键点、翻译技巧、难点处理等，用\\n分隔多个要点）",
  "examples": [
    "中文例句1 (English example sentence 1) - 展示标准用法",
    "中文例句2 (English example sentence 2) - 变换点：说明变换类型"
  ]
}

要求：
1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯
2. 词性和发音仅对单个英文词汇提供，短语和句子留空
3. 解析要简明扼要，突出核心信息处理
4. 例句必须是完整的中英文对照
5. 严格返回有效的JSON格式，确保可以被JSON.parse()解析
6. 避免使用俚语、网络流行语，保持学术风格`
        },
        {
          role: 'user',
          content: `请翻译: "${request.text}"${request.context ? `\n上下文: "${request.context}"` : ''}`
        }
      ]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.choices[0].message.content),
  }
};

/**
 * 调用 AI API 进行翻译
 */
export function parseFormattedResponse(text: string): AITranslationResponse {
  console.log('🔍 [parseFormattedResponse] Input text:', text);
  console.log('🔍 [parseFormattedResponse] Input type:', typeof text);
  
  try {
    // 清理文本，移除可能的markdown代码块标记
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('🔍 [parseFormattedResponse] Cleaned text:', cleanText);
    
    // 尝试直接解析JSON
    const jsonData = JSON.parse(cleanText);
    console.log('🔍 [parseFormattedResponse] Parsed JSON:', jsonData);
    
    const result = {
      translation: jsonData.translation || '',
      wordType: jsonData.wordType || '',
      pronunciation: jsonData.pronunciation || '',
      explanation: jsonData.explanation || '',
      examples: Array.isArray(jsonData.examples) ? jsonData.examples.filter((ex: string) => ex.trim()) : []
    };
    
    console.log('🔍 [parseFormattedResponse] Final result:', result);
    return result;
  } catch (error) {
    console.warn('🔍 [parseFormattedResponse] Failed to parse JSON response, falling back to text parsing:', error);
    
    // 如果JSON解析失败，回退到原来的文本解析方式
    const lines = text.split('\n');
    let translation = '';
    let wordType = '';
    let pronunciation = '';
    let explanation = '';
    let examples: string[] = [];
    let currentSection = '';
    
    for (let line of lines) {
      line = line.trim();
      
      // 跳过空行
      if (!line) {
        continue;
      }
      
      // 匹配各个部分的标题
      if (line.startsWith('翻译：') || line.startsWith('### 翻译：')) {
        const content = line.replace(/###?\s*翻译：\s*/, '').trim();
        if (content) {
          translation = content;
        }
        currentSection = 'translation';
      } else if (line.startsWith('词性：') || line.startsWith('### 词性：')) {
        const content = line.replace(/###?\s*词性：\s*/, '').trim();
        if (content) {
          wordType = content;
        }
        currentSection = 'wordType';
      } else if (line.startsWith('发音：') || line.startsWith('### 发音：')) {
        const content = line.replace(/###?\s*发音：\s*/, '').trim();
        if (content) {
          pronunciation = content;
        }
        currentSection = 'pronunciation';
      } else if (line.startsWith('解析：') || line.startsWith('### 解析：')) {
        const content = line.replace(/###?\s*解析：\s*/, '').trim();
        if (content) {
          explanation = content;
        }
        currentSection = 'explanation';
      } else if (line.startsWith('例句：') || line.startsWith('### 例句：')) {
        const content = line.replace(/###?\s*例句：\s*/, '').trim();
        if (content) {
          examples.push(content);
        }
        currentSection = 'examples';
      } else if (currentSection) {
        // 处理各部分的内容
        switch (currentSection) {
          case 'translation':
            if (!translation) {
              translation = line;
            } else {
              translation += ' ' + line;
            }
            break;
          case 'wordType':
            if (!wordType) {
              wordType = line;
            } else {
              wordType += ' ' + line;
            }
            break;
          case 'pronunciation':
            if (!pronunciation) {
              pronunciation = line;
            } else {
              pronunciation += ' ' + line;
            }
            break;
          case 'explanation':
            if (!explanation) {
              explanation = line;
            } else {
              explanation += '\n' + line;
            }
            break;
          case 'examples':
            if (line) {
              examples.push(line);
            }
            break;
        }
      } else {
        // 如果没有明确的section，但是内容看起来像翻译结果，就当作翻译处理
        if (!translation && !currentSection) {
          translation = line;
          currentSection = 'translation';
        }
      }
    }
    
    const fallbackResult = { 
      translation: translation.trim(), 
      wordType: wordType.trim(), 
      pronunciation: pronunciation.trim(), 
      explanation: explanation.trim(), 
      examples: examples.filter(ex => ex.trim()) 
    };
    
    console.log('🔍 [parseFormattedResponse] Fallback result:', fallbackResult);
    return fallbackResult;
  }
}

export async function translateWithAI(
  request: AITranslationRequest,
  provider: string,
  apiKey: string
): Promise<AITranslationResponse> {
  const chunks: string[] = [];
  for await (const chunk of streamTranslateWithAI(request, provider, apiKey)) {
    if (chunk.content) chunks.push(chunk.content);
    if (chunk.done) break;
  }
  const fullContent = chunks.join('');
  return parseFormattedResponse(fullContent);
}

export async function* streamTranslateWithAI(
  request: AITranslationRequest,
  provider: string,
  apiKey: string
): AsyncIterable<StreamTranslationChunk> {
  const config = AI_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  try {
    const requestData = config.requestFormatter(request, apiKey);
    if (provider === 'openai') {
      requestData.stream = true;
    }
    
    // 处理 extra_body 参数（用于 Qwen API）
    let finalRequestData = requestData;
    if (requestData.extra_body) {
      const { extra_body, ...mainBody } = requestData;
      finalRequestData = { ...mainBody, ...extra_body };
    }
    
    const url = provider === 'gemini' 
      ? `${config.apiUrl}?key=${apiKey}`
      : config.apiUrl;

    const headers = { ...config.headers };
    if (provider === 'openai' || provider === 'deepseek' || provider === 'qwen' || provider === 'qwen-plus') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(finalRequestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (provider === 'openai' && finalRequestData.stream) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          yield { content: '', done: true };
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } else {
      const data = await response.json();
        let rawContent = '';
        if (provider === 'deepseek') {
          rawContent = data.choices[0].message.content;
        } else if (provider === 'gemini') {
          rawContent = data.candidates[0].content.parts[0].text;
        } else if (provider === 'qwen') {
          rawContent = data.choices[0].message.content;
        } else if (provider === 'qwen-plus') {
          rawContent = data.choices[0].message.content;
        }
        yield { content: rawContent, done: false };
        yield { content: '', done: true };
    }
  } catch (error) {
    console.error('AI streaming error:', error);
    throw new Error(`Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * 获取支持的 AI 提供商列表
 */
export function getSupportedProviders(): string[] {
  return Object.keys(AI_PROVIDERS);
}

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    await translateWithAI({
      text: 'test',
      targetLanguage: 'Chinese'
    }, provider, apiKey);
    return true;
  } catch {
    return false;
  }
}