'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPricePerMillion } from '@/utils/modelPricing';
import { Model } from '@ai-gateway/shared-types';

type CodeTab = 'python' | 'skill';

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Mistral', 'Meta', 'Stability'];

export default function HomePageClient({ initialModels }: { initialModels: Model[] }) {
  const dispatch = useAppDispatch();
  const [models] = useState<Model[]>(initialModels);
  const [codeTab, setCodeTab] = useState<CodeTab>('python');
  const t = useTranslation();

  const codeExamples = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4-turbo",
    messages=[{"role": "user", "content": "Give me a launch checklist."}]
)`,
    skill: `# Claude / Codex / Gemini skill install
git clone https://github.com/your-org/ai-gateway-skill

export AI_GATEWAY_API_KEY="your-api-key"
export AI_GATEWAY_BASE_URL="https://api.aigateway.com/v1"

# Start using one gateway across multiple models`,
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[codeTab]).then(() => {
      dispatch(showNotification({ message: t.home.copied }));
    });
  };

  const capabilityCards = [
    {
      icon: 'fa-globe',
      title: t.home.capabilityUnifiedModelsTitle,
      description: t.home.capabilityUnifiedModelsDesc,
    },
    {
      icon: 'fa-code',
      title: t.home.capabilityUnifiedApiTitle,
      description: t.home.capabilityUnifiedApiDesc,
    },
    {
      icon: 'fa-shield-halved',
      title: t.home.capabilityReliabilityTitle,
      description: t.home.capabilityReliabilityDesc,
    },
    {
      icon: 'fa-bolt',
      title: t.home.capabilityLatencyTitle,
      description: t.home.capabilityLatencyDesc,
      accent: true,
    },
    {
      icon: 'fa-chart-column',
      title: t.home.capabilityBillingTitle,
      description: t.home.capabilityBillingDesc,
    },
    {
      icon: 'fa-layer-group',
      title: t.home.capabilityMultimodalTitle,
      description: t.home.capabilityMultimodalDesc,
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-background relative">
      {/* Subtle background glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      
      <Navbar />

      <main>
        <section className="relative py-12 sm:py-20 lg:py-28">
          <div className="section-shell">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)] lg:items-center lg:gap-16">
              <div className="space-y-8 lg:pr-6">
                <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-medium tracking-wider">{t.brand.bureau}</span>
                </span>

                <div className="max-w-4xl">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
                    {t.home.heroKicker}
                  </p>
                  <h1 className="max-w-5xl text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-[4.5rem]">
                    {t.home.heroLead}
                    <span className="block text-primary mt-2">{t.home.heroAccent}</span>
                  </h1>
                </div>

                <p className="max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
                  {t.home.subtitle} {t.home.heroExtra}
                </p>

                <div className="flex flex-col gap-4 sm:flex-row pt-2">
                  <Link href="/login" className="btn-primary btn-large no-underline justify-center shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300">
                    <i className="fas fa-arrow-up-right-from-square mr-2" />
                    {t.home.getApiKey}
                  </Link>
                  <Link href="/docs" className="btn-secondary btn-large no-underline justify-center hover:-translate-y-0.5 transition-transform duration-300 bg-white/50 backdrop-blur-sm">
                    <i className="fas fa-file-lines mr-2" />
                    {t.home.viewDocs}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-text-secondary pt-4">
                  {[t.home.heroTagApi, t.home.heroTagBilling, t.home.heroTagIsolation].map((item) => (
                    <span key={item} className="rounded-full border border-border bg-white/60 backdrop-blur-sm px-4 py-2 uppercase tracking-[0.12em] shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-5 lg:max-w-[32rem] lg:justify-self-end relative z-10 mt-8 lg:mt-0">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent opacity-50 blur-2xl -z-10 rounded-full"></div>
                <div className="editorial-panel rotate-[-1deg] border-2 border-text-primary/90 p-6 sm:p-8 shadow-2xl bg-white/95 backdrop-blur-xl transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
                  <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                    <span className="text-xs uppercase tracking-[0.24em] text-text-secondary font-medium">{t.home.launchDesk}</span>
                    <span className="rounded-full bg-success/20 border border-success/30 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-success font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                      {t.home.live}
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {[
                      { label: t.home.providersLabel, value: '7+', note: t.home.providersNote },
                      { label: t.home.routingLabel, value: t.home.routingValue, note: t.home.routingNote },
                      { label: t.home.accountsLabel, value: t.home.accountsValue, note: t.home.accountsNote },
                      { label: t.home.billingLabel, value: t.home.billingValue, note: t.home.billingNote },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/80 bg-dark-light/30 p-4 hover:bg-white hover:shadow-md transition-all duration-300">
                        <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">{item.label}</div>
                        <div className="mt-2 text-3xl font-bold text-text-primary tracking-tight">{item.value}</div>
                        <div className="mt-1 text-xs text-text-secondary">{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="editorial-panel bg-[#1f1815] p-6 sm:p-7 text-[#f3e5d1] shadow-xl hover:-translate-y-1 transition-transform duration-300">
                    <div className="text-[0.7rem] uppercase tracking-[0.22em] text-[#d7bea1] opacity-80">{t.home.promise}</div>
                    <div className="mt-4 max-w-[12ch] font-serif text-2xl italic leading-snug sm:text-3xl text-white">
                      {t.home.promiseCopy}
                    </div>
                  </div>
                  <div className="editorial-panel border-dashed border-2 p-6 sm:p-7 bg-primary/5 hover:bg-primary/10 transition-colors duration-300">
                    <div className="text-[0.7rem] uppercase tracking-[0.22em] text-text-secondary">{t.home.starterCreditLabel}</div>
                    <div className="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                      {t.home.freeCredit}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 sm:mt-24 overflow-hidden rounded-full border border-border bg-white/75 px-6 py-4 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
                {PROVIDERS.map((provider) => (
                  <span key={provider} className="hover:text-text-primary transition-colors cursor-default">{provider}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 bg-dark-light/30 border-y border-border">
          <div className="section-shell">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow inline-block bg-white px-3 py-1 rounded-full border border-border shadow-sm mb-4">{t.home.quickStartLabel}</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{t.home.quickStartTitle}</h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-text-secondary">
                {t.home.quickStartLead}
              </p>
            </div>

            <div className="editorial-panel overflow-hidden border-0 shadow-2xl rounded-[2rem] bg-white ring-1 ring-border">
              <div className="flex flex-col gap-4 border-b border-border/10 bg-[#161b22] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 bg-[#0d1117] p-1 rounded-full ring-1 ring-white/10">
                  {(['python', 'skill'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCodeTab(tab)}
                      className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 ${
                        codeTab === tab 
                          ? 'bg-primary text-white shadow-md' 
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab === 'python' ? t.home.codeTabPython : t.home.codeTabSkill}
                    </button>
                  ))}
                </div>
                <button onClick={copyCode} className="rounded-full bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary transition-all duration-300 hover:text-white hover:bg-white/10 ring-1 ring-white/10">
                  <i className="fas fa-copy mr-2" />
                  {t.home.copy}
                </button>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                <pre className="overflow-x-auto bg-[#0d1117] p-8 text-sm leading-8 text-[#e6edf3] font-mono">
                  <code>{codeExamples[codeTab]}</code>
                </pre>
                <div className="space-y-6 bg-white p-8 lg:border-l border-border">
                  {[
                    { index: '01', title: t.home.quickStartStep1Title, desc: t.home.quickStartStep1Desc },
                    { index: '02', title: t.home.quickStartStep2Title, desc: t.home.quickStartStep2Desc },
                    { index: '03', title: t.home.quickStartStep3Title, desc: t.home.quickStartStep3Desc },
                  ].map((item) => (
                    <div key={item.index} className="rounded-[1.5rem] border border-border bg-dark-light/20 p-6 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="text-xs uppercase tracking-[0.22em] text-primary font-bold bg-primary/10 inline-block px-2 py-1 rounded-md mb-3">{item.index}</div>
                      <div className="text-xl font-bold group-hover:text-primary transition-colors">{item.title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="section-shell">
            <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between text-center lg:text-left">
              <div className="mx-auto lg:mx-0">
                <span className="eyebrow inline-block bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full border shadow-sm mb-4">{t.home.capabilitiesLabel}</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{t.home.capabilitiesTitle}</h2>
              </div>
              <p className="max-w-2xl text-lg leading-relaxed text-text-secondary mx-auto lg:mx-0">
                {t.home.capabilitiesLead}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((card) => (
                <article
                  key={card.title}
                  className={`editorial-panel group min-h-[18rem] overflow-hidden border rounded-[2rem] bg-white p-8 sm:p-10 transition-all duration-400 hover:-translate-y-2 ${
                    card.accent 
                      ? 'shadow-md shadow-primary/10 ring-1 ring-primary/20 hover:shadow-xl hover:shadow-primary/20' 
                      : 'shadow-sm ring-1 ring-transparent hover:shadow-xl hover:shadow-dark-light hover:ring-border'
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                        card.accent
                          ? 'border-primary/30 bg-primary/10 text-primary shadow-inner group-hover:bg-primary/20'
                          : 'border-border bg-dark-light/50 text-text-secondary group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20'
                      }`}
                    >
                      <i className={`fas ${card.icon} text-2xl`} />
                    </div>

                    <h3 className="mt-8 text-2xl font-bold tracking-tight leading-snug">{card.title}</h3>
                    <p className="mt-4 text-base leading-relaxed text-text-secondary">{card.description}</p>

                    <div className="mt-auto pt-8">
                       <div className={`h-[2px] w-12 rounded-full transition-all duration-500 group-hover:w-full group-hover:opacity-100 ${
                         card.accent ? 'bg-primary opacity-50' : 'bg-border group-hover:bg-primary opacity-50'
                       }`} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 bg-dark-light/30 border-t border-border">
          <div className="section-shell">
            <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between text-center sm:text-left">
              <div>
                <span className="eyebrow inline-block bg-white px-3 py-1 rounded-full border border-border shadow-sm mb-4">{t.home.catalogLabel}</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{t.home.supportedModels}</h2>
              </div>
              <Link href="/models" className="btn-secondary no-underline w-full justify-center sm:w-auto rounded-full px-6 shadow-sm hover:shadow-md transition-shadow">
                {t.home.viewAllModels}
                <i className="fas fa-arrow-right ml-2" />
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {models.map((model) => (
                <div key={model.id} className="editorial-panel group overflow-hidden border rounded-[2rem] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between border-b border-border bg-dark-light/40 px-6 py-5 group-hover:bg-primary/5 transition-colors duration-300">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-text-secondary font-semibold">{model.provider}</div>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight">{model.model_name}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider shadow-sm ${model.category === 'text' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                      {model.category}
                    </span>
                  </div>
                  <div className="space-y-6 p-6 sm:p-8">
                    <p className="min-h-[84px] text-sm leading-relaxed text-text-secondary [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical] overflow-hidden">
                      {model.description}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-2xl border border-border bg-dark-light/30 p-4 transition-colors group-hover:bg-white group-hover:border-primary/20">
                        <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">{t.home.inputLabel}</div>
                        <div className="mt-2 text-lg font-bold leading-tight text-text-primary break-words">
                          {formatPricePerMillion(model.input_price)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-dark-light/30 p-4 transition-colors group-hover:bg-white group-hover:border-primary/20">
                        <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">{t.home.outputLabel}</div>
                        <div className="mt-2 text-lg font-bold leading-tight text-text-primary break-words">
                          {formatPricePerMillion(model.output_price)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-5 text-xs uppercase tracking-[0.18em] font-semibold text-text-secondary">
                      <span className="flex items-center gap-1.5 bg-dark-light/50 px-2.5 py-1 rounded-md"><i className="fas fa-layer-group opacity-50"/> {model.context_length.toLocaleString()} ctx</span>
                      <Link href="/playground" className="text-primary no-underline hover:text-primary/80 flex items-center gap-1">
                        {t.home.openInPlayground} <i className="fas fa-chevron-right text-[10px]" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
