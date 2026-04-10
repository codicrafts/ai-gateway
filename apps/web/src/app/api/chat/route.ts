import { NextRequest } from 'next/server'
import { getAuthenticatedAppUser } from '@/services/account/session.service'
import { listGatewayConfiguredModels } from '@/services/gateway/gateway-model.service'
import { getGatewayApiKeyRuntimeCredentials } from '@/services/gateway/gateway-token.service'
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service'

const ONE_API_URL = process.env.ONE_API_URL || 'http://localhost:3001'
const ONE_API_KEY = process.env.ONE_API_KEY || ''

type PlaygroundMode = 'platform' | 'team_key'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { model, messages, temperature, max_tokens, stream, mode, api_key_id, team_id } = body

    const requestMode: PlaygroundMode = mode === 'team_key' ? 'team_key' : 'platform'
    let authorizationKey = ONE_API_KEY

    if (requestMode === 'team_key') {
      const appUser = await getAuthenticatedAppUser()
      if (!appUser) {
        return Response.json({ error: '请先登录后再使用我的 API Key 模式' }, { status: 401 })
      }

      const keyId = Number(api_key_id)
      if (!Number.isInteger(keyId) || keyId <= 0) {
        return Response.json({ error: '请选择可用的 API 密钥' }, { status: 400 })
      }

      const teamContext = await resolveAccessibleTeamContext(appUser.id, team_id ?? null)
      const { secret, apiKey } = await getGatewayApiKeyRuntimeCredentials({
        userId: appUser.id,
        teamId: teamContext.teamId,
        id: keyId,
      })

      const scopes = apiKey.permission_scopes || []
      if (scopes.length > 0 && !scopes.includes('chat')) {
        return Response.json({ error: '当前 API 密钥未启用聊天调用权限' }, { status: 403 })
      }

      const configuredModels = await listGatewayConfiguredModels(500)
      const configuredModelNames = new Set(configuredModels.map((item) => item.model_name))
      if (!configuredModelNames.has(model)) {
        return Response.json({ error: '当前模型未在运行时后台启用' }, { status: 400 })
      }

      if (apiKey.models.length > 0 && !apiKey.models.includes(model)) {
        return Response.json({ error: '当前 API 密钥无权调用这个模型' }, { status: 403 })
      }

      authorizationKey = secret
    }

    const response = await fetch(`${ONE_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authorizationKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2000,
        stream: stream ?? false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return Response.json(
        { error: error.error?.message || 'API request failed' },
        { status: response.status }
      )
    }

    // 流式响应
    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非流式响应
    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
