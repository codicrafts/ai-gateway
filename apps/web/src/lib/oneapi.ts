// One API 客户端
const ONE_API_URL = process.env.ONE_API_URL || 'http://localhost:3001'
const ONE_API_KEY = process.env.ONE_API_KEY || ''
const ONE_API_ACCESS_TOKEN = process.env.ONE_API_ACCESS_TOKEN || ONE_API_KEY
const ONE_API_USER_ID = process.env.ONE_API_USER_ID || ''

// ============ 通用类型 ============

export interface OneApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

// ============ Chat API 类型 ============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

// ============ 用户管理类型 ============

export interface OneApiUser {
  id: number
  username: string
  password?: string
  display_name: string
  role: number // 1: 普通用户, 10: 管理员, 100: 超级管理员
  status: number // 1: 启用, 2: 禁用
  email: string
  github_id?: string
  wechat_id?: string
  verification_code?: string
  access_token?: string
  quota: number
  used_quota: number
  request_count: number
  group: string
  aff_code?: string
  inviter_id?: number
  created_time?: number
}

interface OneApiStatusResponse {
  success?: boolean
  quota_per_unit?: number
  data?: {
    quota_per_unit?: number
    [key: string]: unknown
  }
}

export interface CreateUserRequest {
  username: string
  password: string
  display_name?: string
  email?: string
  role?: number
  status?: number
  quota?: number
  group?: string
}

export interface UpdateUserRequest {
  id: number
  username?: string
  password?: string
  display_name?: string
  email?: string
  role?: number
  status?: number
  quota?: number
  group?: string
}

// ============ Token/API Key 管理类型 ============

export interface OneApiToken {
  id: number
  user_id: number
  key: string
  status: number // 1: 启用, 2: 禁用, 3: 已过期, 4: 已耗尽
  name: string
  created_time: number
  accessed_time: number
  expired_time: number // -1 表示永不过期
  remain_quota: number // -1 表示无限额度
  unlimited_quota: boolean
  used_quota: number
  models?: string[] // 允许的模型列表
  subnet?: string // IP 白名单
  permission_scopes?: string[] | string
}

export interface OneApiTokenKeyResponse {
  key: string
}

export interface CreateTokenRequest {
  name: string
  remain_quota?: number // 额度，-1 表示无限
  expired_time?: number // 过期时间戳，-1 表示永不过期
  unlimited_quota?: boolean
  models?: string[] // 允许的模型
  subnet?: string // IP 白名单
  permission_scopes?: string[]
}

export interface UpdateTokenRequest {
  id: number
  name?: string
  remain_quota?: number
  expired_time?: number
  unlimited_quota?: boolean
  status?: number
  models?: string[]
  subnet?: string
  permission_scopes?: string[]
}

function serializePermissionScopes(scopes?: string[]): string | undefined {
  if (!scopes || scopes.length === 0) {
    return undefined
  }
  return Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean))).join(',')
}

// ============ 用量统计类型 ============

export interface UsageLog {
  id: number
  user_id: number
  created_time?: number
  created_at?: number
  type: number
  content: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  channel_id: number
  token_id: number
  token_name: string
}

export interface UsageStats {
  quota: number
  used_quota: number
  request_count: number
}

export interface OneApiPricingModel {
  model_name: string
  description?: string
  tags?: string
  vendor_id?: number
  quota_type?: number
  supported_endpoint_types?: string[]
}

export interface OneApiPricingVendor {
  id: number
  name: string
  description?: string
  icon?: string
}

export interface OneApiPricingResponse {
  success: boolean
  data: OneApiPricingModel[]
  vendors?: OneApiPricingVendor[]
}

export interface OneApiPagedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  [key: string]: unknown
}

export interface OneApiVendor {
  id: number
  name: string
  description?: string
  icon?: string
  status: number
  created_time: number
  updated_time: number
}

export interface OneApiBoundChannel {
  name: string
  type: number
}

export interface OneApiModelMeta {
  id: number
  model_name: string
  description?: string
  icon?: string
  tags?: string
  vendor_id: number
  endpoints?: string
  status: number
  sync_official: number
  created_time: number
  updated_time: number
  bound_channels?: OneApiBoundChannel[]
  enable_groups?: string[]
  quota_types?: number[]
  name_rule: number
}

export interface OneApiChannel {
  id: number
  type: number
  key: string
  openai_organization?: string | null
  test_model?: string | null
  status: number
  name: string
  weight?: number | null
  created_time: number
  test_time: number
  response_time: number
  base_url?: string | null
  other: string
  balance: number
  balance_updated_time: number
  models: string
  group: string
  used_quota: number
  model_mapping?: string | null
  status_code_mapping?: string | null
  priority?: number | null
  auto_ban?: number | null
  other_info: string
  tag?: string | null
  setting?: string | null
  param_override?: string | null
  header_override?: string | null
  remark?: string | null
  settings?: string
}

export interface OneApiOption {
  key: string
  value: string
}

export interface CreateChannelPayload {
  mode: 'single'
  batch_add_set_key_prefix_2_name?: boolean
  multi_key_mode?: 'random' | 'polling'
  channel: Partial<OneApiChannel> & {
    type: number
    name: string
    key: string
    models: string
    group: string
    status: number
  }
}

// 非流式调用
export async function chatCompletion(options: ChatCompletionOptions) {
  const response = await fetch(`${ONE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ONE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
  }

  return response.json()
}

// 流式调用
export async function chatCompletionStream(options: ChatCompletionOptions) {
  const response = await fetch(`${ONE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ONE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
  }

  return response
}

// 获取可用模型列表
export async function getModels() {
  const response = await fetch(`${ONE_API_URL}/v1/models`, {
    headers: {
      'Authorization': `Bearer ${ONE_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.status}`)
  }

  return response.json()
}

export async function getPricingCatalog(): Promise<OneApiPricingResponse> {
  const response = await fetch(`${ONE_API_URL}/api/pricing`, {
    headers: {
      'Authorization': `Bearer ${ONE_API_ACCESS_TOKEN}`,
      ...(ONE_API_USER_ID ? { 'New-Api-User': ONE_API_USER_ID } : {}),
    },
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || `获取定价目录失败: ${response.status}`)
  }

  return {
    success: true,
    data: Array.isArray(data.data) ? data.data : [],
    vendors: Array.isArray(data.vendors) ? data.vendors : [],
  }
}

// ============ 管理 API 通用请求方法 ============

/**
 * 发送管理 API 请求
 * 使用管理员 Token 进行认证
 */
async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<OneApiResponse<T>> {
  const url = `${ONE_API_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${ONE_API_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }

  if (ONE_API_USER_ID) {
    headers['New-Api-User'] = ONE_API_USER_ID
  }

  if (options.headers) {
    const extraHeaders = new Headers(options.headers)
    extraHeaders.forEach((value, key) => {
      headers[key] = value
    })
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      message: data.message || `请求失败: ${response.status}`,
    }
  }

  return data as OneApiResponse<T>
}

async function getOneApiStatus(): Promise<OneApiStatusResponse> {
  const response = await fetch(`${ONE_API_URL}/api/status`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ONE_API_ACCESS_TOKEN}`,
      ...(ONE_API_USER_ID ? { 'New-Api-User': ONE_API_USER_ID } : {}),
    },
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data) {
    throw new Error((data as { message?: string } | null)?.message || `获取 new-api 状态失败: ${response.status}`)
  }

  return data as OneApiStatusResponse
}

export async function getQuotaPerUnit(): Promise<number> {
  const status = await getOneApiStatus()
  const quotaPerUnit = Number(status.data?.quota_per_unit ?? status.quota_per_unit)

  if (!Number.isFinite(quotaPerUnit) || quotaPerUnit <= 0) {
    throw new Error('获取 new-api quota_per_unit 失败')
  }

  return quotaPerUnit
}

async function runtimeUserRequest<T>(
  userId: number,
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<OneApiResponse<T>> {
  const url = `${ONE_API_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'New-Api-User': String(userId),
  }

  if (options.headers) {
    const extraHeaders = new Headers(options.headers)
    extraHeaders.forEach((value, key) => {
      headers[key] = value
    })
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      success: false,
      message: data?.message || `请求失败: ${response.status}`,
    }
  }

  return (data || { success: false, message: '空响应' }) as OneApiResponse<T>
}

// ============ 用户管理 API ============

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<OneApiResponse<OneApiUser>> {
  return adminRequest<OneApiUser>('/api/user/self')
}

/**
 * 获取用户列表（管理员）
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function getUsers(
  page: number = 0,
  pageSize: number = 10
): Promise<OneApiResponse<OneApiUser[]>> {
  return adminRequest<OneApiUser[]>(`/api/user/?p=${page}&page_size=${pageSize}`)
}

/**
 * 根据用户名查找用户
 * @param username 用户名
 */
export async function getUserByUsername(
  username: string
): Promise<OneApiResponse<OneApiUser[] | OneApiPagedData<OneApiUser>>> {
  return adminRequest<OneApiUser[] | OneApiPagedData<OneApiUser>>(`/api/user/search?keyword=${encodeURIComponent(username)}`)
}

/**
 * 根据邮箱查找用户
 * @param email 邮箱
 */
export async function getUserByEmail(
  email: string
): Promise<OneApiResponse<OneApiUser[] | OneApiPagedData<OneApiUser>>> {
  return adminRequest<OneApiUser[] | OneApiPagedData<OneApiUser>>(`/api/user/search?keyword=${encodeURIComponent(email)}`)
}

/**
 * 创建用户（管理员）
 * @param userData 用户数据
 */
export async function createUser(
  userData: CreateUserRequest
): Promise<OneApiResponse<OneApiUser>> {
  return adminRequest<OneApiUser>('/api/user/', {
    method: 'POST',
    body: JSON.stringify({
      ...userData,
      role: userData.role ?? 1, // 默认普通用户
      status: userData.status ?? 1, // 默认启用
      quota: userData.quota ?? 0,
      group: userData.group ?? 'default',
    }),
  })
}

/**
 * 更新用户信息（管理员）
 * @param userData 用户数据
 */
export async function updateUser(
  userData: UpdateUserRequest
): Promise<OneApiResponse<OneApiUser>> {
  return adminRequest<OneApiUser>('/api/user/', {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
}

export async function getUser(userId: number): Promise<OneApiResponse<OneApiUser>> {
  return adminRequest<OneApiUser>(`/api/user/${userId}`)
}

/**
 * 删除用户（管理员）
 * @param userId 用户 ID
 */
export async function deleteUser(userId: number): Promise<OneApiResponse<void>> {
  return adminRequest<void>(`/api/user/${userId}`, {
    method: 'DELETE',
  })
}

/**
 * 禁用/启用用户（管理员）
 * @param userId 用户 ID
 * @param status 状态：1 启用，2 禁用
 */
export async function setUserStatus(
  userId: number,
  status: 1 | 2
): Promise<OneApiResponse<void>> {
  return adminRequest<void>('/api/user/manage', {
    method: 'POST',
    body: JSON.stringify({
      id: userId,
      action: status === 1 ? 'enable' : 'disable',
    }),
  })
}

// ============ Token/API Key 管理 API ============

/**
 * 获取当前用户的 Token 列表
 */
export async function getTokens(): Promise<OneApiResponse<OneApiToken[]>> {
  return adminRequest<OneApiToken[]>('/api/token/?p=0&page_size=100')
}

/**
 * 获取指定用户的 Token 列表（管理员）
 * @param userId 用户 ID
 */
export async function getUserTokens(
  userId: number
): Promise<OneApiResponse<OneApiToken[]>> {
  return adminRequest<OneApiToken[]>(`/api/token/search?keyword=${userId}`)
}

export async function getRuntimeUserTokens(
  userId: number,
  accessToken: string
): Promise<OneApiResponse<OneApiToken[] | OneApiPagedData<OneApiToken>>> {
  return runtimeUserRequest<OneApiToken[] | OneApiPagedData<OneApiToken>>(
    userId,
    accessToken,
    '/api/token/?p=0&page_size=100'
  )
}

/**
 * 创建 Token
 * @param tokenData Token 数据
 */
export async function createToken(
  tokenData: CreateTokenRequest
): Promise<OneApiResponse<OneApiToken>> {
  return adminRequest<OneApiToken>('/api/token/', {
    method: 'POST',
    body: JSON.stringify({
      name: tokenData.name,
      remain_quota: tokenData.remain_quota ?? -1, // 默认无限额度
      expired_time: tokenData.expired_time ?? -1, // 默认永不过期
      unlimited_quota: tokenData.unlimited_quota ?? true,
      models: tokenData.models,
      subnet: tokenData.subnet,
      permission_scopes: serializePermissionScopes(tokenData.permission_scopes),
    }),
  })
}

/**
 * 为指定用户创建 Token（管理员）
 * 注意：New API 不直接支持为其他用户创建 Token，需要通过管理接口
 * @param userId 用户 ID
 * @param tokenData Token 数据
 */
export async function createTokenForUser(
  userId: number,
  tokenData: CreateTokenRequest
): Promise<OneApiResponse<OneApiToken>> {
  // New API 的 Token 创建会关联到当前认证用户
  // 如果需要为其他用户创建，需要使用该用户的 access_token
  // 这里我们使用管理员接口，通过 user_id 参数指定
  return adminRequest<OneApiToken>('/api/token/', {
    method: 'POST',
    body: JSON.stringify({
      name: tokenData.name,
      remain_quota: tokenData.remain_quota ?? -1,
      expired_time: tokenData.expired_time ?? -1,
      unlimited_quota: tokenData.unlimited_quota ?? true,
      models: tokenData.models,
      subnet: tokenData.subnet,
      permission_scopes: serializePermissionScopes(tokenData.permission_scopes),
      user_id: userId, // 指定用户 ID
    }),
  })
}

export async function createRuntimeUserToken(
  userId: number,
  accessToken: string,
  tokenData: CreateTokenRequest
): Promise<OneApiResponse<OneApiToken>> {
  return runtimeUserRequest<OneApiToken>(userId, accessToken, '/api/token/', {
    method: 'POST',
    body: JSON.stringify({
      name: tokenData.name,
      remain_quota: tokenData.remain_quota ?? -1,
      expired_time: tokenData.expired_time ?? -1,
      unlimited_quota: tokenData.unlimited_quota ?? true,
      models: tokenData.models,
      subnet: tokenData.subnet,
      permission_scopes: serializePermissionScopes(tokenData.permission_scopes),
    }),
  })
}

/**
 * 更新 Token
 * @param tokenData Token 数据
 */
export async function updateToken(
  tokenData: UpdateTokenRequest
): Promise<OneApiResponse<OneApiToken>> {
  return adminRequest<OneApiToken>('/api/token/', {
    method: 'PUT',
    body: JSON.stringify({
      ...tokenData,
      permission_scopes: serializePermissionScopes(tokenData.permission_scopes),
    }),
  })
}

export async function updateRuntimeUserToken(
  userId: number,
  accessToken: string,
  tokenData: UpdateTokenRequest
): Promise<OneApiResponse<OneApiToken>> {
  return runtimeUserRequest<OneApiToken>(userId, accessToken, '/api/token/', {
    method: 'PUT',
    body: JSON.stringify({
      ...tokenData,
      permission_scopes: serializePermissionScopes(tokenData.permission_scopes),
    }),
  })
}

/**
 * 删除 Token
 * @param tokenId Token ID
 */
export async function deleteToken(tokenId: number): Promise<OneApiResponse<void>> {
  return adminRequest<void>(`/api/token/${tokenId}`, {
    method: 'DELETE',
  })
}

export async function deleteRuntimeUserToken(
  userId: number,
  accessToken: string,
  tokenId: number
): Promise<OneApiResponse<void>> {
  return runtimeUserRequest<void>(userId, accessToken, `/api/token/${tokenId}`, {
    method: 'DELETE',
  })
}

export async function getRuntimeUserTokenKey(
  userId: number,
  accessToken: string,
  tokenId: number
): Promise<OneApiResponse<OneApiTokenKeyResponse>> {
  return runtimeUserRequest<OneApiTokenKeyResponse>(userId, accessToken, `/api/token/${tokenId}/key`, {
    method: 'POST',
  })
}

export async function fetchGatewayRuntimeTokenKey(
  userId: number,
  accessToken: string,
  tokenId: number
): Promise<string> {
  const response = await getRuntimeUserTokenKey(userId, accessToken, tokenId)
  if (!response.success || !response.data?.key) {
    throw new Error(response.message || 'Failed to fetch token key')
  }
  return response.data.key
}

/**
 * 禁用/启用 Token
 * @param tokenId Token ID
 * @param status 状态：1 启用，2 禁用
 */
export async function setTokenStatus(
  tokenId: number,
  status: 1 | 2
): Promise<OneApiResponse<void>> {
  return adminRequest<void>('/api/token/manage', {
    method: 'POST',
    body: JSON.stringify({
      id: tokenId,
      action: status === 1 ? 'enable' : 'disable',
    }),
  })
}

export async function setRuntimeUserTokenStatus(
  userId: number,
  accessToken: string,
  tokenId: number,
  status: 1 | 2
): Promise<OneApiResponse<OneApiToken>> {
  return updateRuntimeUserToken(userId, accessToken, {
    id: tokenId,
    status,
  })
}

// ============ 用量统计 API ============

/**
 * 获取当前用户的用量统计
 */
export async function getUsageStats(): Promise<OneApiResponse<UsageStats>> {
  const result = await getCurrentUser()
  if (!result.success || !result.data) {
    return { success: false, message: result.message }
  }
  return {
    success: true,
    message: '',
    data: {
      quota: result.data.quota,
      used_quota: result.data.used_quota,
      request_count: result.data.request_count,
    },
  }
}

/**
 * 获取用量日志
 * @param page 页码
 * @param pageSize 每页数量
 * @param tokenId 可选，按 Token 筛选
 * @param modelName 可选，按模型筛选
 */
export async function getUsageLogs(
  page: number = 0,
  pageSize: number = 20,
  tokenId?: number,
  modelName?: string
): Promise<OneApiResponse<UsageLog[]>> {
  let url = `/api/log/?p=${page}&page_size=${pageSize}`
  if (tokenId) {
    url += `&token_id=${tokenId}`
  }
  if (modelName) {
    url += `&model_name=${encodeURIComponent(modelName)}`
  }
  return adminRequest<UsageLog[]>(url)
}

export async function getUsageLogsByUsername(
  page: number = 0,
  pageSize: number = 20,
  username?: string,
  modelName?: string
): Promise<OneApiResponse<UsageLog[]>> {
  let url = `/api/log/?p=${page}&page_size=${pageSize}`
  if (username) {
    url += `&username=${encodeURIComponent(username)}`
  }
  if (modelName) {
    url += `&model_name=${encodeURIComponent(modelName)}`
  }
  return adminRequest<UsageLog[]>(url)
}

/**
 * 获取指定用户的用量日志（管理员）
 * @param userId 用户 ID
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function getUserUsageLogs(
  userId: number,
  page: number = 0,
  pageSize: number = 20
): Promise<OneApiResponse<UsageLog[]>> {
  return adminRequest<UsageLog[]>(`/api/log/search?keyword=${userId}&p=${page}&page_size=${pageSize}`)
}

// ============ 额度管理 API ============

/**
 * 为用户充值额度（管理员）
 * @param userId 用户 ID
 * @param quota 额度数量
 */
export async function topUpUser(
  userId: number,
  amount: number
): Promise<OneApiResponse<void>> {
  const normalizedAmount = Number(amount)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return {
      success: false,
      message: '充值金额无效',
    }
  }

  const [userResult, status] = await Promise.all([
    getUser(userId),
    getOneApiStatus(),
  ])

  if (!userResult.success || !userResult.data) {
    return {
      success: false,
      message: userResult.message || '获取 new-api 用户失败',
    }
  }

  const quotaPerUnit = Number(status.data?.quota_per_unit ?? status.quota_per_unit)
  if (!Number.isFinite(quotaPerUnit) || quotaPerUnit <= 0) {
    return {
      success: false,
      message: '获取 new-api quota_per_unit 失败',
    }
  }

  const currentUser = userResult.data
  const quotaToAdd = Math.floor(normalizedAmount * quotaPerUnit)
  const nextQuota = Math.max(0, Number(currentUser.quota || 0) + quotaToAdd)

  const updateResult = await updateUser({
    id: currentUser.id,
    username: currentUser.username,
    display_name: currentUser.display_name,
    email: currentUser.email,
    role: currentUser.role,
    status: currentUser.status,
    quota: nextQuota,
    group: currentUser.group,
  })

  if (!updateResult.success) {
    return {
      success: false,
      message: updateResult.message || '更新 new-api 用户额度失败',
    }
  }

  return {
    success: true,
    message: '',
  }
}

// ============ Provider / Model / Router Admin API ============

export async function getAllChannels(
  page: number = 0,
  pageSize: number = 100
): Promise<OneApiResponse<OneApiPagedData<OneApiChannel>>> {
  return adminRequest<OneApiPagedData<OneApiChannel>>(`/api/channel/?p=${page}&page_size=${pageSize}`)
}

export async function createChannel(payload: CreateChannelPayload): Promise<OneApiResponse<void>> {
  return adminRequest<void>('/api/channel/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateChannel(channel: Partial<OneApiChannel> & { id: number }): Promise<OneApiResponse<OneApiChannel>> {
  return adminRequest<OneApiChannel>('/api/channel/', {
    method: 'PUT',
    body: JSON.stringify(channel),
  })
}

export async function deleteChannel(channelId: number): Promise<OneApiResponse<void>> {
  return adminRequest<void>(`/api/channel/${channelId}`, {
    method: 'DELETE',
  })
}

export async function testChannel(channelId: number): Promise<OneApiResponse<unknown>> {
  return adminRequest<unknown>(`/api/channel/test/${channelId}`)
}

export async function fetchUpstreamChannelModels(channelId: number): Promise<OneApiResponse<unknown>> {
  return adminRequest<unknown>(`/api/channel/fetch_models/${channelId}`)
}

export async function syncChannelAbilities(): Promise<OneApiResponse<void>> {
  return adminRequest<void>('/api/channel/fix', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function getAllVendors(
  page: number = 0,
  pageSize: number = 100
): Promise<OneApiResponse<OneApiPagedData<OneApiVendor>>> {
  return adminRequest<OneApiPagedData<OneApiVendor>>(`/api/vendors/?p=${page}&page_size=${pageSize}`)
}

export async function createVendor(vendor: Partial<OneApiVendor>): Promise<OneApiResponse<OneApiVendor>> {
  return adminRequest<OneApiVendor>('/api/vendors/', {
    method: 'POST',
    body: JSON.stringify(vendor),
  })
}

export async function updateVendor(vendor: Partial<OneApiVendor> & { id: number }): Promise<OneApiResponse<OneApiVendor>> {
  return adminRequest<OneApiVendor>('/api/vendors/', {
    method: 'PUT',
    body: JSON.stringify(vendor),
  })
}

export async function deleteVendor(vendorId: number): Promise<OneApiResponse<void>> {
  return adminRequest<void>(`/api/vendors/${vendorId}`, {
    method: 'DELETE',
  })
}

export async function getAllModelsMeta(
  page: number = 0,
  pageSize: number = 200,
  keyword?: string,
  vendor?: string
): Promise<OneApiResponse<OneApiPagedData<OneApiModelMeta>>> {
  const params = new URLSearchParams({
    p: String(page),
    page_size: String(pageSize),
  })
  if (keyword) params.set('keyword', keyword)
  if (vendor) params.set('vendor', vendor)
  const path = keyword || vendor ? '/api/models/search' : '/api/models/'
  return adminRequest<OneApiPagedData<OneApiModelMeta>>(`${path}?${params.toString()}`)
}

export async function createModelMeta(model: Partial<OneApiModelMeta>): Promise<OneApiResponse<OneApiModelMeta>> {
  return adminRequest<OneApiModelMeta>('/api/models/', {
    method: 'POST',
    body: JSON.stringify(model),
  })
}

export async function updateModelMeta(
  model: Partial<OneApiModelMeta> & { id: number },
  statusOnly: boolean = false
): Promise<OneApiResponse<OneApiModelMeta>> {
  const suffix = statusOnly ? '?status_only=true' : ''
  return adminRequest<OneApiModelMeta>(`/api/models/${suffix ? suffix : ''}`.replace(/\/\?/, '/?'), {
    method: 'PUT',
    body: JSON.stringify(model),
  })
}

export async function deleteModelMeta(modelId: number): Promise<OneApiResponse<void>> {
  return adminRequest<void>(`/api/models/${modelId}`, {
    method: 'DELETE',
  })
}

export async function getOptions(): Promise<OneApiResponse<OneApiOption[]>> {
  return adminRequest<OneApiOption[]>('/api/option/')
}

export async function updateOption(key: string, value: string | number | boolean): Promise<OneApiResponse<void>> {
  return adminRequest<void>('/api/option/', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  })
}

// ============ 辅助函数 ============

/**
 * 生成随机密码
 * @param length 密码长度
 */
export function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function loginRuntimeUser(
  username: string,
  password: string
): Promise<{ success: boolean; cookie?: string; message: string }> {
  const response = await fetch(`${ONE_API_URL}/api/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const data = await response.json().catch(() => null)
  const cookie = response.headers.get('set-cookie') || undefined

  if (!response.ok || !data?.success || !cookie) {
    return {
      success: false,
      message: data?.message || '运行时账户登录失败',
    }
  }

  return {
    success: true,
    cookie,
    message: '',
  }
}

export async function generateRuntimeUserAccessToken(
  userId: number,
  sessionCookie: string
): Promise<OneApiResponse<string>> {
  const response = await fetch(`${ONE_API_URL}/api/user/token`, {
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
      'New-Api-User': String(userId),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.success) {
    return {
      success: false,
      message: data?.message || '生成运行时 access token 失败',
    }
  }

  return {
    success: true,
    message: '',
    data: typeof data.data === 'string' ? data.data : '',
  }
}

/**
 * 根据邮箱生成用户名
 * @param email 邮箱
 */
export function generateUsernameFromEmail(email: string): string {
  const localPart = email.split('@')[0]
  // 添加随机后缀避免重复
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${localPart}_${suffix}`
}

function isEmailIdentifier(value: string): boolean {
  return value.includes('@')
}

function extractUserSearchItems(
  data: OneApiUser[] | OneApiPagedData<OneApiUser> | undefined
): OneApiUser[] {
  if (!data) {
    return []
  }

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data.items)) {
    return data.items
  }

  return []
}

/**
 * 确保用户在 New API 中存在
 * 如果不存在则创建
 * @param identifier 邮箱、手机号或本地运行时标识
 * @param displayName 显示名称
 * @returns 用户信息
 */
export async function ensureUserExists(
  identifier: string,
  displayName?: string,
  preferredUsername?: string
): Promise<{ success: boolean; user?: OneApiUser; created?: boolean; error?: string }> {
  const searchCandidates = [
    preferredUsername?.trim() || null,
    isEmailIdentifier(identifier) ? identifier : null,
    !isEmailIdentifier(identifier) ? identifier : null,
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)

  for (const candidate of searchCandidates) {
    const searchResult = candidate.includes('@')
      ? await getUserByEmail(candidate)
      : await getUserByUsername(candidate)
    const matchedUsers = extractUserSearchItems(searchResult.data)

    if (searchResult.success && matchedUsers.length > 0) {
      return { success: true, user: matchedUsers[0], created: false }
    }
  }

  const username = preferredUsername?.trim() || generateUsernameFromEmail(identifier)
  const password = generateRandomPassword()
  const email = isEmailIdentifier(identifier) ? identifier : undefined

  const createResult = await createUser({
    username,
    password,
    email,
    display_name: displayName || username,
    role: 1, // 普通用户
    status: 1, // 启用
    quota: 0, // 初始额度为 0
    group: 'default',
  })

  if (!createResult.success) {
    return { success: false, error: createResult.message }
  }

  const createdSearch = await getUserByUsername(username)
  const createdUsers = extractUserSearchItems(createdSearch.data)

  if (!createdSearch.success || createdUsers.length === 0) {
    return { success: false, error: '运行时用户已创建，但回查失败' }
  }

  return { success: true, user: createdUsers[0], created: true }
}
