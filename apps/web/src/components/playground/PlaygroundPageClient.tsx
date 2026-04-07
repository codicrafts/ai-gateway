'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppDialog } from '@/components/ui/AppDialogProvider';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
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

export default function PlaygroundPageClient({
  initialModels,
}: {
  initialModels: Model[];
}) {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const { confirm } = useAppDialog();
  const searchParams = useSearchParams();
  const { messages, temperature, maxTokens, systemMessage, selectedModel, totalTokens, sending } = useAppSelector((s) => s.playground);
  const { currentUser, loading: authLoading } = useAppSelector((s) => s.auth);

  const [models] = useState<Model[]>(initialModels);
  const [input, setInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modelParam = searchParams.get('model');

    if (modelParam && models.find((model) => model.id === modelParam)) {
      dispatch(setSelectedModel(modelParam));
      return;
    }

    if (models.length > 0 && !selectedModel) {
      dispatch(setSelectedModel(models[0].id));
    }
  }, [dispatch, models, searchParams, selectedModel]);

  useEffect(() => {
    messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight);
  }, [messages, streamingContent]);

  const sendMessage = async () => {
    if (!input.trim()) {
      dispatch(showNotification({ message: t.playgroundPage.enterMessage, type: 'error' }));
      return;
    }

    const userMessage = input.trim();
    dispatch(addMessage({ role: 'user', content: userMessage }));
    setInput('');
    dispatch(setSending(true));
    setStreamingContent('');

    try {
      const chatMessages = [
        ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
        ...messages.map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel || 'deepseek-chat',
          messages: chatMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
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
          message: error instanceof Error ? error.message : t.playgroundPage.requestFailed,
          type: 'error',
        })
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

  const currentModel = models.find((model) => model.id === selectedModel);
  const estimatedCost = currentModel ? (totalTokens / 1_000_000) * currentModel.input_price : 0;

  const handleClear = async () => {
    if (messages.length === 0) return;
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
    dispatch(showNotification({ message: t.playgroundPage.cleared }));
  };

  const codeExample = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="${selectedModel || 'deepseek-chat'}",
    messages=[
        {"role": "system", "content": "${systemMessage}"},
        {"role": "user", "content": "${t.playgroundPage.yourMessage}"}
    ],
    temperature=${temperature},
    max_tokens=${maxTokens}
)

print(response.choices[0].message.content)`;

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col">
        <section className="mb-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-end">
            <div className="space-y-5">
              <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">{t.playgroundPage.eyebrow}</span>
              </span>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight leading-[1.1] text-text-primary sm:text-4xl lg:text-5xl">{t.playgroundPage.title}</h1>
              <p className="max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">{t.playgroundPage.subtitle}</p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button onClick={() => setShowCode((value) => !value)} className="btn-primary rounded-full px-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <i className={`fas ${showCode ? 'fa-terminal' : 'fa-code'} mr-2`} />
                  {showCode ? t.playgroundPage.backToWorkbench : t.playgroundPage.showCode}
                </button>
                <Link href="/models" className="btn-secondary rounded-full px-6 no-underline hover:-translate-y-0.5 transition-transform bg-white/50 backdrop-blur-sm border-border">
                  <i className="fas fa-layer-group mr-2" />
                  {t.playgroundPage.openCatalog}
                </Link>
              </div>
            </div>

            <div className="editorial-panel space-y-5 p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border-border">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                {t.playgroundPage.sessionSnapshot}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/60 bg-dark-light/30 p-4">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">{t.playgroundPage.messageCount}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{messages.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-dark-light/30 p-4">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">{t.playgroundPage.token}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{totalTokens.toLocaleString()}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4">
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">{t.playgroundPage.currentModel}</div>
                <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">{currentModel?.model_name || t.playgroundPage.noModelSelected}</div>
                <div className="mt-2 text-xs leading-relaxed text-text-secondary font-medium">
                  {t.playgroundPage.currentModelHint.replace('{cost}', formatCurrency(estimatedCost))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          {[
            { title: t.playgroundPage.validationCard1Title, desc: t.playgroundPage.validationCard1Desc },
            { title: t.playgroundPage.validationCard2Title, desc: t.playgroundPage.validationCard2Desc },
            { title: t.playgroundPage.validationCard3Title, desc: t.playgroundPage.validationCard3Desc },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`rounded-[2rem] border p-6 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 ${index === 1 ? 'bg-primary/5 border-primary/20' : 'bg-white border-border'}`}
            >
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary inline-block bg-dark-light/50 px-2 py-1 rounded-md mb-3">{String(index + 1).padStart(2, '0')}</div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </section>

        <div className="flex-1 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[600px]">
          <aside className={`space-y-6 flex flex-col h-full ${showSettings ? 'block' : 'hidden lg:flex'}`}>
            <section className="editorial-panel p-6 sm:p-8 rounded-[2rem] bg-white border-border shadow-sm flex-1">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-1">{t.playgroundPage.controlDeck}</div>
                  <h2 className="text-2xl font-bold tracking-tight text-text-primary">{t.playgroundPage.settingsTitle}</h2>
                </div>
                <button onClick={handleClear} className="btn-secondary px-3 py-2 text-xs rounded-full hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors">
                  <i className="fas fa-trash-alt mr-1.5" />
                  {t.playgroundPage.clear}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{t.playgroundPage.model}</label>
                  <EditorialSelect
                    className="rounded-xl bg-dark-light/10 text-sm"
                    value={selectedModel}
                    onChange={(value) => dispatch(setSelectedModel(value))}
                    options={models.map((model) => ({
                      value: model.id,
                      label: model.model_name,
                    }))}
                  />
                </div>

                <div className="bg-dark-light/20 p-4 rounded-2xl border border-border/50">
                  <div className="mb-3 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                    <span>{t.playgroundPage.temperature}</span>
                    <span className="bg-white px-2 py-0.5 rounded shadow-sm text-text-primary">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    className="w-full accent-primary"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => dispatch(setTemperature(Number(e.target.value)))}
                  />
                </div>

                <div className="bg-dark-light/20 p-4 rounded-2xl border border-border/50">
                  <div className="mb-3 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                    <span>{t.playgroundPage.maxTokens}</span>
                    <span className="bg-white px-2 py-0.5 rounded shadow-sm text-text-primary">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    className="w-full accent-primary"
                    min="100"
                    max="4000"
                    step="100"
                    value={maxTokens}
                    onChange={(e) => dispatch(setMaxTokens(Number(e.target.value)))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{t.playgroundPage.systemPrompt}</label>
                  <textarea
                    className="form-control min-h-[140px] rounded-xl bg-dark-light/10 text-sm leading-relaxed focus:bg-white transition-colors resize-y"
                    value={systemMessage}
                    onChange={(e) => dispatch(setSystemMessage(e.target.value))}
                    placeholder="You are a helpful assistant..."
                  />
                </div>
              </div>
            </section>
          </aside>

          <section className="flex flex-col overflow-hidden rounded-[2.5rem] border border-border bg-white shadow-sm ring-1 ring-border/50">
            <div className="border-b border-border/60 bg-dark-light/20 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-bolt text-lg" />
                  </div>
                  <div>
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-0.5">{t.playgroundPage.workbench}</div>
                    <div className="text-xl font-bold tracking-tight text-text-primary">{showCode ? t.playgroundPage.codeSample : currentModel?.model_name || t.playgroundPage.readyToStart}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSettings((value) => !value)} className="btn-secondary rounded-full xl:hidden">
                    <i className={`fas ${showSettings ? 'fa-times' : 'fa-sliders-h'} mr-2`} />
                    {showSettings ? t.playgroundPage.toggleSettingsHide : t.playgroundPage.toggleSettingsShow}
                  </button>
                  {!showCode && (
                    <button
                      onClick={() => {
                        copyToClipboard(selectedModel || '');
                        dispatch(showNotification({ message: t.playgroundPage.copiedModelId }));
                      }}
                      className="btn-secondary rounded-full bg-white hover:border-primary/30 transition-colors"
                    >
                      <i className="fas fa-copy mr-2 opacity-70" />
                      {t.playgroundPage.copyModelId}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showCode ? (
              <div className="flex-1 p-6 sm:p-8 bg-dark-light/5">
                <div className="mb-5 flex items-center justify-between">
                  <div className="text-sm font-semibold text-text-primary">{t.playgroundPage.pythonExample}</div>
                  <button
                    onClick={() => {
                      copyToClipboard(codeExample);
                      dispatch(showNotification({ message: t.playgroundPage.copiedCode }));
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
                <div ref={messagesRef} className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
                  {messages.length === 0 && !streamingContent ? (
                    <div className="flex h-full flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white border border-border shadow-sm text-3xl text-primary animate-bounce-slow">
                        <i className="fas fa-sparkles" />
                      </div>
                      <div className="text-3xl font-bold tracking-tight text-text-primary mb-3">{t.playgroundPage.emptyTitle}</div>
                      <p className="text-base leading-relaxed text-text-secondary">
                        {t.playgroundPage.emptyDesc}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[90%] rounded-[1.5rem] px-5 py-4 sm:max-w-[80%] shadow-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-white rounded-tr-sm'
                                : 'border border-border/60 bg-white text-text-primary rounded-tl-sm'
                            }`}
                          >
                            <div className={`mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] flex items-center gap-2 ${message.role === 'user' ? 'text-white/80' : 'text-text-secondary'}`}>
                              {message.role === 'user' ? <i className="fas fa-user text-[10px]" /> : <i className="fas fa-robot text-[10px]" />}
                              {message.role === 'user' ? 'Operator' : currentModel?.model_name || 'Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                          </div>
                        </div>
                      ))}

                      {streamingContent && (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] rounded-[1.5rem] rounded-tl-sm border border-border/60 bg-white shadow-sm px-5 py-4 text-text-primary sm:max-w-[80%]">
                            <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary flex items-center gap-2">
                              <i className="fas fa-robot text-[10px]" />
                              {currentModel?.model_name || 'Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                              {streamingContent}
                              <span className="animate-pulse ml-1 text-primary">▊</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {sending && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="rounded-[1.5rem] rounded-tl-sm border border-border/60 bg-white shadow-sm px-5 py-3 text-primary flex items-center gap-3">
                        <i className="fas fa-circle-notch fa-spin text-lg" />
                        <span className="text-sm font-medium text-text-secondary">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 bg-white p-5 sm:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end relative max-w-4xl mx-auto">
                    <textarea
                      className="form-control min-h-[60px] max-h-[200px] flex-1 resize-y rounded-2xl bg-dark-light/10 focus:bg-white transition-colors border-border/60 text-base py-4 px-5 pr-14"
                      placeholder={t.playgroundPage.inputPlaceholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <button
                      className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      onClick={sendMessage}
                      disabled={sending || !input.trim()}
                      title={t.playgroundPage.send}
                    >
                      {sending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                    </button>
                  </div>
                  <div className="text-center mt-3 text-[0.65rem] text-text-secondary max-w-4xl mx-auto">
                    Shift + Enter for new line. AI models can make mistakes.
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
