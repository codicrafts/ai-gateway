#!/usr/bin/env tsx

/**
 * One API 日志同步脚本
 * 
 * 功能：从 One API 拉取使用日志并同步到 Supabase
 * 
 * 使用方法：
 *   pnpm tsx scripts/sync-one-api-logs.ts
 * 
 * 环境变量：
 *   ONE_API_URL - One API 服务地址
 *   ONE_API_ACCESS_TOKEN - One API 访问令牌
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase 服务角色密钥
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const ONE_API_URL = process.env.ONE_API_URL;
const ONE_API_ACCESS_TOKEN = process.env.ONE_API_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证环境变量
if (!ONE_API_URL || !ONE_API_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少必要的环境变量');
  console.error('请确保以下环境变量已设置：');
  console.error('  - ONE_API_URL');
  console.error('  - ONE_API_ACCESS_TOKEN');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OneApiLog {
  id: number;
  created_at: number;
  type: number;
  username: string;
  token_name: string;
  model_name: string;
  start_time: number;
  end_time: number;
  channel_id: number;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  content: string;
  user_id: number;
  token_id: number;
}

interface OneApiResponse {
  success: boolean;
  message: string;
  data: OneApiLog[];
}

async function fetchOneApiLogs(page: number = 0, size: number = 100): Promise<OneApiLog[]> {
  console.log(`📡 从 One API 获取日志 (page=${page}, size=${size})...`);

  const url = `${ONE_API_URL}/api/log?p=${page}&size=${size}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ONE_API_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`获取 One API 日志失败: ${response.status} ${response.statusText}`);
  }

  const data: OneApiResponse = await response.json();

  if (!data.success) {
    throw new Error(`One API 返回错误: ${data.message}`);
  }

  return data.data || [];
}

async function getTeamIdForApiKey(orgApiKeyId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('org_api_keys')
    .select('team_id')
    .eq('id', orgApiKeyId)
    .single();

  if (error) {
    console.warn(`⚠️  无法获取 API Key ${orgApiKeyId} 的团队 ID:`, error.message);
    return null;
  }

  return data?.team_id || null;
}

async function syncLog(log: OneApiLog): Promise<boolean> {
  // 检查是否已存在
  const { data: existing } = await supabase
    .from('org_usage_ledger')
    .select('id')
    .eq('new_api_log_id', log.id)
    .maybeSingle();

  if (existing) {
    return false; // 已存在，跳过
  }

  // 获取团队 ID
  const teamId = await getTeamIdForApiKey(log.token_id);
  if (!teamId) {
    console.warn(`⚠️  日志 ${log.id} 无法关联到团队，跳过`);
    return false;
  }

  // 插入新日志
  const { error } = await supabase
    .from('org_usage_ledger')
    .insert({
      new_api_log_id: log.id,
      team_id: teamId,
      org_api_key_id: log.token_id,
      model: log.model_name,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.prompt_tokens + log.completion_tokens,
      amount: log.quota / 500000, // One API 的 quota 单位是 0.002 美元 = 1/500000
      request_count: 1,
      occurred_at: new Date(log.created_at * 1000).toISOString(),
    });

  if (error) {
    console.error(`❌ 插入日志 ${log.id} 失败:`, error.message);
    return false;
  }

  return true;
}

async function syncUsageLogs() {
  console.log('🚀 开始同步 One API 使用日志...');
  console.log('');

  try {
    // 获取日志
    const logs = await fetchOneApiLogs(0, 100);
    console.log(`📊 获取到 ${logs.length} 条日志`);
    console.log('');

    if (logs.length === 0) {
      console.log('ℹ️  没有新日志需要同步');
      return;
    }

    // 同步日志
    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const log of logs) {
      const synced = await syncLog(log);
      if (synced) {
        syncedCount++;
        console.log(`✅ [${syncedCount}/${logs.length}] 同步日志 ${log.id} (${log.model_name}, ${log.prompt_tokens + log.completion_tokens} tokens)`);
      } else {
        skippedCount++;
      }
    }

    console.log('');
    console.log('📈 同步统计：');
    console.log(`  ✅ 成功: ${syncedCount}`);
    console.log(`  ⏭️  跳过: ${skippedCount}`);
    console.log(`  ❌ 失败: ${failedCount}`);
    console.log('');
    console.log('✅ 同步完成！');

  } catch (error) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
}

// 运行同步
syncUsageLogs();
