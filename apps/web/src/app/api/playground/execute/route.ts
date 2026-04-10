import { NextRequest } from 'next/server';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { listGatewayConfiguredModels } from '@/services/gateway/gateway-model.service';
import { getGatewayApiKeyRuntimeCredentials } from '@/services/gateway/gateway-token.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import {
  getPlaygroundEndpointScope,
  isPlaygroundEndpointType,
  type PlaygroundEndpointType,
} from '@/services/playground/playground-endpoints';

const ONE_API_URL = process.env.ONE_API_URL || 'http://localhost:3001';
const ONE_API_KEY = process.env.ONE_API_KEY || '';

type PlaygroundMode = 'platform' | 'team_key';

type ChatLikeMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ParsedPlaygroundRequest = {
  body: Record<string, unknown>;
  formData: FormData | null;
};

type UpstreamRequest = {
  path: string;
  body: BodyInit;
  headers?: Record<string, string>;
};

function getStringValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function getNumberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseVideoSize(value: unknown) {
  const [widthRaw, heightRaw] = getStringValue(value || '1280x720').split('x');
  const width = Number(widthRaw);
  const height = Number(heightRaw);

  return {
    width: Number.isFinite(width) && width > 0 ? width : 1280,
    height: Number.isFinite(height) && height > 0 ? height : 720,
  };
}

async function parsePlaygroundRequest(
  request: NextRequest,
): Promise<ParsedPlaygroundRequest> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const body: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      body[key] = value;
    });

    return { body, formData };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return { body, formData: null };
}

function buildAudioUploadFormData(
  body: Record<string, unknown>,
  formData: FormData | null,
) {
  const fileValue = formData?.get('file');
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    throw new Error('请先上传音频文件');
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set('model', getStringValue(body.model));
  upstreamFormData.set('file', fileValue, fileValue.name);

  const passthroughFields = ['prompt', 'language', 'temperature', 'response_format'];
  for (const field of passthroughFields) {
    const value = getStringValue(body[field]);
    if (value) {
      upstreamFormData.set(field, value);
    }
  }

  if (!upstreamFormData.get('response_format')) {
    upstreamFormData.set('response_format', 'verbose_json');
  }

  return upstreamFormData;
}

function buildUpstreamRequest(
  endpointType: PlaygroundEndpointType,
  body: Record<string, unknown>,
  formData: FormData | null,
): UpstreamRequest {
  const model = getStringValue(body.model);
  const temperature = getNumberValue(body.temperature, 0.7);
  const maxTokens = getNumberValue(body.max_tokens, 2000);
  const systemMessage = getStringValue(body.system_message);
  const messages = Array.isArray(body.messages)
    ? (body.messages as ChatLikeMessage[])
    : [];

  switch (endpointType) {
    case 'openai':
      return {
        path: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      };
    case 'anthropic':
      return {
        path: '/v1/messages',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          system: systemMessage || undefined,
          messages: messages.filter((message) => message.role !== 'system'),
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      };
    case 'openai-response':
      return {
        path: '/v1/responses',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: systemMessage || undefined,
          input: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          temperature,
          max_output_tokens: maxTokens,
          stream: false,
        }),
      };
    case 'gemini':
      return {
        path: `/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: systemMessage
            ? {
                parts: [{ text: systemMessage }],
              }
            : undefined,
          contents: messages
            .filter((message) => message.role !== 'system')
            .map((message) => ({
              role: message.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: message.content }],
            })),
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      };
    case 'embeddings':
      return {
        path: '/v1/embeddings',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: body.input,
        }),
      };
    case 'image-generation':
      return {
        path: '/v1/images/generations',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: body.prompt,
          size: body.size || '1024x1024',
          quality: body.quality || 'standard',
          n: 1,
        }),
      };
    case 'jina-rerank':
      return {
        path: '/v1/rerank',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          query: body.query,
          documents: body.documents,
          top_n: Number(body.top_n ?? 3),
        }),
      };
    case 'audio-speech':
      return {
        path: '/v1/audio/speech',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: body.input,
          voice: body.voice || 'alloy',
          instructions: body.instructions || undefined,
          response_format: body.response_format || 'mp3',
          speed: body.speed ? Number(body.speed) : undefined,
        }),
      };
    case 'audio-transcriptions':
      return {
        path: '/v1/audio/transcriptions',
        body: buildAudioUploadFormData(body, formData),
      };
    case 'audio-translations':
      return {
        path: '/v1/audio/translations',
        body: buildAudioUploadFormData(body, formData),
      };
    case 'openai-video': {
      const { width, height } = parseVideoSize(body.size);
      return {
        path: '/v1/videos',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: body.prompt,
          duration: getNumberValue(body.duration, 5),
          width,
          height,
          n: 1,
          response_format: 'url',
        }),
      };
    }
    default:
      throw new Error('Unsupported endpoint type');
  }
}

function resolveUpstreamErrorMessage(responseData: unknown) {
  if (typeof responseData === 'string') {
    return responseData;
  }

  const parsed = responseData as
    | { error?: { message?: string }; message?: string }
    | null;

  return parsed?.error?.message || parsed?.message || 'API request failed';
}

function buildBinaryResponsePayload(contentType: string, buffer: ArrayBuffer) {
  const mimeType = contentType || 'application/octet-stream';
  const base64 = Buffer.from(buffer).toString('base64');

  return {
    content_type: mimeType,
    size_bytes: buffer.byteLength,
    base64_data: base64,
    data_url: `data:${mimeType};base64,${base64}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { body, formData } = await parsePlaygroundRequest(request);
    const endpointTypeRaw = getStringValue(body.endpoint_type);
    if (!isPlaygroundEndpointType(endpointTypeRaw)) {
      return Response.json({ error: '当前端点类型不受支持' }, { status: 400 });
    }

    const endpointType = endpointTypeRaw;
    const model = getStringValue(body.model);
    const requestMode: PlaygroundMode =
      body.mode === 'team_key' ? 'team_key' : 'platform';
    const requestedTeamId =
      typeof body.team_id === 'string' && body.team_id.trim().length > 0
        ? body.team_id
        : null;
    let authorizationKey = ONE_API_KEY;

    if (!model) {
      return Response.json({ error: '请选择一个模型' }, { status: 400 });
    }

    if (requestMode === 'team_key') {
      const appUser = await getAuthenticatedAppUser();
      if (!appUser) {
        return Response.json({ error: '请先登录后再使用我的 API Key 模式' }, { status: 401 });
      }

      const keyId = Number(body.api_key_id);
      if (!Number.isInteger(keyId) || keyId <= 0) {
        return Response.json({ error: '请选择可用的 API 密钥' }, { status: 400 });
      }

      const teamContext = await resolveAccessibleTeamContext(appUser.id, requestedTeamId);
      const { secret, apiKey } = await getGatewayApiKeyRuntimeCredentials({
        userId: appUser.id,
        teamId: teamContext.teamId,
        id: keyId,
      });

      const requiredScope = getPlaygroundEndpointScope(endpointType);
      const scopes = apiKey.permission_scopes || [];
      if (scopes.length > 0 && !scopes.includes(requiredScope)) {
        return Response.json(
          { error: `当前 API 密钥未启用 ${requiredScope} 调用权限` },
          { status: 403 },
        );
      }

      const configuredModels = await listGatewayConfiguredModels(500);
      const configuredModelNames = new Set(configuredModels.map((item) => item.model_name));
      if (!configuredModelNames.has(model)) {
        return Response.json({ error: '当前模型未在运行时后台启用' }, { status: 400 });
      }

      if (apiKey.models.length > 0 && !apiKey.models.includes(model)) {
        return Response.json({ error: '当前 API 密钥无权调用这个模型' }, { status: 403 });
      }

      authorizationKey = secret;
    }

    const upstream = buildUpstreamRequest(endpointType, body, formData);
    const response = await fetch(`${ONE_API_URL}${upstream.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorizationKey}`,
        ...(upstream.headers || {}),
      },
      body: upstream.body,
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const responseData = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      return Response.json(
        { error: resolveUpstreamErrorMessage(responseData) },
        { status: response.status },
      );
    }

    if (contentType.includes('application/json')) {
      const responseData = await response.json().catch(() => null);
      return Response.json(responseData);
    }

    if (contentType.startsWith('text/') || contentType.includes('xml')) {
      const responseText = await response.text().catch(() => '');
      return Response.json({
        content_type: contentType,
        text: responseText,
      });
    }

    const buffer = await response.arrayBuffer();
    return Response.json(buildBinaryResponsePayload(contentType, buffer));
  } catch (error) {
    console.error('Playground execute API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
