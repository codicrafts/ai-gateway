import { NextRequest, NextResponse } from 'next/server';

// 模拟模型数据
const models = [
  { id: 'gpt-4-turbo', model_name: 'GPT-4 Turbo', provider: 'OpenAI', category: 'text', description: '最新的GPT-4模型，支持128K上下文', input_price: 10, output_price: 30, context_length: 128000 },
  { id: 'gpt-4', model_name: 'GPT-4', provider: 'OpenAI', category: 'text', description: '强大的推理能力，适合复杂任务', input_price: 30, output_price: 60, context_length: 8192 },
  { id: 'gpt-3.5-turbo', model_name: 'GPT-3.5 Turbo', provider: 'OpenAI', category: 'text', description: '快速且经济的选择', input_price: 0.5, output_price: 1.5, context_length: 16385 },
  { id: 'claude-3-opus', model_name: 'Claude 3 Opus', provider: 'Anthropic', category: 'text', description: 'Anthropic最强大的模型', input_price: 15, output_price: 75, context_length: 200000 },
  { id: 'claude-3-sonnet', model_name: 'Claude 3 Sonnet', provider: 'Anthropic', category: 'text', description: '平衡性能与成本', input_price: 3, output_price: 15, context_length: 200000 },
  { id: 'claude-3-haiku', model_name: 'Claude 3 Haiku', provider: 'Anthropic', category: 'text', description: '快速响应，适合简单任务', input_price: 0.25, output_price: 1.25, context_length: 200000 },
  { id: 'gemini-pro', model_name: 'Gemini Pro', provider: 'Google', category: 'text', description: 'Google最新的多模态模型', input_price: 0.5, output_price: 1.5, context_length: 32000 },
  { id: 'gemini-ultra', model_name: 'Gemini Ultra', provider: 'Google', category: 'text', description: 'Google最强大的模型', input_price: 10, output_price: 30, context_length: 32000 },
  { id: 'mistral-large', model_name: 'Mistral Large', provider: 'Mistral AI', category: 'text', description: '欧洲领先的开源模型', input_price: 8, output_price: 24, context_length: 32000 },
  { id: 'mistral-medium', model_name: 'Mistral Medium', provider: 'Mistral AI', category: 'text', description: '性价比优秀的选择', input_price: 2.7, output_price: 8.1, context_length: 32000 },
  { id: 'dall-e-3', model_name: 'DALL-E 3', provider: 'OpenAI', category: 'image', description: '最先进的图像生成模型', input_price: 40, output_price: 0, context_length: 0 },
  { id: 'stable-diffusion-xl', model_name: 'Stable Diffusion XL', provider: 'Stability AI', category: 'image', description: '开源图像生成模型', input_price: 2, output_price: 0, context_length: 0 },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '100');
  const category = searchParams.get('category');
  
  let result = models;
  
  if (category) {
    result = result.filter((m) => m.category === category);
  }
  
  return NextResponse.json({ data: result.slice(0, limit) });
}
