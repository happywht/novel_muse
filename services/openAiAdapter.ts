import { getApiKey, Provider } from './llmRouter';
import Anthropic from '@anthropic-ai/sdk';

export const fetchOpenAICompatible = async (
  provider: Provider,
  endpoint: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature: number = 0.7,
  responseFormat?: 'json_object'
): Promise<string> => {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    throw new Error(`请配置 ${provider} 的 API Key。`);
  }

  // Initialize the official Anthropic client
  const client = new Anthropic({
    apiKey: apiKey,
    baseURL: endpoint,
    dangerouslyAllowBrowser: true, // We are calling from the browser directly
  });

  // Anthropic API separates system prompts from the messages array
  let systemPrompt: string | undefined = undefined;
  const anthropicMessages: Anthropic.MessageParam[] = [];

  messages.forEach((msg) => {
    if (msg.role === 'system') {
      // Join multiple system prompts if they exist
      systemPrompt = systemPrompt ? systemPrompt + '\n' + msg.content : msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  });

  try {
    const response = await client.messages.create({
      model: model,
      max_tokens: 4096,
      temperature: temperature,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    // The response format strictly matches Anthropic's message content array
    const textBlock = response.content.find(
      (block) => block.type === 'text'
    ) as Anthropic.TextBlock;
    return textBlock ? textBlock.text : '';
  } catch (error: any) {
    console.error(`${provider} API Error details:`, error);
    throw new Error(`${provider} API Error: ${error.message}`);
  }
};
