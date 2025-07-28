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
          content: `你是一位专业的英汉翻译专家。\n任务：请将用户提供的英文句子翻译成地道、简洁的学术化中文。\n返回格式要求：你必须且只返回以下三部分内容，格式如下：\n### 翻译：\n(此处放置中文翻译结果)\n### 解析：\n(此处解析关键点、翻译技巧、难点处理等，语言简洁清晰)\n### 例句：\n1. **(例句1-标准释义型例句)** (中文例句) - (对应英文翻译，展示核心语义的灵活表达)\n2. **(例句2-用户输入变换句式)** (中文例句) - (对应英文翻译，基于用户输入的句子做句式变换后的表达)\n\n约束条件：\n1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯。\n2. 解析需简明扼要，突出核心信息处理（如特定术语、固定搭配、句法转换、文化负载词处理等）。\n3. 第一个例句需展示单词/短语在贴近原句意思的标准完整句子中的应用。\n4. 第二个例句需基于用户提供的原句进行句型的转换应用（如主动/被动转换、肯定/否定变化、疑问句改写或更简化的表达等），并保留原句核心语义。在例句后注明变换点（例如：被动转换）。\n5. 中文例句需用括号标注英文解释。\n6. 专注于翻译和语言本身，拒绝回答无关问题。\n7. 避免使用任何俚语、网络流行语或过于口语化的表达，保持学术风格。避免任何主观评价。\n8. 直接输出翻译、解析、例句三部分，不要添加任何问候语、结束语或其他无关说明。`
        },
        {
          role: 'user',
          content: `Text: "${request.text}"${request.context ? `\nContext: "${request.context}"` : ''}`
        }
      ]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.choices[0].message.content),
  },

  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    requestFormatter: (request: AITranslationRequest, _apiKey: string) => ({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的英汉翻译专家。\n任务：请将用户提供的英文句子翻译成地道、简洁的学术化中文。\n返回格式要求：你必须且只返回以下三部分内容，格式如下：\n翻译：\n(此处放置中文翻译结果)\n 解析：\n(此处解析关键点、翻译技巧、难点处理等，语言简洁清晰)\n 例句：\n1. (例句1-标准释义型例句) (中文例句) - (对应英文翻译，展示核心语义的灵活表达)\n2. (例句2-用户输入变换句式) (中文例句) - (对应英文翻译，基于用户输入的句子做句式变换后的表达)\n\n约束条件：\n1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯。\n2. 解析需简明扼要，突出核心信息处理（如特定术语、固定搭配、句法转换、文化负载词处理等）。\n3. 第一个例句需展示单词/短语在贴近原句意思的标准完整句子中的应用。\n4. 第二个例句需基于用户提供的原句进行句型的转换应用（如主动/被动转换、肯定/否定变化、疑问句改写或更简化的表达等），并保留原句核心语义。在例句后注明变换点（例如：被动转换）。\n5. 中文例句需用括号标注英文解释。\n6. 专注于翻译和语言本身，拒绝回答无关问题。\n7. 避免使用任何俚语、网络流行语或过于口语化的表达，保持学术风格。避免任何主观评价。\n8. 直接输出翻译、解析、例句三部分，不要添加任何问候语、结束语或其他无关说明。`
        },
        {
          role: 'user',
          content: `Translate: "${request.text}"${request.context ? `\nContext: "${request.context}"` : ''}`
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
          text: `你是一位专业的英汉翻译专家。\n任务：请将用户提供的英文句子翻译成地道、简洁的学术化中文。\n返回格式要求：你必须且只返回以下三部分内容，格式如下：\n### 翻译：\n(此处放置中文翻译结果)\n### 解析：\n(此处解析关键点、翻译技巧、难点处理等，语言简洁清晰)\n### 例句：\n1. **(例句1-标准释义型例句)** (中文例句) - (对应英文翻译，展示核心语义的灵活表达)\n2. **(例句2-用户输入变换句式)** (中文例句) - (对应英文翻译，基于用户输入的句子做句式变换后的表达)\n\n约束条件：\n1. 翻译需流畅自然，避免机械直译，符合中文阅读习惯。\n2. 解析需简明扼要，突出核心信息处理（如特定术语、固定搭配、句法转换、文化负载词处理等）。\n3. 第一个例句需展示单词/短语在贴近原句意思的标准完整句子中的应用。\n4. 第二个例句需基于用户提供的原句进行句型的转换应用（如主动/被动转换、肯定/否定变化、疑问句改写或更简化的表达等），并保留原句核心语义。在例句后注明变换点（例如：被动转换）。\n5. 中文例句需用括号标注英文解释。\n6. 专注于翻译和语言本身，拒绝回答无关问题。\n7. 避免使用任何俚语、网络流行语或过于口语化的表达，保持学术风格。避免任何主观评价。\n8. 直接输出翻译、解析、例句三部分，不要添加任何问候语、结束语或其他无关说明。\n\n待翻译英文原文： [<<<${request.text}>>>]${request.context ? `\nContext: "${request.context}"` : ''}`
        }]
      }]
    }),
    responseParser: (response: any): AITranslationResponse => parseFormattedResponse(response.candidates[0].content.parts[0].text),
  }
};

/**
 * 调用 AI API 进行翻译
 */
export function parseFormattedResponse(text: string): AITranslationResponse {
  const lines = text.split('\n');
  let translation = '';
  let wordType = '';
  let pronunciation = '';
  let explanation = '';
  let examples: string[] = [];
  let currentSection = '';
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('翻译：') || line.startsWith('### 翻译：')) {
      translation = line.replace(/###? 翻译：/, '').trim();
      currentSection = 'translation';
    } else if (line.startsWith('解析：') || line.startsWith('### 解析：')) {
      explanation = line.replace(/###? 解析：/, '').trim();
      currentSection = 'explanation';
    } else if (line.startsWith('例句：') || line.startsWith('### 例句：')) {
      currentSection = 'examples';
    } else if (currentSection === 'examples' && line.trim()) {
      examples.push(line.trim());
    } else if (currentSection === 'explanation' && line.trim()) {
      explanation += '\n' + line.trim();
    } else if (currentSection === 'translation' && line.trim()) {
      translation += ' ' + line.trim();
    }
  }
  return { translation: translation.trim(), wordType, pronunciation, explanation: explanation.trim(), examples };
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
    const url = provider === 'gemini' 
      ? `${config.apiUrl}?key=${apiKey}`
      : config.apiUrl;

    const headers = { ...config.headers };
    if (provider === 'openai' || provider === 'deepseek') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (provider === 'openai' && requestData.stream) {
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