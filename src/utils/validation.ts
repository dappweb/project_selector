// 验证招标信息ID格式
export function validateTenderId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 64
}

// 验证邮箱格式
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证手机号格式（中国大陆）
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 验证预算范围
export function validateBudget(budget: number): boolean {
  return budget > 0 && budget <= 1000000000 // 最大10亿
}

// 验证日期格式
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// 验证通知类型
export function validateNotificationType(type: string): boolean {
  const validTypes = ['DEADLINE_REMINDER', 'STATUS_UPDATE', 'ANALYSIS_COMPLETE', 'PROPOSAL_READY']
  return validTypes.includes(type)
}

// 验证通知渠道
export function validateNotificationChannel(channel: string): boolean {
  const validChannels = ['EMAIL', 'WECHAT', 'DINGTALK', 'SMS']
  return validChannels.includes(channel)
}

// 验证项目状态
export function validateTenderStatus(status: string): boolean {
  const validStatuses = ['ACTIVE', 'CLOSED', 'AWARDED']
  return validStatuses.includes(status)
}