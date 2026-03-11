'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';

export default function ContactPage() {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({ name: '', email: '', company: '', type: 'sales', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    dispatch(showNotification({ message: '提交成功，我们会尽快联系您！' }));
    setFormData({ name: '', email: '', company: '', type: 'sales', message: '' });
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">联系我们</h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-[600px] mx-auto px-4">无论是商务合作、技术咨询还是产品反馈，我们都期待与您交流</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className="bg-dark/60 border border-border rounded-xl p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">发送消息</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">姓名 *</label><input type="text" className="form-control text-sm" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="您的姓名" /></div>
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">邮箱 *</label><input type="email" className="form-control text-sm" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="your@email.com" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">公司</label><input type="text" className="form-control text-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="公司名称（选填）" /></div>
                <div><label className="block text-xs sm:text-sm text-text-secondary mb-2">咨询类型</label><select className="form-control text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="sales">商务合作</option><option value="support">技术支持</option><option value="enterprise">企业方案</option><option value="other">其他</option></select></div>
              </div>
              <div className="mb-4 sm:mb-6"><label className="block text-xs sm:text-sm text-text-secondary mb-2">留言 *</label><textarea className="form-control text-sm" rows={4} required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="请描述您的需求..." /></div>
              <button type="submit" className="btn-primary w-full justify-center text-sm sm:text-base" disabled={loading}>{loading ? <><i className="fas fa-spinner fa-spin mr-2" />提交中...</> : <><i className="fas fa-paper-plane mr-2" />发送消息</>}</button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-dark/60 border border-border rounded-xl p-5 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">联系方式</h2>
              <div className="space-y-4 sm:space-y-6">
                {[{ icon: 'fa-envelope', label: '邮箱', value: 'contact@aigateway.com', href: 'mailto:contact@aigateway.com' }, { icon: 'fa-phone', label: '电话', value: '+86 400-xxx-xxxx', href: 'tel:+86400xxxxxxx' }, { icon: 'fa-map-marker-alt', label: '地址', value: '北京市朝阳区xxx大厦', href: '#' }].map((item) => (
                  <a key={item.label} href={item.href} className="flex items-start gap-3 sm:gap-4 text-text-secondary hover:text-primary transition-colors no-underline">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 text-sm sm:text-base"><i className={`fas ${item.icon}`} /></div>
                    <div><div className="text-xs sm:text-sm text-text-secondary">{item.label}</div><div className="text-text-primary text-sm sm:text-base">{item.value}</div></div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-dark/60 border border-border rounded-xl p-5 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">企业服务</h2>
              <ul className="space-y-3 sm:space-y-4">
                {[{ icon: 'fa-headset', text: '7x24 专属技术支持' }, { icon: 'fa-file-contract', text: 'SLA 服务等级协议' }, { icon: 'fa-server', text: '私有化部署方案' }, { icon: 'fa-user-tie', text: '专属客户成功经理' }, { icon: 'fa-receipt', text: '企业发票和对公付款' }].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-text-secondary text-sm sm:text-base"><i className={`fas ${item.icon} text-primary`} /><span>{item.text}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">关于我们</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[{ icon: 'fa-bullseye', title: '我们的使命', desc: '让每个开发者都能轻松使用最先进的 AI 能力，降低 AI 应用开发门槛' }, { icon: 'fa-eye', title: '我们的愿景', desc: '成为全球领先的 AI 模型聚合平台，连接开发者与 AI 的桥梁' }, { icon: 'fa-heart', title: '我们的价值观', desc: '开放、透明、可靠。我们相信技术应该服务于人，让 AI 更加普惠' }].map((item) => (
              <div key={item.title} className="bg-dark/60 border border-border rounded-xl p-5 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl sm:text-2xl mx-auto mb-3 sm:mb-4"><i className={`fas ${item.icon}`} /></div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-text-secondary text-sm sm:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
