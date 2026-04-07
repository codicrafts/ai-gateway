import type {
  DocsRateLimitReference,
  DocsStatusCodeReference,
} from '@/services/docs/docs-reference.service';

export const DOCS_ENDPOINT_LABELS: Record<string, string> = {
  '/v1/chat/completions': 'Chat Completions',
  '/v1/responses': 'Responses',
  '/v1/messages': 'Anthropic Messages',
  '/v1/embeddings': 'Embeddings',
  '/v1/images/generations': 'Image Generation',
};

export const DOCS_STATUS_CODES: DocsStatusCodeReference[] = [
  { code: '200', descriptionZh: '请求成功', descriptionEn: 'Request succeeded' },
  { code: '400', descriptionZh: '请求参数错误', descriptionEn: 'Invalid request parameters' },
  { code: '401', descriptionZh: 'API Key 无效或未提供', descriptionEn: 'API key is invalid or missing' },
  { code: '403', descriptionZh: '当前 Key 或团队无权访问该模型', descriptionEn: 'The current key or team is not allowed to access this model' },
  { code: '429', descriptionZh: '请求速率超限或并发超限', descriptionEn: 'Rate limit or concurrency limit exceeded' },
  { code: '500', descriptionZh: '网关内部错误', descriptionEn: 'Internal gateway error' },
];

export const DOCS_RATE_LIMITS: DocsRateLimitReference[] = [
  { key: 'trial', labelZh: '试用层：每分钟 60 个请求', labelEn: 'Trial tier: 60 requests per minute' },
  { key: 'team', labelZh: '团队层：每分钟 600 个请求', labelEn: 'Team tier: 600 requests per minute' },
  {
    key: 'enterprise',
    labelZh: '企业层：按组织、Key 和路由策略自定义限制',
    labelEn: 'Enterprise tier: custom limits by org, key, and routing policy',
  },
];
