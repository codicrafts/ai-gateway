'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';

const sections = [
  { id: 'introduction', label: '简介' },
  { id: 'authentication', label: '身份验证' },
  { id: 'chat-completions', label: '聊天补全' },
  { id: 'image-generation', label: '图像生成' },
  { id: 'error-handling', label: '错误处理' },
  { id: 'rate-limits', label: '速率限制' },
  { id: 'examples', label: '代码示例' },
];

function CodeBlock({ title, children, method }: { title: string; children: string; method?: { type: string; path: string } }) {
  const dispatch = useAppDispatch();
  const copy = () => { navigator.clipboard.writeText(children).then(() => dispatch(showNotification({ message: '已复制到剪贴板' }))); };
  return (
    <div className="relative bg-dark-light/80 border border-border rounded-lg my-4 sm:my-6 overflow-hidden">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-dark/80 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          {method && <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs font-semibold ${method.type === 'POST' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>{method.type}</span>}
          {method ? <code className="text-xs sm:text-sm break-all">{method.path}</code> : <span className="text-xs sm:text-sm">{title}</span>}
        </div>
        <button onClick={copy} className="bg-transparent border border-border text-text-primary px-2 sm:px-3 py-1 rounded text-xs cursor-pointer hover:bg-primary hover:border-primary transition-all whitespace-nowrap"><i className="fas fa-copy" /> 复制</button>
      </div>
      <pre className="p-3 sm:p-6 overflow-x-auto"><code className="font-mono text-xs sm:text-sm leading-relaxed text-[#e2e8f0]">{children}</code></pre>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [showNav, setShowNav] = useState(false);

  return (
    <>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 sm:gap-8">
          {/* Mobile Nav Toggle */}
          <button onClick={() => setShowNav(!showNav)} className="lg:hidden flex items-center justify-between bg-dark/60 border border-border rounded-xl p-4">
            <span className="font-medium">目录导航</span>
            <i className={`fas fa-chevron-${showNav ? 'up' : 'down'}`} />
          </button>

          {/* Sidebar */}
          <div className={`lg:sticky lg:top-20 h-fit ${showNav ? 'block' : 'hidden lg:block'}`}>
            <nav className="bg-dark/60 border border-border rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg text-text-secondary mb-3 sm:mb-4">目录</h3>
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} onClick={() => { setActiveSection(s.id); setShowNav(false); }} className={`block px-3 py-2 rounded-md mb-1 transition-all no-underline text-sm sm:text-base ${activeSection === s.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-primary/10 hover:text-primary'}`}>{s.label}</a>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="bg-dark/60 border border-border rounded-xl p-4 sm:p-8 lg:p-12">
            <h1 id="introduction" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">API文档</h1>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">欢迎使用 AI Gateway API。本文档将帮助您快速集成并使用我们的服务。</p>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">快速开始</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">AI Gateway 提供统一的 RESTful API，让您可以通过一个接口访问多个AI模型提供商。</p>
            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">基础URL</h3>
            <CodeBlock title="Endpoint">https://api.aigateway.com/v1</CodeBlock>

            <h2 id="authentication" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">身份验证</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">所有API请求都需要在HTTP头中包含您的API密钥：</p>
            <CodeBlock title="Authorization Header">Authorization: Bearer YOUR_API_KEY</CodeBlock>
            <p className="text-text-secondary leading-relaxed text-sm sm:text-base">您可以在<Link href="/dashboard" className="text-primary">控制台</Link>创建和管理您的API密钥。</p>

            <h2 id="chat-completions" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">聊天补全</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">使用聊天补全API与AI模型进行对话交互。</p>
            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">请求</h3>
            <CodeBlock title="Request" method={{ type: 'POST', path: '/chat/completions' }}>{`{
  "model": "gpt-4-turbo",
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

            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">参数</h3>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full my-4 sm:my-6 border-collapse min-w-[400px]">
                <thead><tr>{['参数', '类型', '必填', '说明'].map(h => <th key={h} className="p-2 sm:p-3 text-left border-b border-border bg-dark-light/50 font-semibold text-xs sm:text-sm">{h}</th>)}</tr></thead>
                <tbody>
                  {[['model', 'string', '是', '要使用的模型ID'], ['messages', 'array', '是', '对话消息数组'], ['temperature', 'number', '否', '采样温度 (0-2)'], ['max_tokens', 'integer', '否', '最大生成token数']].map(r => (
                    <tr key={r[0]}><td className="p-2 sm:p-3 border-b border-border"><code className="bg-primary/10 px-1 sm:px-2 py-0.5 rounded text-xs sm:text-sm">{r[0]}</code></td><td className="p-2 sm:p-3 border-b border-border text-xs sm:text-sm">{r[1]}</td><td className="p-2 sm:p-3 border-b border-border text-xs sm:text-sm">{r[2]}</td><td className="p-2 sm:p-3 border-b border-border text-xs sm:text-sm">{r[3]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">响应</h3>
            <CodeBlock title="Response">{`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4-turbo",
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

            <h2 id="image-generation" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">图像生成</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">使用图像生成API创建AI生成的图像。</p>
            <CodeBlock title="Request" method={{ type: 'POST', path: '/images/generations' }}>{`{
  "model": "dall-e-3",
  "prompt": "A futuristic cityscape at sunset",
  "size": "1024x1024",
  "n": 1
}`}</CodeBlock>

            <h2 id="error-handling" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">错误处理</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">API使用标准HTTP状态码表示请求的成功或失败。</p>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full my-4 sm:my-6 border-collapse min-w-[300px]">
                <thead><tr><th className="p-2 sm:p-3 text-left border-b border-border bg-dark-light/50 font-semibold text-xs sm:text-sm">状态码</th><th className="p-2 sm:p-3 text-left border-b border-border bg-dark-light/50 font-semibold text-xs sm:text-sm">说明</th></tr></thead>
                <tbody>
                  {[['200', '请求成功'], ['400', '请求参数错误'], ['401', 'API密钥无效'], ['429', '请求速率超限'], ['500', '服务器内部错误']].map(r => (
                    <tr key={r[0]}><td className="p-2 sm:p-3 border-b border-border"><code className="bg-primary/10 px-1 sm:px-2 py-0.5 rounded text-xs sm:text-sm">{r[0]}</code></td><td className="p-2 sm:p-3 border-b border-border text-xs sm:text-sm">{r[1]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 id="rate-limits" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">速率限制</h2>
            <p className="text-text-secondary leading-relaxed mb-4 text-sm sm:text-base">为确保服务质量，我们对API请求实施速率限制：</p>
            <ul className="text-text-secondary leading-relaxed list-disc pl-4 sm:pl-6 space-y-2 text-sm sm:text-base">
              <li>免费层：每分钟60个请求</li>
              <li>专业版：每分钟600个请求</li>
              <li>企业版：自定义限制</li>
            </ul>

            <h2 id="examples" className="text-xl sm:text-2xl lg:text-3xl font-bold mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2 border-b border-border">代码示例</h2>
            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">Python</h3>
            <CodeBlock title="Python SDK">{`import requests

url = "https://api.aigateway.com/v1/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "gpt-4-turbo",
    "messages": [
        {"role": "user", "content": "Hello!"}
    ]
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`}</CodeBlock>

            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">Node.js</h3>
            <CodeBlock title="Node.js">{`const response = await fetch(
  'https://api.aigateway.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  }
);

const data = await response.json();
console.log(data);`}</CodeBlock>

            <h3 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3">cURL</h3>
            <CodeBlock title="cURL">{`curl https://api.aigateway.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</CodeBlock>
          </div>
        </div>
      </div>
    </>
  );
}
