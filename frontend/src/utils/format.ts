/**
 * 格式化工具函数
 */

// 格式化货币
export const formatCurrency = (amount: number, currency = '¥'): string => {
  if (amount >= 100000000) {
    return `${currency}${(amount / 100000000).toFixed(2)}亿`
  }
  if (amount >= 10000) {
    return `${currency}${(amount / 10000).toFixed(1)}万`
  }
  return `${currency}${amount.toLocaleString('zh-CN')}`
}

// 格式化日期
export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    case 'MM-DD':
      return `${month}-${day}`
    case 'HH:mm':
      return `${hours}:${minutes}`
    default:
      return d.toLocaleDateString('zh-CN')
  }
}

// 格式化时间差
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)
  
  if (years > 0) return `${years}年前`
  if (months > 0) return `${months}个月前`
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// 格式化百分比
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`
}

// 格式化数字
export const formatNumber = (num: number, decimals = 0): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// 格式化电话号码
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }
  return phone
}

// 格式化身份证号
export const formatIdCard = (idCard: string): string => {
  if (idCard.length === 18) {
    return idCard.replace(/(\d{6})(\d{8})(\d{4})/, '$1-$2-$3')
  }
  return idCard
}

// 格式化银行卡号
export const formatBankCard = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '')
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ')
}

// 脱敏处理
export const maskString = (str: string, start = 3, end = 4, mask = '*'): string => {
  if (str.length <= start + end) {
    return str
  }
  
  const startStr = str.substring(0, start)
  const endStr = str.substring(str.length - end)
  const maskStr = mask.repeat(str.length - start - end)
  
  return startStr + maskStr + endStr
}

// 格式化ROI
export const formatROI = (roi: number): string => {
  const color = roi >= 0 ? '#52c41a' : '#ff4d4f'
  const sign = roi >= 0 ? '+' : ''
  return `${sign}${roi.toFixed(1)}%`
}

// 格式化风险等级
export const formatRiskLevel = (level: string): { text: string; color: string } => {
  const riskMap = {
    LOW: { text: '低风险', color: '#52c41a' },
    MEDIUM: { text: '中风险', color: '#faad14' },
    HIGH: { text: '高风险', color: '#ff4d4f' }
  }
  
  return riskMap[level as keyof typeof riskMap] || { text: level, color: '#666' }
}

// 格式化项目状态
export const formatProjectStatus = (status: string): { text: string; color: string } => {
  const statusMap = {
    active: { text: '进行中', color: 'processing' },
    completed: { text: '已完成', color: 'success' },
    cancelled: { text: '已取消', color: 'error' },
    pending: { text: '待开始', color: 'default' }
  }
  
  return statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' }
}