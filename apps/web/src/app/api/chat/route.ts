import { NextRequest } from 'next/server'

const ONE_API_URL = process.env.ONE_API_URL || 'http://localhost:3001'
const ONE_API_KEY = process.env.ONE_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { model, messages, temperature, max_tokens, stream } = body

    const response = await fetch(`${ONE_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONE_API_KEY}`,
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
