'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadUserFromStorage } from '@/store/slices/authSlice';
import { fetchApiKeys, fetchUsageLogs, createApiKey, deleteApiKey as deleteApiKeyAction } from '@/store/slices/dashboardSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { formatDate, formatCurrency, generateUUID, generateAPIKey, copyToClipboard } from '@/utils/helpers';
import { Model } from '@/types';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

type TabType = 'overview' | 'apikeys' | 'usage' | 'billing';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentUser, isLoggedIn } = useAppSelector((s) => s.auth);
  const { apiKeys, usageLogs, monthlyRequests, monthlyCost } = useAppSelector((s) => s.dashboard);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyName, setKeyName] = useState('');
  const [modelsMap, setModelsMap] = useState<Record<string, string>>({});
  const initialized = useRef(false);

  useEffect(() => { dispatch(loadUserFromStorage()); }, [dispatch]);

  useEffect(() => {
    if (!initialized.current && currentUser) {
      initialized.current = true;
      dispatch(fetchApiKeys(currentUser.id));
      dispatch(fetchUsageLogs(currentUser.id));
      fetch('/api/tables/models').then(r => r.json()).then(res => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((m: Model) => { map[m.id] = m.model_name; });
        setModelsMap(map);
      }).catch(() => {});
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('currentUser')) {
      router.push('/login');
    }
  }, [router]);

  const handleCreateKey = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const newKey = { id: generateUUID(), user_id: currentUser.id, key_name: keyName, api_key: generateAPIKey(), status: 'active' as const, created_at: new Date().toISOString(), last_used: null };
    try {
      await dispatch(createApiKey(newKey)).unwrap();
      dispatch(showNotification({ message: 'API 密钥创建成功' }));
      setNewKeyValue(newKey.api_key);
      setShowCreateModal(false);
      setShowKeyModal(true);
      setKeyName('');
    } catch {
      dispatch(showNotification({ message: '创建失败', type: 'error' }));
    }
  }, [currentUser, keyName, dispatch]);

  const handleDeleteKey = useCallback(async (keyId: string, name: string) => {
    if (!confirm(`确定删除密钥 "${name}"？`)) return;
    try {
      await dispatch(deleteApiKeyAction(keyId)).unwrap();
      dispatch(showNotification({ message: '已删除' }));
    } catch {
      dispatch(showNotification({ message: '删除失败', type: 'error' }));
    }
  }, [dispatch]);

  const activeKeys = apiKeys.filter(k => k.status === 'active');

  // Chart data
  const usageChartData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      { label: '请求数', data: [120, 190, 300, 250, 420, 380, 450], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.4, fill: true },
    ],
  };

  const tokenChartData = {
    labels: ['GPT-4', 'Claude 3', 'GPT-3.5', '其他'],
    datasets: [{
      data: [40, 30, 20, 10],
      backgroundColor: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } },
  };

  if (!isLoggedIn) return null;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: '概览', icon: 'fa-chart-pie' },
    { id: 'apikeys', label: 'API 密钥', icon: 'fa-key' },
    { id: 'usage', label: '用量统计', icon: 'fa-chart-line' },
    { id: 'billing', label: '账单', icon: 'fa-receipt' },
  ];

  return (
    <>
      <Navbar variant="dashboard" />
      <div className="max-w-[1400px] mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">控制台</h1>
            <p className="text-text-secondary">管理 API 密钥、监控用量和费用</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowRechargeModal(true)} className="btn-primary">
              <i className="fas fa-plus" /> 充值
            </button>
            <Link href="/docs" className="btn-secondary no-underline">
              <i className="fas fa-book" /> 文档
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-dark/60 text-text-secondary hover:text-text-primary'}`}
            >
              <i className={`fas ${tab.icon} mr-2`} />{tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: '账户余额', value: formatCurrency(currentUser?.balance || 0), icon: 'fa-wallet', color: 'primary', change: null },
                { label: '本月请求', value: monthlyRequests.toLocaleString(), icon: 'fa-paper-plane', color: 'success', change: '+12%' },
                { label: '本月消耗', value: formatCurrency(monthlyCost), icon: 'fa-coins', color: 'warning', change: '-5%' },
                { label: 'API 密钥', value: String(activeKeys.length), icon: 'fa-key', color: 'secondary', change: null },
              ].map((s) => (
                <div key={s.label} className="bg-dark/60 border border-border rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-text-secondary text-sm">{s.label}</span>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${s.color}/20 text-${s.color}`}>
                      <i className={`fas ${s.icon}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{s.value}</div>
                  {s.change && <span className={`text-sm ${s.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>{s.change} 较上月</span>}
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-dark/60 border border-border rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">请求趋势</h3>
                  <select className="form-control w-auto text-sm py-1">
                    <option>最近 7 天</option>
                    <option>最近 30 天</option>
                  </select>
                </div>
                <div className="h-[250px]"><Line data={usageChartData} options={chartOptions} /></div>
              </div>
              <div className="bg-dark/60 border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6">模型使用分布</h3>
                <div className="h-[200px]"><Doughnut data={tokenChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } } } }} /></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '总 Token 消耗', value: '1.2M', icon: 'fa-database' },
                { label: '平均延迟', value: '89ms', icon: 'fa-bolt' },
                { label: '成功率', value: '99.8%', icon: 'fa-check-circle' },
                { label: 'TTFT', value: '45ms', icon: 'fa-clock' },
              ].map((s) => (
                <div key={s.label} className="bg-dark/60 border border-border rounded-xl p-4 text-center">
                  <i className={`fas ${s.icon} text-primary text-xl mb-2`} />
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-text-secondary text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && (
          <div className="bg-dark/60 border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold">API 密钥管理</h3>
                <p className="text-text-secondary text-sm">创建和管理您的 API 密钥</p>
              </div>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus" /> 创建密钥
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <div className="text-center py-16 text-text-secondary">
                <i className="fas fa-key text-5xl opacity-30 mb-4 block" />
                <p className="mb-4">还没有 API 密钥</p>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>创建第一个密钥</button>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="bg-dark-light/50 border border-border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{key.key_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${key.status === 'active' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                          {key.status === 'active' ? '活跃' : '已禁用'}
                        </span>
                      </div>
                      <div className="font-mono text-text-secondary text-sm truncate">{key.api_key.substring(0, 12)}...{key.api_key.slice(-4)}</div>
                      <div className="text-xs text-text-secondary mt-1">创建于 {formatDate(key.created_at)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { copyToClipboard(key.api_key); dispatch(showNotification({ message: '已复制' })); }} className="btn-secondary text-sm py-2 px-3">
                        <i className="fas fa-copy" />
                      </button>
                      <button onClick={() => handleDeleteKey(key.id, key.key_name)} className="btn-secondary text-sm py-2 px-3 hover:border-danger hover:text-danger">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div className="bg-dark/60 border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6">实时监控</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Requests', value: '2,847', unit: '今日' },
                  { label: 'Input Tokens', value: '1.2M', unit: '今日' },
                  { label: 'Output Tokens', value: '890K', unit: '今日' },
                  { label: 'Avg Latency', value: '89ms', unit: '' },
                  { label: 'Success Rate', value: '99.8%', unit: '' },
                ].map((m) => (
                  <div key={m.label} className="text-center p-4 bg-dark-light/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{m.value}</div>
                    <div className="text-text-secondary text-sm">{m.label}</div>
                    {m.unit && <div className="text-text-secondary text-xs">{m.unit}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-dark/60 border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6">请求日志</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['时间', '模型', 'Input', 'Output', '延迟', '状态'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-text-secondary text-sm font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-text-secondary">暂无记录</td></tr>
                    ) : usageLogs.map((log, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-primary/5">
                        <td className="py-3 px-4 text-sm">{formatDate(log.timestamp)}</td>
                        <td className="py-3 px-4 text-sm">{modelsMap[log.model_id] || log.model_id}</td>
                        <td className="py-3 px-4 text-sm">{log.input_tokens?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm">{log.output_tokens?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm">89ms</td>
                        <td className="py-3 px-4"><span className="px-2 py-1 bg-success/20 text-success rounded text-xs">成功</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark/60 border border-border rounded-xl p-6">
                <h3 className="text-text-secondary text-sm mb-2">当前余额</h3>
                <div className="text-4xl font-bold text-primary mb-4">{formatCurrency(currentUser?.balance || 0)}</div>
                <button onClick={() => setShowRechargeModal(true)} className="btn-primary w-full justify-center">
                  <i className="fas fa-plus mr-2" />充值
                </button>
              </div>
              <div className="bg-dark/60 border border-border rounded-xl p-6">
                <h3 className="text-text-secondary text-sm mb-2">本月消耗</h3>
                <div className="text-4xl font-bold mb-4">{formatCurrency(monthlyCost)}</div>
                <div className="text-text-secondary text-sm">较上月 <span className="text-success">-5%</span></div>
              </div>
              <div className="bg-dark/60 border border-border rounded-xl p-6">
                <h3 className="text-text-secondary text-sm mb-2">预计可用</h3>
                <div className="text-4xl font-bold mb-4">~30 天</div>
                <div className="text-text-secondary text-sm">按当前消耗速度</div>
              </div>
            </div>
            <div className="bg-dark/60 border border-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">账单明细</h3>
                <button className="btn-secondary text-sm"><i className="fas fa-download mr-2" />导出</button>
              </div>
              <div className="text-center py-12 text-text-secondary">
                <i className="fas fa-receipt text-4xl opacity-30 mb-4 block" />
                <p>暂无账单记录</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-dark border border-border rounded-xl p-8 max-w-[450px] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">创建 API 密钥</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreateKey}>
              <div className="mb-6">
                <label className="block text-sm text-text-secondary mb-2">密钥名称</label>
                <input type="text" className="form-control" required placeholder="例如：生产环境" value={keyName} onChange={e => setKeyName(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">创建密钥</button>
            </form>
          </div>
        </div>
      )}

      {/* Show Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowKeyModal(false)}>
          <div className="bg-dark border border-border rounded-xl p-8 max-w-[500px] w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">保存您的 API 密钥</h3>
            <div className="bg-danger/10 border border-danger rounded-lg p-4 mb-4 text-sm">
              <i className="fas fa-exclamation-triangle text-danger mr-2" />
              请立即复制并保存，密钥只显示一次！
            </div>
            <div className="flex gap-2 mb-6">
              <input type="text" className="form-control font-mono text-sm" readOnly value={newKeyValue} />
              <button className="btn-primary" onClick={() => { copyToClipboard(newKeyValue); dispatch(showNotification({ message: '已复制' })); }}>
                <i className="fas fa-copy" />
              </button>
            </div>
            <button className="btn-secondary w-full justify-center" onClick={() => setShowKeyModal(false)}>我已保存</button>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowRechargeModal(false)}>
          <div className="bg-dark border border-border rounded-xl p-8 max-w-[450px] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">账户充值</h3>
              <button onClick={() => setShowRechargeModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[10, 50, 100, 200, 500, 1000].map((amount) => (
                <button key={amount} className="py-3 border border-border rounded-lg hover:border-primary hover:text-primary transition-all">
                  ${amount}
                </button>
              ))}
            </div>
            <div className="mb-6">
              <label className="block text-sm text-text-secondary mb-2">自定义金额</label>
              <input type="number" className="form-control" placeholder="输入金额" min="1" />
            </div>
            <button className="btn-primary w-full justify-center" onClick={() => { setShowRechargeModal(false); dispatch(showNotification({ message: '支付功能开发中', type: 'error' })); }}>
              <i className="fas fa-credit-card mr-2" />去支付
            </button>
          </div>
        </div>
      )}
    </>
  );
}
