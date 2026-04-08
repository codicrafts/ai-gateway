'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { useTranslation } from '@/hooks/useTranslation';
import type { DocsReference } from '@/services/docs/docs-reference.service';

function CodeBlock({
  title,
  children,
  copyLabel,
  copiedLabel,
  method,
}: {
  title: string;
  children: string;
  copyLabel: string;
  copiedLabel: string;
  method?: { type: string; path: string };
}) {
  const dispatch = useAppDispatch();
  const copy = () => {
    navigator.clipboard.writeText(children).then(() =>
      dispatch(showNotification({ message: copiedLabel }))
    );
  };

  return (
    <div className="relative my-3 sm:my-4 md:my-6 overflow-hidden rounded-lg sm:rounded-[1.25rem] border border-[#2f2620] bg-[#17120f] shadow-soft">
      <div className="flex flex-col items-start justify-between gap-2 border-b border-[#3c3128] bg-[rgba(255,248,238,0.06)] px-3 py-2 xs:flex-row xs:items-center sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {method ? (
            <>
              <span
                className={`rounded px-2 py-0.5 text-[0.65rem] sm:text-xs font-semibold sm:px-3 sm:py-1 ${
                  method.type === 'POST'
                    ? 'bg-success/20 text-success'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {method.type}
              </span>
              <code className="break-all text-[0.7rem] sm:text-xs md:text-sm text-[#f7efe1]">{method.path}</code>
            </>
          ) : (
            <span className="text-[0.7rem] sm:text-xs md:text-sm text-[#f7efe1]">{title}</span>
          )}
        </div>
        <button
          onClick={copy}
          className="whitespace-nowrap rounded border border-[#6b5a49] bg-transparent px-2 py-1 text-[0.65rem] sm:text-xs text-[#f7efe1] transition-all hover:border-primary hover:bg-primary sm:px-3"
        >
          <i className="fas fa-copy" /> {copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 sm:p-4 md:p-6">
        <code className="font-mono text-[0.7rem] sm:text-xs md:text-sm leading-relaxed text-[#f3e5d1]">{children}</code>
      </pre>
    </div>
  );
}

export default function DocsPageClient({
  initialReference,
  initialReferenceError = '',
}: {
  initialReference: DocsReference | null;
  initialReferenceError?: string;
}) {
  const t = useTranslation();
  const locale = useAppSelector((state) => state.locale.locale);
  const [activeSection, setActiveSection] = useState('introduction');
  const [showNav, setShowNav] = useState(false);
  const reference = initialReference;
  const referenceError = initialReferenceError;

  const sections = [
    { id: 'introduction', label: t.docsPage.sections[0] },
    { id: 'authentication', label: t.docsPage.sections[1] },
    { id: 'chat-completions', label: t.docsPage.sections[2] },
    { id: 'image-generation', label: t.docsPage.sections[3] },
    { id: 'error-handling', label: t.docsPage.sections[4] },
    { id: 'rate-limits', label: t.docsPage.sections[5] },
    { id: 'usage-billing', label: t.docsPage.sections[6] },
    { id: 'examples', label: t.docsPage.sections[7] },
  ];
  const authHintParts = t.docsPage.authHintTemplate.split('{console}');

  const liveStats = useMemo(() => {
    if (!reference) {
      return [
        { key: 'models', label: t.docsPage.liveModels, value: '...', desc: t.docsPage.liveLoading },
        { key: 'providers', label: t.docsPage.liveProviders, value: '...', desc: t.docsPage.liveLoading },
        { key: 'endpoints', label: t.docsPage.liveEndpoints, value: '...', desc: t.docsPage.liveLoading },
      ];
    }

    return [
      {
        key: 'models',
        label: t.docsPage.liveModels,
        value: String(reference.supportedModelCount),
        desc: t.docsPage.liveModelsDesc,
      },
      {
        key: 'providers',
        label: t.docsPage.liveProviders,
        value: String(reference.providerCount),
        desc: reference.providers.join(' / '),
      },
      {
        key: 'endpoints',
        label: t.docsPage.liveEndpoints,
        value: String(reference.endpoints.length),
        desc: t.docsPage.liveEndpointsDesc,
      },
    ];
  }, [reference, t.docsPage.liveEndpoints, t.docsPage.liveEndpointsDesc, t.docsPage.liveLoading, t.docsPage.liveModels, t.docsPage.liveModelsDesc, t.docsPage.liveProviders]);

  const featuredTextModel = reference?.featuredModel || 'gpt-4.1';
  const featuredImageModel = reference?.imageModel || 'dall-e-3';
  const baseUrl = reference?.baseUrl || 'https://api.aigateway.com/api/openai/v1';
  const endpointRows = reference?.endpoints || [];
  const modelRows = reference?.models || [];
  const statusCodes = reference?.statusCodes || [];
  const rateLimits = reference?.rateLimits || [];
  const pricingRules = reference?.pricingRules || [];
  const billingRails = reference?.billingRails || [];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar />
      <div className="mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-16">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[280px_1fr]">
          <button
            onClick={() => setShowNav(!showNav)}
            className="flex items-center justify-between rounded-xl sm:rounded-[1.5rem] border border-border bg-white p-4 sm:p-5 shadow-sm lg:hidden hover:shadow-md transition-shadow"
          >
            <span className="font-semibold text-sm sm:text-base">{t.docsPage.mobileNav}</span>
            <i className={`fas fa-chevron-${showNav ? 'up' : 'down'} text-sm`} />
          </button>

          <div className={`h-fit lg:sticky lg:top-24 ${showNav ? 'block' : 'hidden lg:block'}`}>
            <nav className="rounded-xl sm:rounded-[2rem] border border-border bg-white/60 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
              <h3 className="mb-3 sm:mb-4 text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary">{t.docsPage.toc}</h3>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => {
                    setActiveSection(section.id);
                    setShowNav(false);
                  }}
                  className={`mb-1 block rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium transition-all no-underline ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:bg-dark-light/50 hover:text-text-primary'
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] border border-border bg-white/80 backdrop-blur-sm p-4 sm:p-6 md:p-10 lg:p-16 shadow-sm">
            <h1 id="introduction" className="mb-3 sm:mb-4 text-[2rem] font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              {t.docsPage.title}
            </h1>
            <p className="mb-6 sm:mb-8 text-[0.9rem] sm:text-lg leading-relaxed text-text-secondary max-w-3xl">{t.docsPage.intro}</p>

            <div className="mb-8 sm:mb-10 grid gap-4 sm:gap-5 sm:grid-cols-3">
              {[
                { title: t.docsPage.card1Title, desc: t.docsPage.card1Desc },
                { title: t.docsPage.card2Title, desc: t.docsPage.card2Desc },
                { title: t.docsPage.card3Title, desc: t.docsPage.card3Desc },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`rounded-xl sm:rounded-[2rem] border p-4 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-md ${
                    index === 1 ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-border bg-white shadow-sm'
                  }`}
                >
                  <div className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-text-secondary mb-2 sm:mb-3 inline-block bg-dark-light/50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-text-primary tracking-tight">{item.title}</h3>
                  <p className="mt-2 sm:mt-3 text-[0.8rem] sm:text-sm leading-relaxed text-text-secondary">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 sm:mb-12 rounded-xl sm:rounded-[2rem] border border-primary/20 bg-primary/5 p-4 sm:p-6 md:p-8 shadow-sm">
              <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-text-secondary inline-flex items-center gap-1.5 sm:gap-2">
                    {t.docsPage.liveReference}
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-pulse"></span>
                  </div>
                  <h3 className="mt-2 sm:mt-3 text-lg sm:text-2xl font-bold tracking-tight text-text-primary">{t.docsPage.liveReferenceTitle}</h3>
                  <p className="mt-1.5 sm:mt-2 text-[0.8rem] sm:text-sm leading-relaxed text-text-secondary max-w-xl">
                    {reference ? t.docsPage.liveReferenceDesc : t.docsPage.liveReferenceLoading}
                  </p>
                </div>
                {referenceError ? (
                  <div className="rounded-lg sm:rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium text-warning shadow-sm">
                    {referenceError}
                  </div>
                ) : null}
              </div>
              <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-5 sm:grid-cols-3">
                {liveStats.map((item) => (
                  <div key={item.key} className="rounded-xl sm:rounded-[1.5rem] border border-border/60 bg-white/60 p-4 sm:p-5 shadow-sm hover:bg-white transition-colors">
                    <div className="text-[0.625rem] sm:text-[0.68rem] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{item.label}</div>
                    <div className="mt-2 sm:mt-3 text-[2rem] sm:text-4xl font-bold tracking-tight text-text-primary">{item.value}</div>
                    <p className="mt-1.5 sm:mt-2 text-[0.8rem] sm:text-sm leading-relaxed text-text-secondary line-clamp-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="mt-12 sm:mt-16 mb-4 sm:mb-6 border-b border-border/60 pb-3 sm:pb-4 text-[1.75rem] sm:text-3xl md:text-4xl font-bold tracking-tight">
              {t.docsPage.quickStart}
            </h2>
            <p className="mb-4 sm:mb-6 text-[0.9rem] sm:text-base leading-relaxed text-text-secondary">{t.docsPage.quickStartDesc}</p>
            <h3 className="mt-6 sm:mt-8 mb-3 sm:mb-4 text-base sm:text-xl font-bold tracking-tight">{t.docsPage.baseUrl}</h3>
            <CodeBlock title={t.docsPage.endpoint} copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>
              {baseUrl}
            </CodeBlock>

            <h3 className="mt-8 sm:mt-10 mb-3 sm:mb-4 text-base sm:text-xl font-bold tracking-tight">{t.docsPage.supportedEndpoints}</h3>
            <p className="mb-4 sm:mb-6 text-[0.9rem] sm:text-base leading-relaxed text-text-secondary">{t.docsPage.supportedEndpointsDesc}</p>
            <div className="overflow-x-auto rounded-xl sm:rounded-[1.5rem] border border-border shadow-sm">
              <table className="w-full min-w-[500px] border-collapse bg-white">
                <thead>
                  <tr className="bg-dark-light/30">
                    {[t.docsPage.endpointName, t.docsPage.methodLabel, t.docsPage.pathLabel, t.docsPage.providerCoverage, t.docsPage.modelCoverage].map((heading) => (
                      <th key={heading} className="border-b border-border p-3 sm:p-4 text-left text-[0.65rem] sm:text-[0.75rem] font-bold uppercase tracking-wider text-text-secondary">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {endpointRows.length > 0 ? (
                    endpointRows.map((row) => (
                      <tr key={`${row.method}:${row.path}`} className="hover:bg-dark-light/10 transition-colors">
                        <td className="p-4 text-sm font-medium text-text-primary">{row.label}</td>
                        <td className="p-4">
                          <code className={`rounded-md px-2 py-1 text-xs font-bold ${row.method === 'POST' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>{row.method}</code>
                        </td>
                        <td className="p-4">
                          <code className="rounded-md bg-dark-light/50 px-2 py-1 text-sm text-text-secondary font-mono">{row.path}</code>
                        </td>
                        <td className="p-4 text-sm text-text-secondary">{row.providerCount}</td>
                        <td className="p-4 text-sm text-text-secondary">{row.modelCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-text-secondary">
                        {t.docsPage.liveReferenceLoading}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="mt-10 mb-4 text-xl font-bold tracking-tight">{t.docsPage.supportedModels}</h3>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.supportedModelsDesc}</p>
            <div className="overflow-x-auto rounded-[1.5rem] border border-border shadow-sm">
              <table className="w-full min-w-[700px] border-collapse bg-white">
                <thead>
                  <tr className="bg-dark-light/30">
                    {[
                      t.docsPage.modelNameLabel,
                      t.docsPage.providerLabel,
                      t.docsPage.categoryLabel,
                      t.docsPage.contextLabel,
                      t.docsPage.inputPriceLabel,
                      t.docsPage.outputPriceLabel,
                    ].map((heading) => (
                      <th key={heading} className="border-b border-border p-4 text-left text-[0.75rem] font-bold uppercase tracking-wider text-text-secondary">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {modelRows.length > 0 ? (
                    modelRows.map((row) => (
                      <tr key={row.id} className="hover:bg-dark-light/10 transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-text-primary">{row.modelName}</span>
                            {row.sourceUrl ? (
                              <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                                {t.docsPage.sourceLabel} <i className="fas fa-external-link-alt text-[10px]" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-text-secondary">{row.provider}</td>
                        <td className="p-4 text-sm capitalize text-text-secondary">{row.category}</td>
                        <td className="p-4 text-sm text-text-secondary">
                          {row.contextLength > 0 ? <span className="bg-dark-light/40 px-2 py-0.5 rounded-md">{row.contextLength.toLocaleString()}</span> : '-'}
                        </td>
                        <td className="p-4 text-sm text-text-secondary">
                          <span className="font-mono">${row.inputPrice.toFixed(2)}</span><span className="text-xs opacity-70">/1M</span>
                        </td>
                        <td className="p-4 text-sm text-text-secondary">
                          <span className="font-mono">${row.outputPrice.toFixed(2)}</span><span className="text-xs opacity-70">/1M</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm text-text-secondary">
                        {t.docsPage.liveReferenceLoading}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 id="authentication" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.authentication}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.authDesc}</p>
            <CodeBlock title={t.docsPage.authHeader} copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>
              Authorization: Bearer YOUR_API_KEY
            </CodeBlock>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary bg-dark-light/20 p-4 rounded-xl border border-border">
              <i className="fas fa-info-circle text-primary mr-2" />
              {authHintParts[0]}
              <Link href="/dashboard" className="text-primary font-medium hover:underline">
                {t.docsPage.console}
              </Link>
              {authHintParts[1]}
            </p>

            <h2 id="chat-completions" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.chatCompletions}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.chatDesc}</p>
            <h3 className="mt-8 mb-4 text-xl font-bold tracking-tight">{t.docsPage.request}</h3>
            <CodeBlock
              title={t.docsPage.request}
              copyLabel={t.docsPage.copy}
              copiedLabel={t.docsPage.copied}
              method={{ type: 'POST', path: '/chat/completions' }}
            >{`{
  "model": "${featuredTextModel}",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}`}</CodeBlock>

            <h3 className="mt-10 mb-4 text-xl font-bold tracking-tight">{t.docsPage.parameters}</h3>
            <div className="overflow-x-auto rounded-[1.5rem] border border-border shadow-sm">
              <table className="w-full min-w-[500px] border-collapse bg-white">
                <thead>
                  <tr className="bg-dark-light/30">
                    {[t.docsPage.param, t.docsPage.type, t.docsPage.required, t.docsPage.explanation].map((heading) => (
                      <th key={heading} className="border-b border-border p-4 text-left text-[0.75rem] font-bold uppercase tracking-wider text-text-secondary">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ['model', 'string', t.docsPage.yes, t.docsPage.modelIdDesc],
                    ['messages', 'array', t.docsPage.yes, t.docsPage.messagesDesc],
                    ['temperature', 'number', t.docsPage.no, t.docsPage.temperatureDesc],
                    ['max_tokens', 'integer', t.docsPage.no, t.docsPage.maxTokensDesc],
                  ].map((row) => (
                    <tr key={row[0]} className="hover:bg-dark-light/5 transition-colors">
                      <td className="p-4">
                        <code className="rounded-md bg-dark-light/50 px-2 py-1 text-sm text-text-primary font-mono font-semibold">{row[0]}</code>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{row[1]}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${row[2] === t.docsPage.yes ? 'bg-warning/10 text-warning' : 'bg-dark-light/50 text-text-secondary'}`}>
                          {row[2]}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-10 mb-4 text-xl font-bold tracking-tight">{t.docsPage.response}</h3>
            <CodeBlock title={t.docsPage.response} copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>{`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "${featuredTextModel}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}`}</CodeBlock>

            <h2 id="image-generation" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.imageGeneration}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.imageDesc}</p>
            <CodeBlock
              title={t.docsPage.request}
              copyLabel={t.docsPage.copy}
              copiedLabel={t.docsPage.copied}
              method={{ type: 'POST', path: '/images/generations' }}
            >{`{
  "model": "${featuredImageModel}",
  "prompt": "A futuristic cityscape at sunset",
  "size": "1024x1024",
  "n": 1
}`}</CodeBlock>

            <h2 id="error-handling" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.errorHandling}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.errorDesc}</p>
            <div className="overflow-x-auto rounded-[1.5rem] border border-border shadow-sm">
              <table className="w-full min-w-[400px] border-collapse bg-white">
                <thead>
                  <tr className="bg-dark-light/30">
                    <th className="border-b border-border p-4 text-left text-[0.75rem] font-bold uppercase tracking-wider text-text-secondary">{t.docsPage.statusCode}</th>
                    <th className="border-b border-border p-4 text-left text-[0.75rem] font-bold uppercase tracking-wider text-text-secondary">{t.docsPage.explanation}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {statusCodes.map((row) => (
                    <tr key={row.code} className="hover:bg-dark-light/5 transition-colors">
                      <td className="p-4">
                        <code className={`rounded-md px-2 py-1 text-sm font-bold ${row.code.startsWith('2') ? 'bg-success/10 text-success' : row.code.startsWith('4') ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                          {row.code}
                        </code>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">
                        {locale === 'zh' ? row.descriptionZh : row.descriptionEn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 id="rate-limits" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.rateLimits}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.rateLimitsDesc}</p>
            <div className="rounded-[1.5rem] border border-border bg-white p-6 shadow-sm">
              <ul className="space-y-3 text-sm leading-relaxed text-text-secondary">
                {rateLimits.map((item) => (
                  <li key={item.key} className="flex items-start gap-3">
                    <i className="fas fa-check-circle text-primary mt-1" />
                    <span className="flex-1">{locale === 'zh' ? item.labelZh : item.labelEn}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h2 id="usage-billing" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.usageBilling}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-text-secondary">{t.docsPage.usageBillingDesc}</p>
            <div className="grid gap-5 sm:grid-cols-2 mb-8">
              {billingRails.map((item) => (
                <div key={item.key} className="rounded-[1.5rem] border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary">
                    {locale === 'zh' ? item.labelZh : item.labelEn}
                  </div>
                  <div className="mt-3 text-2xl font-bold tracking-tight text-text-primary">
                    {locale === 'zh' ? item.valueZh : item.valueEn}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-5">
              {pricingRules.map((rule) => (
                <div key={rule.key} className="rounded-[1.5rem] border border-border bg-dark-light/20 p-6">
                  <div className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <i className="fas fa-info-circle text-primary opacity-80" />
                    {locale === 'zh' ? rule.titleZh : rule.titleEn}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {locale === 'zh' ? rule.bodyZh : rule.bodyEn}
                  </p>
                </div>
              ))}
            </div>

            <h2 id="examples" className="mt-16 mb-6 border-b border-border/60 pb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.docsPage.examples}
            </h2>
            <h3 className="mt-8 mb-4 text-xl font-bold tracking-tight">Python</h3>
            <CodeBlock title={t.docsPage.pythonSdk} copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>{`import requests

url = "${baseUrl}/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "${featuredTextModel}",
    "messages": [
        {"role": "user", "content": "Hello!"}
    ]
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`}</CodeBlock>

            <h3 className="mt-10 mb-4 text-xl font-bold tracking-tight">Node.js</h3>
            <CodeBlock title="Node.js" copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>{`const response = await fetch(
  '${baseUrl}/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: '${featuredTextModel}',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  }
);

const data = await response.json();
console.log(data);`}</CodeBlock>

            <h3 className="mt-10 mb-4 text-xl font-bold tracking-tight">cURL</h3>
            <CodeBlock title="cURL" copyLabel={t.docsPage.copy} copiedLabel={t.docsPage.copied}>{`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${featuredTextModel}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</CodeBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
