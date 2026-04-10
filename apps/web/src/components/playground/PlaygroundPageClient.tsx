'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppDialog } from '@/components/ui/AppDialogProvider';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { GatewayApiKey } from '@/services/gateway/gateway-types';
import {
  addMessage,
  clearMessages,
  setMaxTokens,
  setSelectedModel,
  setSending,
  setSystemMessage,
  setTemperature,
  setTotalTokens,
} from '@/store/slices/playgroundSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { copyToClipboard, formatCurrency } from '@/utils/helpers';
import type { Model } from '@ai-gateway/shared-types';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getPlaygroundEndpointKind,
  getPlaygroundEndpointScope,
  normalizeModelEndpointTypes,
  type PlaygroundEndpointType,
} from '@/services/playground/playground-endpoints';

type PlaygroundMode = 'platform' | 'team_key';

type StructuredResult = {
  kind: 'embeddings' | 'images' | 'rerank' | 'audio' | 'video';
  summary: string;
  json: string;
  images?: string[];
  audioUrl?: string;
  videoUrl?: string;
  text?: string;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNestedString(value: unknown, path: string[]): string {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return '';
    current = record[key];
  }
  return readString(current);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getEndpointLabel(
  endpointType: PlaygroundEndpointType,
  t: ReturnType<typeof useTranslation>,
) {
  switch (endpointType) {
    case 'openai':
      return t.playgroundPage.endpointOpenAI;
    case 'anthropic':
      return t.playgroundPage.endpointAnthropic;
    case 'openai-response':
      return t.playgroundPage.endpointResponses;
    case 'gemini':
      return t.playgroundPage.endpointGemini;
    case 'embeddings':
      return t.playgroundPage.endpointEmbeddings;
    case 'image-generation':
      return t.playgroundPage.endpointImages;
    case 'jina-rerank':
      return t.playgroundPage.endpointRerank;
    case 'audio-speech':
      return t.playgroundPage.endpointAudioSpeech;
    case 'audio-transcriptions':
      return t.playgroundPage.endpointAudioTranscriptions;
    case 'audio-translations':
      return t.playgroundPage.endpointAudioTranslations;
    case 'openai-video':
      return t.playgroundPage.endpointVideo;
    default:
      return endpointType;
  }
}

function extractTextResponse(endpointType: PlaygroundEndpointType, data: unknown): string {
  if (!data) {
    return '';
  }

  switch (endpointType) {
    case 'anthropic':
      return readArray(asRecord(data)?.content)
        .map((item) => readNestedString(item, ['text']))
        .filter(Boolean)
        .join('\n');
    case 'openai-response': {
      const record = asRecord(data);
      if (record && typeof record.output_text === 'string' && record.output_text) {
        return record.output_text;
      }
      return readArray(record?.output)
        .flatMap((item) => readArray(asRecord(item)?.content))
        .map((item) => readNestedString(item, ['text']) || readIndexString(item, ['content', 0, 'text']))
        .filter(Boolean)
        .join('\n');
    }
    case 'gemini':
      return readArray(asRecord(data)?.candidates)
        .flatMap((candidate) => readArray(asRecord(asRecord(candidate)?.content)?.parts))
        .map((part) => readNestedString(part, ['text']))
        .filter(Boolean)
        .join('\n');
    case 'audio-transcriptions':
    case 'audio-translations':
      return readString(asRecord(data)?.text);
    case 'openai':
    default:
      return (
        readNestedString(data, ['choices', '0', 'message', 'content']) ||
        readNestedString(data, ['choices', '0', 'text']) ||
        ''
      );
  }
}

function getIndexedValue(value: unknown, index: number): unknown {
  return Array.isArray(value) ? value[index] : undefined;
}

function readIndexString(value: unknown, path: Array<string | number>): string {
  let current: unknown = value;
  for (const segment of path) {
    if (typeof segment === 'number') {
      current = getIndexedValue(current, segment);
      continue;
    }
    const record = asRecord(current);
    if (!record) return '';
    current = record[segment];
  }
  return readString(current);
}

function buildCodeExample({
  endpointType,
  selectedModel,
  systemMessage,
  temperature,
  maxTokens,
  input,
  rerankDocuments,
}: {
  endpointType: PlaygroundEndpointType;
  selectedModel: string;
  systemMessage: string;
  temperature: number;
  maxTokens: number;
  input: string;
  rerankDocuments: string;
}) {
  const modelName = selectedModel || 'gpt-4.1-mini';
  const userInput = input || 'Hello from MeshRouter';

  switch (endpointType) {
    case 'anthropic':
      return `import anthropic

client = anthropic.Anthropic(
    base_url="https://api.aigateway.com",
    api_key="your-api-key",
)

response = client.messages.create(
    model="${modelName}",
    system="${systemMessage}",
    max_tokens=${maxTokens},
    temperature=${temperature},
    messages=[{"role": "user", "content": "${userInput}"}],
)

print(response.content[0].text)`;
    case 'openai-response':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

response = client.responses.create(
    model="${modelName}",
    instructions="${systemMessage}",
    input="${userInput}",
    temperature=${temperature},
    max_output_tokens=${maxTokens},
)

print(response.output_text)`;
    case 'gemini':
      return `import requests

response = requests.post(
    "https://api.aigateway.com/v1beta/models/${modelName}:generateContent",
    headers={"Authorization": "Bearer your-api-key"},
    json={
        "systemInstruction": {"parts": [{"text": "${systemMessage}"}]},
        "contents": [{"role": "user", "parts": [{"text": "${userInput}"}]}],
        "generationConfig": {"temperature": ${temperature}, "maxOutputTokens": ${maxTokens}},
    },
)

print(response.json())`;
    case 'embeddings':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

response = client.embeddings.create(
    model="${modelName}",
    input="${userInput}",
)

print(len(response.data[0].embedding))`;
    case 'image-generation':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

response = client.images.generate(
    model="${modelName}",
    prompt="${userInput}",
    size="1024x1024",
)

print(response.data[0].url)`;
    case 'audio-speech':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

audio = client.audio.speech.create(
    model="${modelName}",
    voice="alloy",
    input="${userInput}",
    response_format="mp3",
)

audio.write_to_file("speech.mp3")`;
    case 'audio-transcriptions':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

with open("sample.mp3", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="${modelName}",
        file=audio_file,
        response_format="verbose_json",
    )

print(transcript.text)`;
    case 'audio-translations':
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

with open("sample.mp3", "rb") as audio_file:
    transcript = client.audio.translations.create(
        model="${modelName}",
        file=audio_file,
        response_format="verbose_json",
    )

print(transcript.text)`;
    case 'openai-video':
      return `import requests

response = requests.post(
    "https://api.aigateway.com/v1/videos",
    headers={"Authorization": "Bearer your-api-key"},
    json={
        "model": "${modelName}",
        "prompt": "${userInput}",
        "duration": 5,
        "width": 1280,
        "height": 720,
    },
)

print(response.json())`;
    case 'jina-rerank':
      return `import requests

response = requests.post(
    "https://api.aigateway.com/v1/rerank",
    headers={"Authorization": "Bearer your-api-key"},
    json={
        "model": "${modelName}",
        "query": "${userInput}",
        "documents": ${JSON.stringify(
          rerankDocuments
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 3),
        )},
        "top_n": 3,
    },
)

print(response.json())`;
    case 'openai':
    default:
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key",
)

response = client.chat.completions.create(
    model="${modelName}",
    messages=[
        {"role": "system", "content": "${systemMessage}"},
        {"role": "user", "content": "${userInput}"}
    ],
    temperature=${temperature},
    max_tokens=${maxTokens}
)

print(response.choices[0].message.content)`;
  }
}

export default function PlaygroundPageClient({
  initialModels,
  gatewayModels,
  teamApiKeys,
  teamId,
}: {
  initialModels: Model[];
  gatewayModels: Model[];
  teamApiKeys: GatewayApiKey[];
  teamId: string | null;
}) {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const { confirm } = useAppDialog();
  const searchParams = useSearchParams();
  const {
    messages,
    temperature,
    maxTokens,
    systemMessage,
    selectedModel,
    totalTokens,
    sending,
  } = useAppSelector((s) => s.playground);
  const { currentUser, loading: authLoading } = useAppSelector((s) => s.auth);

  const [platformModels] = useState<Model[]>(initialModels);
  const [runtimeModels] = useState<Model[]>(gatewayModels);
  const [mode, setMode] = useState<PlaygroundMode>(
    teamApiKeys.some((key) => key.status === 'active') ? 'team_key' : 'platform',
  );
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>(() => {
    const firstActiveKey = teamApiKeys.find((key) => key.status === 'active');
    return firstActiveKey ? String(firstActiveKey.id) : '';
  });
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<PlaygroundEndpointType>('openai');
  const [input, setInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [structuredResult, setStructuredResult] = useState<StructuredResult | null>(
    null,
  );
  const [imageSize, setImageSize] = useState('1024x1024');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioInstructions, setAudioInstructions] = useState('');
  const [audioVoice, setAudioVoice] = useState('alloy');
  const [audioResponseFormat, setAudioResponseFormat] = useState('mp3');
  const [videoDuration, setVideoDuration] = useState('5');
  const [videoSize, setVideoSize] = useState('1280x720');
  const [rerankDocuments, setRerankDocuments] = useState(
    'MeshRouter unifies model access.\nTeams can validate first and integrate second.\nBilling and permissions stay visible in one place.',
  );
  const messagesRef = useRef<HTMLDivElement>(null);
  const previousModelRef = useRef<string | null>(null);
  const previousContextRef = useRef<string | null>(null);

  const activeTeamApiKeys = teamApiKeys.filter((key) => key.status === 'active');
  const selectedApiKey =
    mode === 'team_key'
      ? activeTeamApiKeys.find((key) => String(key.id) === selectedApiKeyId) || null
      : null;

  const availableModels =
    mode === 'team_key'
      ? runtimeModels.filter((model) =>
          selectedApiKey && selectedApiKey.models.length > 0
            ? selectedApiKey.models.includes(model.model_name)
            : true,
        )
      : platformModels;

  const selectedModelMeta =
    availableModels.find((model) => model.model_name === selectedModel) ||
    platformModels.find((model) => model.model_name === selectedModel) ||
    runtimeModels.find((model) => model.model_name === selectedModel) ||
    null;

  const endpointOptions = useMemo(() => {
    const scopes = selectedApiKey?.permission_scopes || [];
    return normalizeModelEndpointTypes(selectedModelMeta)
      .filter((endpointType) => {
        if (mode !== 'team_key' || scopes.length === 0) {
          return true;
        }
        return scopes.includes(getPlaygroundEndpointScope(endpointType));
      })
      .map((endpointType) => ({
        value: endpointType,
        label: getEndpointLabel(endpointType, t),
      }));
  }, [mode, selectedApiKey?.permission_scopes, selectedModelMeta, t]);

  const selectedEndpointKind = getPlaygroundEndpointKind(selectedEndpoint);

  useEffect(() => {
    const modelParam = searchParams.get('model');
    const matchedModel =
      availableModels.find(
        (model) => model.model_name === modelParam || model.id === modelParam,
      ) || null;

    if (matchedModel) {
      dispatch(setSelectedModel(matchedModel.model_name));
      return;
    }

    if (availableModels.length === 0) {
      if (selectedModel) {
        dispatch(setSelectedModel(''));
      }
      return;
    }

    if (
      !selectedModel ||
      !availableModels.some((model) => model.model_name === selectedModel)
    ) {
      dispatch(setSelectedModel(availableModels[0].model_name));
    }
  }, [availableModels, dispatch, searchParams, selectedModel]);

  useEffect(() => {
    messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight);
  }, [messages, streamingContent, structuredResult]);

  useEffect(() => {
    if (mode !== 'team_key') {
      return;
    }

    if (activeTeamApiKeys.length === 0) {
      if (selectedApiKeyId) {
        setSelectedApiKeyId('');
      }
      setMode('platform');
      return;
    }

    if (!activeTeamApiKeys.some((key) => String(key.id) === selectedApiKeyId)) {
      setSelectedApiKeyId(String(activeTeamApiKeys[0].id));
    }
  }, [activeTeamApiKeys, mode, selectedApiKeyId]);

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    if (!previousModelRef.current) {
      previousModelRef.current = selectedModel;
      return;
    }

    if (previousModelRef.current === selectedModel) {
      return;
    }

    previousModelRef.current = selectedModel;
    dispatch(clearMessages());
    dispatch(setTotalTokens(0));
    dispatch(setSending(false));
    setStreamingContent('');
    setStructuredResult(null);
    setInput('');
    setAudioFile(null);
    setAudioInstructions('');
  }, [dispatch, selectedModel]);

  useEffect(() => {
    const contextKey = `${mode}:${selectedApiKeyId || 'none'}`;

    if (!previousContextRef.current) {
      previousContextRef.current = contextKey;
      return;
    }

    if (previousContextRef.current === contextKey) {
      return;
    }

    previousContextRef.current = contextKey;
    dispatch(clearMessages());
    dispatch(setTotalTokens(0));
    dispatch(setSending(false));
    setStreamingContent('');
    setStructuredResult(null);
    setInput('');
    setAudioFile(null);
    setAudioInstructions('');
  }, [dispatch, mode, selectedApiKeyId]);

  useEffect(() => {
    if (endpointOptions.length === 0) {
      return;
    }

    if (!endpointOptions.some((option) => option.value === selectedEndpoint)) {
      setSelectedEndpoint(endpointOptions[0].value as PlaygroundEndpointType);
    }
  }, [endpointOptions, selectedEndpoint]);

  useEffect(() => {
    dispatch(clearMessages());
    dispatch(setTotalTokens(0));
    setStreamingContent('');
    setStructuredResult(null);
    setInput('');
    setAudioFile(null);
    setAudioInstructions('');
  }, [dispatch, selectedEndpoint]);

  const estimatedCost = selectedModelMeta
    ? (totalTokens / 1_000_000) * selectedModelMeta.input_price
    : 0;

  const handleClear = async () => {
    if (messages.length === 0 && !structuredResult && !input.trim()) return;
    const confirmed = await confirm({
      title: t.common.confirm,
      message: t.playgroundPage.confirmClear,
      confirmText: t.common.confirm,
      cancelText: t.common.cancel,
      tone: 'danger',
    });
    if (!confirmed) return;

    dispatch(clearMessages());
    dispatch(setTotalTokens(0));
    setInput('');
    setStreamingContent('');
    setStructuredResult(null);
    setAudioFile(null);
    setAudioInstructions('');
    dispatch(showNotification({ message: t.playgroundPage.cleared }));
  };

  const sendOpenAIChat = async (userMessage: string) => {
    dispatch(addMessage({ role: 'user', content: userMessage }));
    setInput('');
    dispatch(setSending(true));
    setStreamingContent('');
    setStructuredResult(null);

    try {
      const chatMessages = [
        ...(systemMessage
          ? [{ role: 'system' as const, content: systemMessage }]
          : []),
        ...messages.map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          mode,
          api_key_id: mode === 'team_key' ? selectedApiKey?.id : null,
          team_id: teamId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t.playgroundPage.requestFailed);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let tokenCount = 0;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              setStreamingContent(fullContent);
            }
            if (parsed.usage) {
              tokenCount = parsed.usage.total_tokens || 0;
            }
          } catch {}
        }
      }

      dispatch(addMessage({ role: 'assistant', content: fullContent }));
      setStreamingContent('');

      if (tokenCount > 0) {
        dispatch(setTotalTokens(totalTokens + tokenCount));
      }
    } catch (error) {
      dispatch(
        showNotification({
          message:
            error instanceof Error ? error.message : t.playgroundPage.requestFailed,
          type: 'error',
        }),
      );
    } finally {
      dispatch(setSending(false));
    }
  };

  const executePlaygroundEndpoint = async () => {
    if (mode === 'team_key' && !selectedApiKey) {
      dispatch(
        showNotification({
          message: t.playgroundPage.selectApiKey,
          type: 'error',
        }),
      );
      return;
    }

    if (!selectedModel) {
      dispatch(
        showNotification({
          message: t.playgroundPage.selectModel,
          type: 'error',
        }),
      );
      return;
    }

    if (selectedEndpointKind === 'text' && !input.trim()) {
      dispatch(
        showNotification({
          message: t.playgroundPage.enterMessage,
          type: 'error',
        }),
      );
      return;
    }

    if (selectedEndpointKind === 'audio-speech' && !input.trim()) {
      dispatch(
        showNotification({
          message: t.playgroundPage.enterAudioSpeechText,
          type: 'error',
        }),
      );
      return;
    }

    if (selectedEndpointKind === 'audio-upload' && !audioFile) {
      dispatch(
        showNotification({
          message: t.playgroundPage.selectAudioFile,
          type: 'error',
        }),
      );
      return;
    }

    if (selectedEndpointKind === 'rerank') {
      const docs = rerankDocuments
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!input.trim() || docs.length === 0) {
        dispatch(
          showNotification({
            message: t.playgroundPage.rerankValidation,
            type: 'error',
          }),
        );
        return;
      }
    }

    if (selectedEndpoint === 'openai') {
      await sendOpenAIChat(input.trim());
      return;
    }

    dispatch(setSending(true));
    setStreamingContent('');
    setStructuredResult(null);

    try {
      const textMessages =
        selectedEndpointKind === 'text'
          ? [
              ...(systemMessage
                ? [{ role: 'system' as const, content: systemMessage }]
                : []),
              ...messages.map((message) => ({
                role: message.role as 'user' | 'assistant',
                content: message.content,
              })),
              { role: 'user' as const, content: input.trim() },
            ]
          : [];

      if (selectedEndpointKind === 'text') {
        dispatch(addMessage({ role: 'user', content: input.trim() }));
      }

      const basePayload = {
        endpoint_type: selectedEndpoint,
        model: selectedModel,
        messages: textMessages,
        system_message: systemMessage,
        temperature,
        max_tokens: maxTokens,
        input:
          selectedEndpointKind === 'embeddings' ||
          selectedEndpointKind === 'images' ||
          selectedEndpointKind === 'audio-speech'
            ? input.trim()
            : undefined,
        prompt:
          selectedEndpointKind === 'images' || selectedEndpointKind === 'video'
            ? input.trim()
            : undefined,
        query: selectedEndpointKind === 'rerank' ? input.trim() : undefined,
        documents:
          selectedEndpointKind === 'rerank'
            ? rerankDocuments
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean)
            : undefined,
        size:
          selectedEndpointKind === 'images'
            ? imageSize
            : selectedEndpointKind === 'video'
              ? videoSize
              : undefined,
        duration: selectedEndpointKind === 'video' ? videoDuration : undefined,
        voice: selectedEndpointKind === 'audio-speech' ? audioVoice : undefined,
        instructions:
          selectedEndpointKind === 'audio-speech' && audioInstructions.trim()
            ? audioInstructions.trim()
            : undefined,
        response_format:
          selectedEndpointKind === 'audio-speech'
            ? audioResponseFormat
            : undefined,
        mode,
        api_key_id: mode === 'team_key' ? selectedApiKey?.id : null,
        team_id: teamId,
      };

      let response: Response;
      if (selectedEndpointKind === 'audio-upload') {
        const formData = new FormData();
        formData.set('endpoint_type', selectedEndpoint);
        formData.set('model', selectedModel);
        formData.set('response_format', 'verbose_json');
        formData.set('mode', mode);
        if (mode === 'team_key' && selectedApiKey?.id) {
          formData.set('api_key_id', String(selectedApiKey.id));
        }
        if (teamId) {
          formData.set('team_id', teamId);
        }
        if (audioInstructions.trim()) {
          formData.set('prompt', audioInstructions.trim());
        }
        if (audioFile) {
          formData.set('file', audioFile, audioFile.name);
        }

        response = await fetch('/api/playground/execute', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/playground/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t.playgroundPage.requestFailed);
      }

      if (selectedEndpointKind === 'text') {
        const text = extractTextResponse(selectedEndpoint, data);
        dispatch(addMessage({ role: 'assistant', content: text || '[empty response]' }));
        dispatch(
          setTotalTokens(
            totalTokens +
              (data.usage?.total_tokens || Math.ceil((text || '').length / 4)),
          ),
        );
      } else if (selectedEndpointKind === 'embeddings') {
        const firstEmbedding = data.data?.[0]?.embedding;
        const dimensions = Array.isArray(firstEmbedding) ? firstEmbedding.length : 0;
        setStructuredResult({
          kind: 'embeddings',
          summary: t.playgroundPage.embeddingResultSummary
            .replace('{count}', String(Array.isArray(data.data) ? data.data.length : 0))
            .replace('{dims}', String(dimensions)),
          json: JSON.stringify(data, null, 2),
        });
      } else if (selectedEndpointKind === 'images') {
        const images = readArray(asRecord(data)?.data)
          .map((item) => {
            const itemRecord = asRecord(item);
            const url = readString(itemRecord?.url);
            const b64 = readString(itemRecord?.b64_json);
            if (url) return url;
            if (b64) return `data:image/png;base64,${b64}`;
            return null;
          })
          .filter((value): value is string => Boolean(value));
        setStructuredResult({
          kind: 'images',
          summary: t.playgroundPage.imageResultSummary.replace(
            '{count}',
            String(images.length),
          ),
          json: JSON.stringify(data, null, 2),
          images,
        });
      } else if (selectedEndpointKind === 'rerank') {
        const results = Array.isArray(data.results) ? data.results : [];
        setStructuredResult({
          kind: 'rerank',
          summary: t.playgroundPage.rerankResultSummary.replace(
            '{count}',
            String(results.length),
          ),
          json: JSON.stringify(data, null, 2),
        });
      } else if (selectedEndpointKind === 'audio-upload') {
        const transcriptText = typeof data.text === 'string' ? data.text : '';
        setStructuredResult({
          kind: 'audio',
          summary:
            selectedEndpoint === 'audio-translations'
              ? t.playgroundPage.translationResultSummary.replace(
                  '{count}',
                  transcriptText ? '1' : '0',
                )
              : t.playgroundPage.transcriptionResultSummary.replace(
                  '{count}',
                  transcriptText ? '1' : '0',
                ),
          text: transcriptText,
          json: JSON.stringify(data, null, 2),
        });
      } else if (selectedEndpointKind === 'audio-speech') {
        const dataRecord = asRecord(data);
        const audioPayload = {
          ...(dataRecord || {}),
          data_url: dataRecord?.data_url ? '[omitted]' : undefined,
          base64_data: dataRecord?.base64_data ? '[omitted]' : undefined,
        };
        setStructuredResult({
          kind: 'audio',
          summary: t.playgroundPage.speechResultSummary.replace(
            '{format}',
            readString(dataRecord?.content_type) || audioResponseFormat,
          ),
          audioUrl: readString(dataRecord?.data_url) || undefined,
          json: JSON.stringify(audioPayload, null, 2),
        });
      } else if (selectedEndpointKind === 'video') {
        const dataRecord = asRecord(data);
        const taskId = readString(dataRecord?.id) || readString(dataRecord?.task_id) || '';
        const status = readString(dataRecord?.status) || 'submitted';
        const videoUrl =
          readString(dataRecord?.url) ||
          readString(dataRecord?.video_url) ||
          readIndexString(dataRecord?.data, [0, 'url']) ||
          null;
        setStructuredResult({
          kind: 'video',
          summary: t.playgroundPage.videoResultSummary
            .replace('{status}', String(status))
            .replace('{taskId}', String(taskId || 'n/a')),
          videoUrl: videoUrl || undefined,
          json: JSON.stringify(data, null, 2),
        });
      }

      setInput('');
      if (selectedEndpointKind === 'audio-upload') {
        setAudioFile(null);
      }
    } catch (error) {
      if (selectedEndpointKind === 'text' && messages.at(-1)?.role === 'user') {
        dispatch(clearMessages());
      }
      dispatch(
        showNotification({
          message:
            error instanceof Error ? error.message : t.playgroundPage.requestFailed,
          type: 'error',
        }),
      );
    } finally {
      dispatch(setSending(false));
    }
  };

  if (authLoading && !currentUser) {
    return (
      <>
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center text-text-secondary">
          <div className="flex items-center gap-3 text-sm">
            <i className="fas fa-spinner fa-spin" />
            <span>{t.common.loading}</span>
          </div>
        </div>
      </>
    );
  }

  const codeExample = buildCodeExample({
    endpointType: selectedEndpoint,
    selectedModel,
    systemMessage,
    temperature,
    maxTokens,
    input,
    rerankDocuments,
  });

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
      <Navbar />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 flex flex-col">
        <section className="mb-6 sm:mb-8">
          <div className="grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-end">
            <div className="space-y-3 sm:space-y-5">
              <span className="eyebrow inline-flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">
                  {t.playgroundPage.eyebrow}
                </span>
              </span>
              <h1 className="max-w-3xl text-[1.75rem] font-bold tracking-tight leading-[1.12] text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
                {t.playgroundPage.title}
              </h1>
              <p className="max-w-2xl text-[0.9rem] sm:text-lg leading-relaxed text-text-secondary md:text-xl">
                {t.playgroundPage.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1 sm:pt-2">
                <button
                  onClick={() => setShowCode((value) => !value)}
                  className="btn-primary w-full sm:w-auto justify-center rounded-full px-5 sm:px-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <i
                    className={`fas ${showCode ? 'fa-terminal' : 'fa-code'} mr-1.5 sm:mr-2`}
                  />
                  {showCode
                    ? t.playgroundPage.backToWorkbench
                    : t.playgroundPage.showCode}
                </button>
                <Link
                  href="/models"
                  className="btn-secondary w-full sm:w-auto justify-center rounded-full px-5 sm:px-6 no-underline hover:-translate-y-0.5 transition-transform bg-white/50 backdrop-blur-sm border-border"
                >
                  <i className="fas fa-layer-group mr-1.5 sm:mr-2" />
                  {t.playgroundPage.openCatalog}
                </Link>
              </div>
            </div>

            <div className="editorial-panel space-y-4 sm:space-y-5 p-4 sm:p-6 bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-[2rem] shadow-sm border-border">
              <div className="text-[0.625rem] sm:text-[0.68rem] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-text-secondary flex items-center gap-1.5 sm:gap-2">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-success animate-pulse" />
                {t.playgroundPage.sessionSnapshot}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-dark-light/30 p-3 sm:p-4">
                  <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {t.playgroundPage.messageCount}
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-[1.75rem] sm:text-3xl font-bold tracking-tight text-text-primary">
                    {messages.length}
                  </div>
                </div>
                <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-dark-light/30 p-3 sm:p-4">
                  <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {t.playgroundPage.token}
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-[1.75rem] sm:text-3xl font-bold tracking-tight text-text-primary">
                    {totalTokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="rounded-xl sm:rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-3 sm:p-4">
                <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                  {t.playgroundPage.currentModel}
                </div>
                <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-bold tracking-tight text-text-primary">
                  {selectedModelMeta?.model_name || t.playgroundPage.noModelSelected}
                </div>
                <div className="mt-2 text-[0.72rem] sm:text-xs leading-relaxed text-text-secondary font-medium">
                  {t.playgroundPage.currentModelHint.replace(
                    '{cost}',
                    formatCurrency(estimatedCost),
                  )}
                </div>
                <div className="mt-3 inline-flex rounded-full border border-border/60 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  {getEndpointLabel(selectedEndpoint, t)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex-1 grid gap-4 sm:gap-6 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[600px]">
          <aside
            className={`space-y-4 sm:space-y-6 flex flex-col h-full ${
              showSettings ? 'block' : 'hidden lg:flex'
            }`}
          >
            <section className="editorial-panel p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-[2rem] bg-white border-border shadow-sm flex-1">
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[0.625rem] sm:text-[0.68rem] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-text-secondary mb-0.5 sm:mb-1">
                    {t.playgroundPage.controlDeck}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-text-primary">
                    {t.playgroundPage.settingsTitle}
                  </h2>
                </div>
                <button
                  onClick={handleClear}
                  className="btn-secondary px-2.5 py-1.5 sm:px-3 sm:py-2 text-[0.7rem] sm:text-xs rounded-full hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
                >
                  <i className="fas fa-trash-alt mr-1 sm:mr-1.5" />
                  {t.playgroundPage.clear}
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {t.playgroundPage.mode}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                        mode === 'platform'
                          ? 'bg-primary text-white'
                          : 'border border-border bg-white text-text-secondary hover:border-primary/30 hover:text-primary'
                      }`}
                      onClick={() => setMode('platform')}
                    >
                      {t.playgroundPage.platformMode}
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                        mode === 'team_key'
                          ? 'bg-primary text-white'
                          : 'border border-border bg-white text-text-secondary hover:border-primary/30 hover:text-primary'
                      } ${activeTeamApiKeys.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (activeTeamApiKeys.length === 0) return;
                        setMode('team_key');
                      }}
                      disabled={activeTeamApiKeys.length === 0}
                    >
                      {t.playgroundPage.teamKeyMode}
                    </button>
                  </div>
                  <p className="mt-2 text-[0.72rem] sm:text-xs leading-relaxed text-text-secondary">
                    {mode === 'team_key'
                      ? t.playgroundPage.teamKeyModeHint
                      : t.playgroundPage.platformModeHint}
                  </p>
                </div>

                {mode === 'team_key' && (
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                      {t.playgroundPage.apiKey}
                    </label>
                    <EditorialSelect
                      className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                      value={selectedApiKeyId}
                      onChange={(value) => setSelectedApiKeyId(value)}
                      options={activeTeamApiKeys.map((key) => ({
                        value: String(key.id),
                        label: key.name,
                      }))}
                      placeholder={t.playgroundPage.selectApiKey}
                    />
                    <p className="mt-2 text-[0.72rem] sm:text-xs leading-relaxed text-text-secondary">
                      {activeTeamApiKeys.length === 0
                        ? t.playgroundPage.noApiKeys
                        : selectedApiKey?.models?.length
                          ? t.playgroundPage.scopedModelsHint
                          : t.playgroundPage.allConfiguredModelsHint}
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {t.playgroundPage.model}
                  </label>
                  <EditorialSelect
                    className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                    value={selectedModel}
                    onChange={(value) => dispatch(setSelectedModel(value))}
                    options={availableModels.map((model) => ({
                      value: model.model_name,
                      label: model.model_name,
                    }))}
                    placeholder={
                      mode === 'team_key'
                        ? t.playgroundPage.noModelsForCurrentKey
                        : t.playgroundPage.loadingModels
                    }
                  />
                </div>

                <div>
                  <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {t.playgroundPage.endpoint}
                  </label>
                  <EditorialSelect
                    className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                    value={selectedEndpoint}
                    onChange={(value) =>
                      setSelectedEndpoint(value as PlaygroundEndpointType)
                    }
                    options={endpointOptions}
                    placeholder={t.playgroundPage.endpointPlaceholder}
                  />
                </div>

                {selectedEndpointKind === 'text' ? (
                  <>
                    <div className="bg-dark-light/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/50">
                      <div className="mb-2 sm:mb-3 flex items-center justify-between text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        <span>{t.playgroundPage.temperature}</span>
                        <span className="bg-white px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded shadow-sm text-text-primary">
                          {temperature}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="w-full accent-primary"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) =>
                          dispatch(setTemperature(Number(e.target.value)))
                        }
                      />
                    </div>

                    <div className="bg-dark-light/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/50">
                      <div className="mb-2 sm:mb-3 flex items-center justify-between text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        <span>{t.playgroundPage.maxTokens}</span>
                        <span className="bg-white px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded shadow-sm text-text-primary">
                          {maxTokens}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="w-full accent-primary"
                        min="100"
                        max="4000"
                        step="100"
                        value={maxTokens}
                        onChange={(e) =>
                          dispatch(setMaxTokens(Number(e.target.value)))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.systemPrompt}
                      </label>
                      <textarea
                        className="form-control min-h-[120px] sm:min-h-[140px] rounded-xl bg-dark-light/10 text-xs sm:text-sm leading-relaxed focus:bg-white transition-colors resize-y"
                        value={systemMessage}
                        onChange={(e) => dispatch(setSystemMessage(e.target.value))}
                        placeholder="You are a helpful assistant..."
                      />
                    </div>
                  </>
                ) : null}

                {selectedEndpointKind === 'images' ? (
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                      {t.playgroundPage.imageSize}
                    </label>
                    <EditorialSelect
                      className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                      value={imageSize}
                      onChange={setImageSize}
                      options={[
                        { value: '1024x1024', label: '1024x1024' },
                        { value: '1024x1792', label: '1024x1792' },
                        { value: '1792x1024', label: '1792x1024' },
                      ]}
                    />
                  </div>
                ) : null}

                {selectedEndpointKind === 'audio-speech' ? (
                  <>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.audioVoice}
                      </label>
                      <EditorialSelect
                        className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                        value={audioVoice}
                        onChange={setAudioVoice}
                        options={[
                          { value: 'alloy', label: 'alloy' },
                          { value: 'ash', label: 'ash' },
                          { value: 'nova', label: 'nova' },
                          { value: 'sage', label: 'sage' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.audioResponseFormat}
                      </label>
                      <EditorialSelect
                        className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                        value={audioResponseFormat}
                        onChange={setAudioResponseFormat}
                        options={[
                          { value: 'mp3', label: 'mp3' },
                          { value: 'wav', label: 'wav' },
                          { value: 'opus', label: 'opus' },
                          { value: 'flac', label: 'flac' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.audioInstructions}
                      </label>
                      <textarea
                        className="form-control min-h-[110px] rounded-xl bg-dark-light/10 text-xs sm:text-sm leading-relaxed focus:bg-white transition-colors resize-y"
                        value={audioInstructions}
                        onChange={(e) => setAudioInstructions(e.target.value)}
                        placeholder={t.playgroundPage.audioInstructionsPlaceholder}
                      />
                    </div>
                  </>
                ) : null}

                {selectedEndpointKind === 'audio-upload' ? (
                  <>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.audioFile}
                      </label>
                      <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-border/70 bg-dark-light/10 px-4 py-4 text-sm text-text-secondary transition-colors hover:border-primary/30 hover:bg-white">
                        <span className="font-medium text-text-primary">
                          {audioFile?.name || t.playgroundPage.audioFilePlaceholder}
                        </span>
                        <span className="text-xs leading-relaxed">
                          {t.playgroundPage.audioFileHint}
                        </span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(event) =>
                            setAudioFile(event.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.audioInstructions}
                      </label>
                      <textarea
                        className="form-control min-h-[110px] rounded-xl bg-dark-light/10 text-xs sm:text-sm leading-relaxed focus:bg-white transition-colors resize-y"
                        value={audioInstructions}
                        onChange={(e) => setAudioInstructions(e.target.value)}
                        placeholder={t.playgroundPage.audioUploadPromptPlaceholder}
                      />
                    </div>
                  </>
                ) : null}

                {selectedEndpointKind === 'video' ? (
                  <>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.videoSize}
                      </label>
                      <EditorialSelect
                        className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                        value={videoSize}
                        onChange={setVideoSize}
                        options={[
                          { value: '1280x720', label: '1280x720' },
                          { value: '720x1280', label: '720x1280' },
                          { value: '1024x1024', label: '1024x1024' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.videoDuration}
                      </label>
                      <EditorialSelect
                        className="rounded-xl bg-dark-light/10 text-xs sm:text-sm"
                        value={videoDuration}
                        onChange={setVideoDuration}
                        options={[
                          { value: '5', label: '5s' },
                          { value: '8', label: '8s' },
                          { value: '10', label: '10s' },
                        ]}
                      />
                    </div>
                  </>
                ) : null}

                {selectedEndpointKind === 'rerank' ? (
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                      {t.playgroundPage.rerankDocuments}
                    </label>
                    <textarea
                      className="form-control min-h-[140px] rounded-xl bg-dark-light/10 text-xs sm:text-sm leading-relaxed focus:bg-white transition-colors resize-y"
                      value={rerankDocuments}
                      onChange={(e) => setRerankDocuments(e.target.value)}
                      placeholder={t.playgroundPage.rerankDocumentsPlaceholder}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </aside>

          <section className="flex flex-col overflow-hidden rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] border border-border bg-white shadow-sm ring-1 ring-border/50">
            <div className="border-b border-border/60 bg-dark-light/20 px-4 py-3 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-bolt text-base sm:text-lg" />
                  </div>
                  <div>
                    <div className="text-[0.625rem] sm:text-[0.68rem] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-text-secondary mb-0.5">
                      {t.playgroundPage.workbench}
                    </div>
                    <div className="text-base sm:text-xl font-bold tracking-tight text-text-primary">
                      {showCode
                        ? t.playgroundPage.codeSample
                        : `${selectedModelMeta?.model_name || t.playgroundPage.readyToStart} · ${getEndpointLabel(selectedEndpoint, t)}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowSettings((value) => !value)}
                    className="btn-secondary rounded-full xl:hidden text-xs sm:text-sm"
                  >
                    <i
                      className={`fas ${showSettings ? 'fa-times' : 'fa-sliders-h'} mr-1.5 sm:mr-2`}
                    />
                    {showSettings
                      ? t.playgroundPage.toggleSettingsHide
                      : t.playgroundPage.toggleSettingsShow}
                  </button>
                  {!showCode && (
                    <button
                      onClick={() => {
                        copyToClipboard(selectedModel || '');
                        dispatch(
                          showNotification({
                            message: t.playgroundPage.copiedModelId,
                          }),
                        );
                      }}
                      className="btn-secondary rounded-full bg-white hover:border-primary/30 transition-colors text-xs sm:text-sm"
                    >
                      <i className="fas fa-copy mr-1.5 sm:mr-2 opacity-70" />
                      {t.playgroundPage.copyModelId}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showCode ? (
              <div className="flex-1 p-6 sm:p-8 bg-dark-light/5">
                <div className="mb-5 flex items-center justify-between">
                  <div className="text-sm font-semibold text-text-primary">
                    {t.playgroundPage.pythonExample}
                  </div>
                  <button
                    onClick={() => {
                      copyToClipboard(codeExample);
                      dispatch(
                        showNotification({
                          message: t.playgroundPage.copiedCode,
                        }),
                      );
                    }}
                    className="btn-secondary px-4 py-2 text-xs rounded-full bg-white"
                  >
                    <i className="fas fa-copy mr-2" />
                    {t.playgroundPage.copyCode}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-[1.5rem] border border-border bg-[#0d1117] p-6 text-sm text-[#e6edf3] font-mono shadow-inner h-[calc(100%-4rem)]">
                  <code>{codeExample}</code>
                </pre>
              </div>
            ) : (
              <div className="flex flex-1 flex-col h-full bg-dark-light/5">
                <div
                  ref={messagesRef}
                  className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8"
                >
                  {messages.length === 0 &&
                  !streamingContent &&
                  !structuredResult ? (
                    <div className="flex h-full flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white border border-border shadow-sm text-3xl text-primary">
                        <i className="fas fa-flask" />
                      </div>
                      <div className="text-3xl font-bold tracking-tight text-text-primary mb-3">
                        {t.playgroundPage.emptyTitle}
                      </div>
                      <p className="text-base leading-relaxed text-text-secondary">
                        {t.playgroundPage.emptyDesc}
                      </p>
                    </div>
                  ) : structuredResult ? (
                    <div className="space-y-5">
                      <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-sm">
                        <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-text-secondary">
                          {t.playgroundPage.resultPanel}
                        </div>
                        <div className="mt-3 text-base font-medium text-text-primary">
                          {structuredResult.summary}
                        </div>
                      </div>

                      {structuredResult.images?.length ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {structuredResult.images.map((imageUrl) => (
                            <div
                              key={imageUrl}
                              className="overflow-hidden rounded-[1.5rem] border border-border bg-white p-2 shadow-sm"
                            >
                              <img
                                src={imageUrl}
                                alt="Generated"
                                className="w-full rounded-[1rem] object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {structuredResult.audioUrl ? (
                        <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-sm">
                          <audio controls className="w-full" src={structuredResult.audioUrl}>
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      ) : null}

                      {structuredResult.videoUrl ? (
                        <div className="overflow-hidden rounded-[1.5rem] border border-border bg-white p-2 shadow-sm">
                          <video controls className="w-full rounded-[1rem]" src={structuredResult.videoUrl}>
                            Your browser does not support video playback.
                          </video>
                        </div>
                      ) : null}

                      {structuredResult.text ? (
                        <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-sm">
                          <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-text-secondary">
                            {t.playgroundPage.transcriptPanel}
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-text-primary">
                            {structuredResult.text}
                          </div>
                        </div>
                      ) : null}

                      <pre className="overflow-x-auto rounded-[1.5rem] border border-border bg-[#0d1117] p-5 text-xs sm:text-sm text-[#e6edf3] font-mono shadow-inner">
                        <code>{structuredResult.json}</code>
                      </pre>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            message.role === 'user'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] rounded-[1.5rem] px-5 py-4 sm:max-w-[80%] shadow-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-white rounded-tr-sm'
                                : 'border border-border/60 bg-white text-text-primary rounded-tl-sm'
                            }`}
                          >
                            <div
                              className={`mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] flex items-center gap-2 ${
                                message.role === 'user'
                                  ? 'text-white/80'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {message.role === 'user' ? (
                                <i className="fas fa-user text-[10px]" />
                              ) : (
                                <i className="fas fa-robot text-[10px]" />
                              )}
                              {message.role === 'user'
                                ? 'Operator'
                                : selectedModelMeta?.model_name || 'Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ))}

                      {streamingContent && (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] rounded-[1.5rem] rounded-tl-sm border border-border/60 bg-white shadow-sm px-5 py-4 text-text-primary sm:max-w-[80%]">
                            <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary flex items-center gap-2">
                              <i className="fas fa-robot text-[10px]" />
                              {selectedModelMeta?.model_name || 'Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                              {streamingContent}
                              <span className="animate-pulse ml-1 text-primary">
                                ▊
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {sending && !streamingContent && !structuredResult && (
                    <div className="flex justify-start">
                      <div className="rounded-[1.5rem] rounded-tl-sm border border-border/60 bg-white shadow-sm px-5 py-3 text-primary flex items-center gap-3">
                        <i className="fas fa-circle-notch fa-spin text-lg" />
                        <span className="text-sm font-medium text-text-secondary">
                          {t.playgroundPage.running}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 bg-white p-4 sm:p-5 md:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
                  {selectedEndpointKind === 'rerank' ? (
                    <div className="max-w-4xl mx-auto">
                      <label className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                        {t.playgroundPage.rerankQuery}
                      </label>
                      <div className="relative">
                        <textarea
                          className="form-control min-h-[64px] max-h-[200px] flex-1 resize-y rounded-xl sm:rounded-2xl bg-dark-light/10 focus:bg-white transition-colors border-border/60 text-sm sm:text-base py-3 px-4 pr-12 sm:py-4 sm:px-5 sm:pr-14"
                          placeholder={t.playgroundPage.rerankQueryPlaceholder}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={sending}
                        />
                        <button
                          className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3 w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          onClick={executePlaygroundEndpoint}
                          disabled={sending}
                          title={t.playgroundPage.send}
                        >
                          {sending ? (
                            <i className="fas fa-spinner fa-spin text-sm sm:text-base" />
                          ) : (
                            <i className="fas fa-paper-plane text-sm sm:text-base" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : selectedEndpointKind === 'audio-upload' ? (
                    <div className="flex max-w-4xl items-center justify-between gap-4 rounded-[1.5rem] border border-border/60 bg-dark-light/10 px-4 py-4 mx-auto">
                      <div className="min-w-0">
                        <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                          {t.playgroundPage.audioFile}
                        </div>
                        <div className="mt-2 truncate text-sm font-medium text-text-primary">
                          {audioFile?.name || t.playgroundPage.audioFilePlaceholder}
                        </div>
                      </div>
                      <button
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={executePlaygroundEndpoint}
                        disabled={sending || !audioFile}
                        title={t.playgroundPage.send}
                      >
                        {sending ? (
                          <i className="fas fa-spinner fa-spin text-sm sm:text-base" />
                        ) : (
                          <i className="fas fa-upload text-sm sm:text-base" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end relative max-w-4xl mx-auto">
                      <textarea
                        className="form-control min-h-[56px] sm:min-h-[60px] max-h-[200px] flex-1 resize-y rounded-xl sm:rounded-2xl bg-dark-light/10 focus:bg-white transition-colors border-border/60 text-sm sm:text-base py-3 px-4 pr-12 sm:py-4 sm:px-5 sm:pr-14"
                        placeholder={
                          selectedEndpointKind === 'embeddings'
                            ? t.playgroundPage.embeddingInputPlaceholder
                            : selectedEndpointKind === 'images'
                              ? t.playgroundPage.imagePromptPlaceholder
                              : selectedEndpointKind === 'audio-speech'
                                ? t.playgroundPage.audioSpeechInputPlaceholder
                                : selectedEndpointKind === 'video'
                                  ? t.playgroundPage.videoPromptPlaceholder
                              : t.playgroundPage.inputPlaceholder
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            selectedEndpointKind === 'text' &&
                            e.key === 'Enter' &&
                            !e.shiftKey
                          ) {
                            e.preventDefault();
                            executePlaygroundEndpoint();
                          }
                        }}
                        disabled={sending}
                      />
                      <button
                        className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3 w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={executePlaygroundEndpoint}
                        disabled={sending || !input.trim()}
                        title={t.playgroundPage.send}
                      >
                        {sending ? (
                          <i className="fas fa-spinner fa-spin text-sm sm:text-base" />
                        ) : (
                          <i className="fas fa-paper-plane text-sm sm:text-base" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="text-center mt-2 sm:mt-3 text-[0.65rem] sm:text-[0.7rem] text-text-secondary max-w-4xl mx-auto">
                    {selectedEndpointKind === 'text'
                      ? t.playgroundPage.shortcutHint
                      : t.playgroundPage.endpointHint}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
