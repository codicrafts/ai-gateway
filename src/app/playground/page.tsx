'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addMessage, clearMessages, setTemperature, setMaxTokens, setSystemMessage, setSelectedModel, setSending } from '@/store/slices/playgroundSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { loadUserFromStorage } from '@/store/slices/authSlice';
import { formatCurrency, copyToClipboard } from '@/utils/helpers';
import { Model } from '@/types';

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-secondary">加载中...</div>}>
      <PlaygroundContent />
    </Suspense>
  );
}

function PlaygroundContent() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { messages, temperature, maxTokens, systemMessage, selectedModel, totalTokens, sending } = useAppSelector((s) => s.playground);
  const { isLoggedIn } = useAppSelector((s) => s.auth);
  const [models, setModels] = useState<Model[]>([]);
  const [input, setInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(loadUserFromStorage()); }, [dispatch]);

  useEffect(() => {
    fetch('/api/tables/models?category=text').then(r => r.json()).then(res => {
      const data = res.data || [];
      setModels(data);
      const modelParam = searchParams.get('model');
      if (modelParam && data.find((m: Model) => m.id === modelParam)) {
        dispatch(setSelectedModel(modelParam));
      } else if (data.length > 0 && !selectedModel) {
        dispatch(setSelectedModel(data[0].id));
      }
    }).catch(() => dispatch(showNotification({ message: '加载模型失败', type: 'error' })));
  }, [dispatch, searchParams, selectedModel]);

  useEffect(() => { messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) { dispatch(showNotification({ message: '请输入消息', type: 'error' })); return; }
    if (!isLoggedIn) { dispatch(showNotification({ message: '请先登录', type: 'error' })); return; }
    dispatch(addMessage({ role: 'user', content: input.trim() }));
    setInput('');
    dispatch(setSending(true));
    await new Promise(resolve => setTimeout(resolve, 1000));
    const responses = ['这是一个很好的问题！让我来详细解答...\n\n首先，我们需要理解问题的核心。根据您的描述，我建议从以下几个方面入手：\n\n1. 分析当前情况\n2. 制定解决方案\n3. 逐步实施\n\n如果您需要更具体的帮助，请告诉我更多细节。', '我理解您的需求。基于您提供的信息，这里是我的建议：\n\n```python\n# 示例代码\ndef solution():\n    return "Hello, World!"\n```\n\n这段代码展示了基本的实现方式。您可以根据实际需求进行调整。', '感谢您的提问！这是一个常见但重要的话题。\n\n简单来说，答案取决于具体的使用场景。在大多数情况下，推荐的做法是...'];
    dispatch(addMessage({ role: 'assistant', content: responses[Math.floor(Math.random() * responses.length)] }));
    dispatch(setSending(false));
  };

  const currentModel = models.find(m => m.id === selectedModel);
  const estimatedCost = currentModel ? (totalTokens / 1000000) * currentModel.input_price : 0;

  const handleClear = () => {
    if (messages.length === 0) return;
    if (confirm('确定清空对话？')) { dispatch(clearMessages()); dispatch(showNotification({ message: '已清空' })); }
  };

  const codeExample = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.aigateway.com/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="${selectedModel || 'gpt-4-turbo'}",
    messages=[
        {"role": "system", "content": "${systemMessage}"},
        {"role": "user", "content": "你的消息"}
    ],
    temperature=${temperature},
    max_tokens=${maxTokens}
)

print(response.choices[0].message.content)`;

  return (
    <>
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-5 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <div><h1 className="text-xl sm:text-2xl font-bold">Playground</h1><p className="text-text-secondary text-xs sm:text-sm">在线测试 API 调用效果</p></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowSettings(!showSettings)} className={`btn-secondary text-sm flex-1 sm:flex-none justify-center lg:hidden ${showSettings ? 'bg-primary/20 border-primary' : ''}`}><i className="fas fa-cog mr-1" />设置</button>
            <button onClick={() => setShowCode(!showCode)} className={`btn-secondary text-sm flex-1 sm:flex-none justify-center ${showCode ? 'bg-primary/20 border-primary' : ''}`}><i className="fas fa-code mr-1 sm:mr-2" /><span className="hidden xs:inline">{showCode ? '隐藏' : '查看'}代码</span><span className="xs:hidden">代码</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar - Desktop always visible, Mobile toggle */}
          <div className={`space-y-4 ${showSettings ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-dark/60 border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold mb-4 text-sm sm:text-base">模型设置</h3>
              <div className="space-y-4">
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">选择模型</label><select className="form-control text-sm" value={selectedModel} onChange={e => dispatch(setSelectedModel(e.target.value))}>{models.map(m => <option key={m.id} value={m.id}>{m.model_name}</option>)}</select></div>
                <div><div className="flex justify-between text-xs sm:text-sm mb-2"><span className="text-text-secondary">Temperature</span><span>{temperature}</span></div><input type="range" className="w-full accent-primary" min="0" max="2" step="0.1" value={temperature} onChange={e => dispatch(setTemperature(Number(e.target.value)))} /></div>
                <div><div className="flex justify-between text-xs sm:text-sm mb-2"><span className="text-text-secondary">Max Tokens</span><span>{maxTokens}</span></div><input type="range" className="w-full accent-primary" min="100" max="4000" step="100" value={maxTokens} onChange={e => dispatch(setMaxTokens(Number(e.target.value)))} /></div>
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">System Prompt</label><textarea className="form-control text-sm" rows={3} value={systemMessage} onChange={e => dispatch(setSystemMessage(e.target.value))} /></div>
              </div>
            </div>
            <div className="bg-dark/60 border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold mb-4 text-sm sm:text-base">统计</h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">消息数</span><span>{messages.length}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Token 消耗</span><span>{totalTokens.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">预估费用</span><span className="text-primary">{formatCurrency(estimatedCost)}</span></div>
              </div>
            </div>
            <button className="btn-danger w-full justify-center text-sm" onClick={handleClear}><i className="fas fa-trash mr-2" />清空对话</button>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {showCode ? (
              <div className="bg-dark/60 border border-border rounded-xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-dark-light/50 border-b border-border">
                  <span className="text-xs sm:text-sm text-text-secondary">Python 示例代码</span>
                  <button onClick={() => { copyToClipboard(codeExample); dispatch(showNotification({ message: '已复制' })); }} className="text-text-secondary hover:text-primary text-xs sm:text-sm"><i className="fas fa-copy mr-1" />复制</button>
                </div>
                <pre className="p-4 overflow-x-auto text-xs sm:text-sm"><code className="text-text-primary">{codeExample}</code></pre>
              </div>
            ) : (
              <div className="bg-dark/60 border border-border rounded-xl flex flex-col h-[calc(100vh-200px)] sm:h-[600px]">
                <div ref={messagesRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                      <i className="fas fa-comments text-4xl sm:text-5xl opacity-30 mb-4" />
                      <p className="mb-2 text-sm sm:text-base">开始与 AI 对话</p>
                      <p className="text-xs sm:text-sm">在下方输入消息，按 Enter 发送</p>
                    </div>
                  ) : messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2 sm:py-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-dark-light'}`}>
                        <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? '你' : currentModel?.model_name || 'AI'}</div>
                        <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {sending && (<div className="flex justify-start"><div className="bg-dark-light rounded-xl px-4 py-3"><i className="fas fa-circle-notch fa-spin text-primary" /></div></div>)}
                </div>
                <div className="p-3 sm:p-4 border-t border-border">
                  <div className="flex gap-2 sm:gap-3">
                    <textarea className="form-control flex-1 resize-none text-sm" rows={2} placeholder="输入消息... (Shift+Enter 换行)" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                    <button className="btn-primary self-end px-4 sm:px-6" onClick={sendMessage} disabled={sending}>{sending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
