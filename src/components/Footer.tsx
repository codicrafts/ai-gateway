import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-dark/80 border-t border-border pt-12 pb-4">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-lg mb-4">产品</h4>
            <Link href="/models" className="block text-text-secondary hover:text-primary mb-2 no-underline">模型市场</Link>
            <Link href="/pricing" className="block text-text-secondary hover:text-primary mb-2 no-underline">定价</Link>
            <Link href="/playground" className="block text-text-secondary hover:text-primary mb-2 no-underline">Playground</Link>
            <Link href="/docs" className="block text-text-secondary hover:text-primary mb-2 no-underline">API文档</Link>
          </div>
          <div>
            <h4 className="text-lg mb-4">公司</h4>
            <Link href="/contact" className="block text-text-secondary hover:text-primary mb-2 no-underline">关于我们</Link>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">博客</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">职业机会</a>
            <Link href="/contact" className="block text-text-secondary hover:text-primary mb-2 no-underline">联系我们</Link>
          </div>
          <div>
            <h4 className="text-lg mb-4">支持</h4>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">帮助中心</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">状态页面</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">社区</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">Discord</a>
          </div>
          <div>
            <h4 className="text-lg mb-4">法律</h4>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">隐私政策</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">服务条款</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">Cookie政策</a>
            <a href="#" className="block text-text-secondary hover:text-primary mb-2">合规性</a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-border">
          <p className="text-text-secondary">&copy; 2024 AI Gateway. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            {['twitter', 'github', 'discord', 'linkedin'].map((s) => (
              <a key={s} href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <i className={`fab fa-${s}`} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
