'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { Model } from '@/types';

const faqs = [
  { q: '如何计费？', a: '我们按实际使用的token数量计费。每个模型都有明确的输入和输出价格。您可以在控制台实时查看使用情况和费用。' },
  { q: '可以随时取消吗？', a: '是的，您可以随时取消订阅。取消后，您仍可以使用账户中的剩余额度，但将不再享受月度套餐的优惠价格。' },
  { q: '有折扣吗？', a: '我们为教育机构、非营利组织和开源项目提供特别折扣。请联系我们的销售团队了解详情。' },
  { q: '支持哪些支付方式？', a: '我们支持信用卡、借记卡、PayPal和企业转账。企业客户还可以选择月度账单结算。' },
  { q: '有使用限制吗？', a: '免费试用账户有每分钟60个请求的限制。专业版和企业版有更高的速率限制。如需更高的限制，请联系我们。' },
];

export default function PricingPage() {
  const dispatch = useAppDispatch();
  const [pricingModels, setPricingModels] = useState<Model[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/tables/models?limit=10&category=text').then(r => r.json()).then(res => setPricingModels(res.data)).catch(() => {});
  }, []);

  return (
    <>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 py-8 sm:py-12">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">简单透明的定价</h1>
          <p className="text-base sm:text-xl text-text-secondary">按实际使用付费，无隐藏费用</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-16">
          {[
            { name: '免费试用', desc: '适合个人开发者和小型项目', price: '$0', unit: '/月', featured: false, features: [{ t: '$5 免费额度', ok: true }, { t: '访问所有模型', ok: true }, { t: '60 请求/分钟', ok: true }, { t: '基础支持', ok: true }, { t: '优先支持', ok: false }, { t: '专属账户经理', ok: false }], btn: '开始免费试用', href: '/register' },
            { name: '专业版', desc: '适合成长型企业和团队', price: '$49', unit: '/月', featured: true, badge: '最受欢迎', features: [{ t: '$50 月度额度', ok: true }, { t: '访问所有模型', ok: true }, { t: '600 请求/分钟', ok: true }, { t: '优先支持', ok: true }, { t: '详细分析报告', ok: true }, { t: '团队协作功能', ok: true }], btn: '选择专业版', href: '/register' },
            { name: '企业版', desc: '适合大型企业和高需求场景', price: '定制', unit: '', featured: false, features: [{ t: '自定义额度', ok: true }, { t: '访问所有模型', ok: true }, { t: '无限请求', ok: true }, { t: '24/7 专属支持', ok: true }, { t: '专属账户经理', ok: true }, { t: 'SLA保障', ok: true }, { t: '私有部署选项', ok: true }], btn: '联系销售', href: '#' },
          ].map((plan) => (
            <div key={plan.name} className={`bg-dark/60 border-2 rounded-2xl p-6 sm:p-8 lg:p-10 relative transition-all hover:-translate-y-1 ${plan.featured ? 'border-primary bg-gradient-to-br from-primary/10 to-secondary/10' : 'border-border hover:border-primary'}`}>
              {plan.featured && <span className="absolute -top-3 right-4 sm:right-5 bg-primary text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold">{plan.badge}</span>}
              <h3 className="text-xl sm:text-2xl mb-2">{plan.name}</h3>
              <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">{plan.desc}</p>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">{plan.price}<span className="text-sm sm:text-base text-text-secondary font-normal">{plan.unit}</span></div>
              <ul className="my-6 sm:my-8 space-y-0">
                {plan.features.map((f) => (
                  <li key={f.t} className={`py-2 sm:py-3 border-b border-border flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${!f.ok ? 'text-text-secondary opacity-50' : ''}`}>
                    <i className={`fas fa-${f.ok ? 'check' : 'times'}-circle ${f.ok ? 'text-success' : 'text-text-secondary'} text-base sm:text-lg`} />{f.t}
                  </li>
                ))}
              </ul>
              {plan.href === '#' ? (
                <button className="btn-primary w-full justify-center text-sm sm:text-base" onClick={() => dispatch(showNotification({ message: '请联系销售团队', type: 'error' }))}>{plan.btn}</button>
              ) : (
                <Link href={plan.href} className="btn-primary w-full justify-center no-underline text-sm sm:text-base">{plan.btn}</Link>
              )}
            </div>
          ))}
        </div>

        {/* Token Pricing Table */}
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-6 pb-4 border-b border-border">
            <h2 className="text-xl sm:text-2xl font-semibold">按Token计费</h2>
          </div>
          <p className="text-text-secondary text-sm sm:text-base mb-6 sm:mb-8">除了月度套餐，您也可以选择按实际使用付费。不同模型有不同的价格，具体请参考<Link href="/models" className="text-primary">模型市场</Link>。</p>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse min-w-[400px]">
              <thead><tr>{['模型', '提供商', '输入价格', '输出价格'].map(h => <th key={h} className="p-2 sm:p-4 text-left border-b border-border font-semibold text-text-secondary text-xs sm:text-sm uppercase">{h}</th>)}</tr></thead>
              <tbody>{pricingModels.map(m => <tr key={m.id} className="hover:bg-primary/5"><td className="p-2 sm:p-4 border-b border-border font-semibold text-xs sm:text-base">{m.model_name}</td><td className="p-2 sm:p-4 border-b border-border text-xs sm:text-base">{m.provider}</td><td className="p-2 sm:p-4 border-b border-border text-primary text-xs sm:text-base">{m.input_price}/1M</td><td className="p-2 sm:p-4 border-b border-border text-secondary text-xs sm:text-base">{m.output_price}/1M</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-10 sm:mt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">常见问题</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="bg-dark/60 border border-border rounded-xl p-4 sm:p-6 mb-3 sm:mb-4 cursor-pointer transition-all hover:border-primary" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="flex justify-between items-center font-semibold text-sm sm:text-lg"><span>{faq.q}</span><i className={`fas fa-chevron-down transition-transform ${openFaq === i ? 'rotate-180' : ''}`} /></div>
              {openFaq === i && <div className="mt-3 sm:mt-4 text-text-secondary leading-relaxed text-sm sm:text-base">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
