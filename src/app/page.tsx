'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { Model } from '@/types';

export default function HomePage() {
  const dispatch = useAppDispatch();
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    fetch('/api/tables/models?limit=6')
      .then((r) => r.json())
      .then((res) => setModels(res.data || []))
      .catch(() => {});
  }, []);

  const copyCode = () => {
    const code = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4-turbo",  # 或 claude-3-opus, deepseek-chat...
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`;
    navigator.clipboard.writeText(code).then(() => {
      dispatch(showNotification({ message: '已复制到剪贴板' }));
    });
  };

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-[1200px] mx-auto px-5 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm mb-6">
            <i className="fas fa-bolt" />
            <span>统一 API 接入 100+ AI 模型</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">
              一个 API，调用所有 LLM
            </span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-[800px] mx-auto leading-relaxed">
            统一接口访问 OpenAI、Anthropic、Google、DeepSeek 等顶级模型。
            <br className="hidden md:block" />
            智能路由、自动 Fallback、成本直降 40%。
          </p>
          <div className="flex gap-4 justify-center mb-8 flex-wrap">
            <Link href="/register" className="btn-primary btn-large no-underline">
              <i className="fas fa-rocket" /> 免费获取 API Key
            </Link>
            <Link href="/docs" className="btn-secondary btn-large no-underline">
              <i className="fas fa-book" /> 查看文档
            </Link>
          </div>
          <p className="text-text-secondary text-sm">
            <i className="fas fa-gift text-success mr-2" />
            新用户赠送 $5 额度，无需信用卡
          </p>
        </div>
      </section>

      {/* Quick Start Code */}
      <section className="py-16 bg-dark-light/20">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">3 分钟快速接入</h2>
            <p className="text-text-secondary">兼容 OpenAI SDK，只需更改 base_url 即可使用</p>
          </div>
          <div className="bg-dark/80 border border-border rounded-xl overflow-hidden max-w-[800px] mx-auto">
            <div className="flex justify-between items-center px-6 py-4 bg-dark-light/80 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-danger" />
                <span className="w-3 h-3 rounded-full bg-warning" />
                <span className="w-3 h-3 rounded-full bg-success" />
                <span className="ml-4 text-text-secondary text-sm">Python</span>
              </div>
              <button onClick={copyCode} className="text-text-secondary hover:text-primary transition-colors text-sm">
                <i className="fas fa-copy mr-2" />复制代码
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm">
              <code className="font-mono leading-relaxed">
                <span className="text-secondary">from</span> <span className="text-primary">openai</span> <span className="text-secondary">import</span> OpenAI{'\n\n'}
                client = OpenAI({'\n'}
                {'    '}base_url=<span className="text-success">"https://api.aigateway.com/v1"</span>,{'\n'}
                {'    '}api_key=<span className="text-success">"your-api-key"</span>{'\n'}
                ){'\n\n'}
                response = client.chat.completions.create({'\n'}
                {'    '}model=<span className="text-success">"gpt-4-turbo"</span>,  <span className="text-text-secondary"># 或 claude-3-opus, deepseek-chat...</span>{'\n'}
                {'    '}messages=[{'{'}role: <span className="text-success">"user"</span>, content: <span className="text-success">"Hello!"</span>{'}'}]{'\n'}
                ){'\n'}
                <span className="text-secondary">print</span>(response.choices[<span className="text-warning">0</span>].message.content)
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Supported Models */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">支持 100+ 主流模型</h2>
            <p className="text-text-secondary">一个 API Key 访问所有模型，无需分别注册</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Mistral', 'Meta', 'Stability AI'].map((provider) => (
              <div key={provider} className="px-6 py-3 bg-dark/60 border border-border rounded-lg text-text-secondary hover:border-primary hover:text-primary transition-all cursor-default">
                {provider}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((m) => (
              <div key={m.id} className="bg-dark/60 border border-border rounded-xl p-6 hover:border-primary transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{m.model_name}</h3>
                    <p className="text-text-secondary text-sm">{m.provider}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${m.category === 'text' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    {m.category === 'text' ? '对话' : '图像'}
                  </span>
                </div>
                <p className="text-text-secondary text-sm mb-4 line-clamp-2">{m.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">
                    <span className="text-primary font-semibold">${m.input_price}</span> / 1M tokens
                  </span>
                  <Link href={`/playground?model=${m.id}`} className="text-primary hover:underline no-underline">
                    试用 <i className="fas fa-arrow-right text-xs" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/models" className="btn-secondary no-underline">
              查看全部模型 <i className="fas fa-arrow-right ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-dark-light/30">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">为什么选择我们</h2>
            <p className="text-text-secondary">企业级 API Gateway，让 AI 接入更简单</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: 'fa-plug', title: '统一 API 接口', desc: '兼容 OpenAI 协议，一行代码切换模型，无需适配不同厂商 SDK', color: 'primary' },
              { icon: 'fa-route', title: '智能路由', desc: '自动选择最优模型，Fallback 故障转移，保证 99.9% 可用性', color: 'success' },
              { icon: 'fa-piggy-bank', title: '成本直降 40%', desc: '批量采购优惠价，按需付费无月费，实时成本监控', color: 'warning' },
              { icon: 'fa-shield-alt', title: '企业级安全', desc: '端到端加密，SOC2 合规，支持私有部署和 VPC 对等连接', color: 'danger' },
              { icon: 'fa-chart-line', title: '实时监控', desc: '请求日志追踪，Token 消耗统计，延迟和成功率大盘', color: 'secondary' },
              { icon: 'fa-users', title: '团队协作', desc: '多成员权限管理，API Key 分级控制，用量配额设置', color: 'primary' },
            ].map((f) => (
              <div key={f.title} className="bg-dark/60 border border-border rounded-xl p-8 hover:border-primary transition-all">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 bg-${f.color}/20 text-${f.color}`}>
                  <i className={`fas ${f.icon}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Comparison */}
      <section className="py-20">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">成本对比</h2>
            <p className="text-text-secondary">相比官方 API，平均节省 40% 成本</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full max-w-[800px] mx-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 text-text-secondary font-medium">模型</th>
                  <th className="text-center py-4 px-4 text-text-secondary font-medium">官方价格</th>
                  <th className="text-center py-4 px-4 text-text-secondary font-medium">我们的价格</th>
                  <th className="text-center py-4 px-4 text-text-secondary font-medium">节省</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { model: 'GPT-4 Turbo', official: '$30', ours: '$10', save: '67%' },
                  { model: 'Claude 3 Opus', official: '$75', ours: '$15', save: '80%' },
                  { model: 'GPT-3.5 Turbo', official: '$2', ours: '$0.5', save: '75%' },
                ].map((row) => (
                  <tr key={row.model} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="py-4 px-4 font-medium">{row.model}</td>
                    <td className="py-4 px-4 text-center text-text-secondary line-through">{row.official}</td>
                    <td className="py-4 px-4 text-center text-primary font-semibold">{row.ours}</td>
                    <td className="py-4 px-4 text-center"><span className="bg-success/20 text-success px-3 py-1 rounded-full text-sm">{row.save}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-text-secondary text-sm mt-6">* 价格为每 1M Output Tokens，实际价格可能因用量而异</p>
        </div>
      </section>

      {/* Customer Logos */}
      <section className="py-16 bg-dark-light/20">
        <div className="max-w-[1200px] mx-auto px-5">
          <p className="text-center text-text-secondary mb-8">已有 1000+ 开发者和企业信赖</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            {['TechCorp', 'AI Labs', 'DataFlow', 'CloudNine', 'DevStudio', 'NextGen'].map((name) => (
              <div key={name} className="text-2xl font-bold text-text-secondary">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="text-center bg-gradient-to-br from-primary to-secondary p-16 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">立即开始使用</h2>
              <p className="text-lg mb-8 opacity-90">注册即送 $5 免费额度，3 分钟完成接入</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/register" className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-opacity-90 transition-all no-underline">
                  <i className="fas fa-rocket mr-2" /> 免费注册
                </Link>
                <Link href="/contact" className="bg-white/20 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/30 transition-all no-underline">
                  <i className="fas fa-phone mr-2" /> 联系销售
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
