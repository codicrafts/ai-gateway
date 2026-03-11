'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchModels, setSearchTerm, setProviderFilter, setCategoryFilter, setSortFilter } from '@/store/slices/modelsSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { copyToClipboard } from '@/utils/helpers';

const categoryNames: Record<string, string> = { text: '对话', image: '图像', audio: '音频', video: '视频', embedding: '嵌入' };
const categoryIcons: Record<string, string> = { text: 'fa-comment-dots', image: 'fa-image', audio: 'fa-microphone', video: 'fa-video', embedding: 'fa-vector-square' };
const capabilityTags: Record<string, string[]> = {
  'gpt-4-turbo': ['对话', '编程', '推理', '长文本'],
  'gpt-4': ['对话', '编程', '推理'],
  'gpt-3.5-turbo': ['对话', '编程', '快速'],
  'claude-3-opus': ['对话', '编程', '推理', '长文本', '分析'],
  'claude-3-sonnet': ['对话', '编程', '平衡'],
  'claude-3-haiku': ['对话', '快速', '经济'],
  'gemini-pro': ['对话', '多模态'],
  'gemini-ultra': ['对话', '推理', '多模态'],
  'mistral-large': ['对话', '编程', '开源'],
  'mistral-medium': ['对话', '经济'],
  'dall-e-3': ['图像生成', '创意'],
  'stable-diffusion-xl': ['图像生成', '开源'],
};

export default function ModelsPage() {
  const dispatch = useAppDispatch();
  const { models, searchTerm, providerFilter, categoryFilter, sortFilter } = useAppSelector((s) => s.models);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { dispatch(fetchModels({ limit: 100 })); }, [dispatch]);

  const filtered = useMemo(() => {
    let result = (models || []).filter((m) => {
      const matchSearch = !searchTerm || m.model_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.description.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProvider = !providerFilter || m.provider === providerFilter;
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      return matchSearch && matchProvider && matchCategory;
    });
    switch (sortFilter) {
      case 'price-low': result.sort((a, b) => a.input_price - b.input_price); break;
      case 'price-high': result.sort((a, b) => b.input_price - a.input_price); break;
      case 'context': result.sort((a, b) => b.context_length - a.context_length); break;
      default: result.sort((a, b) => a.model_name.localeCompare(b.model_name));
    }
    return result;
  }, [models, searchTerm, providerFilter, categoryFilter, sortFilter]);

  const providers = Array.from(new Set((models || []).map(m => m.provider)));

  return (
    <>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">AI 模型大全</h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-[600px] mx-auto px-4">浏览 100+ AI 模型，对比价格和能力，找到最适合你的模型</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[{ label: '支持模型', value: models?.length || 0, icon: 'fa-cube' }, { label: '模型厂商', value: providers.length, icon: 'fa-building' }, { label: '平均延迟', value: '<100ms', icon: 'fa-bolt' }, { label: '可用性', value: '99.9%', icon: 'fa-check-circle' }].map((s) => (
            <div key={s.label} className="bg-dark/60 border border-border rounded-xl p-3 sm:p-4 text-center">
              <i className={`fas ${s.icon} text-primary text-lg sm:text-xl mb-2`} />
              <div className="text-lg sm:text-2xl font-bold">{s.value}</div>
              <div className="text-text-secondary text-xs sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-dark/60 border border-border rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Mobile filter toggle */}
          <div className="flex items-center justify-between mb-4 sm:hidden">
            <span className="text-sm font-medium">筛选条件</span>
            <button onClick={() => setShowFilters(!showFilters)} className="text-primary text-sm"><i className={`fas fa-${showFilters ? 'chevron-up' : 'chevron-down'} mr-1`} />{showFilters ? '收起' : '展开'}</button>
          </div>
          
          {/* Search always visible */}
          <div className="mb-4 sm:mb-0">
            <label className="block text-xs sm:text-sm text-text-secondary mb-2 sm:hidden">搜索模型</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
              <input type="text" className="form-control pl-10 text-sm" placeholder="输入模型名称、ID 或描述..." value={searchTerm} onChange={(e) => dispatch(setSearchTerm(e.target.value))} />
            </div>
          </div>

          {/* Other filters - collapsible on mobile */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-4 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
            <div className="hidden lg:block lg:col-span-2">
              <label className="block text-sm text-text-secondary mb-2">搜索模型</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="text" className="form-control pl-10" placeholder="输入模型名称、ID 或描述..." value={searchTerm} onChange={(e) => dispatch(setSearchTerm(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-text-secondary mb-2">厂商</label>
              <select className="form-control text-sm" value={providerFilter} onChange={(e) => dispatch(setProviderFilter(e.target.value))}>
                <option value="">全部厂商</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-text-secondary mb-2">类型</label>
              <select className="form-control text-sm" value={categoryFilter} onChange={(e) => dispatch(setCategoryFilter(e.target.value))}>
                <option value="">全部类型</option>
                {Object.entries(categoryNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-text-secondary mb-2">排序</label>
              <select className="form-control text-sm" value={sortFilter} onChange={(e) => dispatch(setSortFilter(e.target.value))}>
                <option value="name">名称</option>
                <option value="price-low">价格低→高</option>
                <option value="price-high">价格高→低</option>
                <option value="context">上下文长度</option>
              </select>
            </div>
          </div>
        </div>

        {/* Models Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-text-secondary">
            <i className="fas fa-search text-4xl sm:text-6xl opacity-30 block mb-4" />
            <h3 className="text-lg sm:text-xl mb-2">未找到匹配的模型</h3>
            <p className="text-sm sm:text-base">请尝试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((model) => (
              <div key={model.id} className="bg-dark/60 border border-border rounded-xl overflow-hidden hover:border-primary transition-all group">
                <div className="p-4 sm:p-6">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors truncate">{model.model_name}</h3>
                        <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" title="在线" />
                      </div>
                      <p className="text-text-secondary text-xs sm:text-sm">{model.provider}</p>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${model.category === 'text' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                      <i className={`fas ${categoryIcons[model.category] || 'fa-cube'} text-sm sm:text-base`} />
                    </div>
                  </div>
                  <p className="text-text-secondary text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{model.description}</p>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                    {(capabilityTags[model.id] || ['通用']).slice(0, 4).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 sm:py-1 bg-dark-light rounded text-xs text-text-secondary">{tag}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4 border-t border-border">
                    <div><div className="text-text-secondary text-xs mb-1">输入价格</div><div className="font-semibold text-primary text-sm sm:text-base">${model.input_price}<span className="text-xs text-text-secondary">/1M</span></div></div>
                    <div><div className="text-text-secondary text-xs mb-1">输出价格</div><div className="font-semibold text-secondary text-sm sm:text-base">${model.output_price}<span className="text-xs text-text-secondary">/1M</span></div></div>
                    {model.context_length > 0 && (<><div><div className="text-text-secondary text-xs mb-1">上下文</div><div className="font-semibold text-sm sm:text-base">{(model.context_length / 1000).toFixed(0)}K</div></div><div><div className="text-text-secondary text-xs mb-1">延迟</div><div className="font-semibold text-success text-sm sm:text-base">&lt;100ms</div></div></>)}
                  </div>
                </div>
                <div className="flex border-t border-border">
                  <button onClick={() => { copyToClipboard(model.id); dispatch(showNotification({ message: '模型 ID 已复制' })); }} className="flex-1 py-2 sm:py-3 text-text-secondary hover:text-primary hover:bg-primary/5 transition-all text-xs sm:text-sm"><i className="fas fa-copy mr-1 sm:mr-2" />复制 ID</button>
                  <Link href={`/playground?model=${model.id}`} className="flex-1 py-2 sm:py-3 text-primary hover:bg-primary/10 transition-all text-xs sm:text-sm text-center no-underline border-l border-border"><i className="fas fa-play mr-1 sm:mr-2" />试用</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEO Content */}
        <div className="mt-12 sm:mt-16 prose prose-invert max-w-none">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">关于 AI 模型</h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">我们提供统一的 API 接口访问市面上主流的大语言模型（LLM），包括 OpenAI 的 GPT-4、GPT-3.5，Anthropic 的 Claude 3 系列，Google 的 Gemini，以及国产模型如 DeepSeek、智谱 GLM 等。通过我们的平台，开发者无需分别注册各个厂商账号，只需一个 API Key 即可调用所有模型。</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
