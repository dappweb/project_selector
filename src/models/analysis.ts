// AI分类结果模型
export interface AIClassification {
  projectType: 'AI_DEVELOPMENT' | 'SOFTWARE_DEVELOPMENT' | 'HARDWARE_PROCUREMENT' | 'OTHER'
  confidence: number // 0-1之间的置信度
  keywords: string[] // 提取的关键词
  isAIRelated: boolean // 是否与AI相关
  isSoftwareProject: boolean // 是否为软件项目
  reasoning: string // AI分类的推理过程
}

// 评分评估模型
export interface ScoreEvaluation {
  totalScore: number // 总分 0-100
  budgetScore: number // 预算评分 0-100
  difficultyScore: number // 技术难度评分 0-100
  competitionScore: number // 竞争激烈程度评分 0-100
  matchScore: number // 技术匹配度评分 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW' // 优先级
  scoreBreakdown: {
    budgetWeight: number // 预算权重
    difficultyWeight: number // 难度权重
    competitionWeight: number // 竞争权重
    matchWeight: number // 匹配权重
  }
  recommendations: string[] // 评分建议
}

// 竞争对手信息
export interface Competitor {
  name: string // 竞争对手名称
  strength: number // 实力评分 0-100
  previousWins: number // 历史中标次数
  estimatedBid?: number // 预估报价
  advantages: string[] // 优势
  weaknesses: string[] // 劣势
}

// 竞争对手分析模型
export interface CompetitorAnalysis {
  competitors: Competitor[] // 竞争对手列表
  competitionLevel: 'HIGH' | 'MEDIUM' | 'LOW' // 竞争激烈程度
  estimatedBidRange: {
    min: number // 最低预估报价
    max: number // 最高预估报价
    average: number // 平均预估报价
  }
  marketAnalysis: {
    totalParticipants: number // 预计参与投标方数量
    winProbability: number // 我方中标概率 0-1
    recommendedStrategy: string // 推荐策略
  }
  recommendations: string[] // 竞争分析建议
}

// AI分类验证函数
export function validateAIClassification(data: any): data is AIClassification {
  return (
    typeof data === 'object' &&
    data !== null &&
    ['AI_DEVELOPMENT', 'SOFTWARE_DEVELOPMENT', 'HARDWARE_PROCUREMENT', 'OTHER'].includes(data.projectType) &&
    typeof data.confidence === 'number' &&
    data.confidence >= 0 &&
    data.confidence <= 1 &&
    Array.isArray(data.keywords) &&
    data.keywords.every((k: any) => typeof k === 'string') &&
    typeof data.isAIRelated === 'boolean' &&
    typeof data.isSoftwareProject === 'boolean' &&
    typeof data.reasoning === 'string'
  )
}

// 评分评估验证函数
export function validateScoreEvaluation(data: any): data is ScoreEvaluation {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.totalScore === 'number' &&
    data.totalScore >= 0 &&
    data.totalScore <= 100 &&
    typeof data.budgetScore === 'number' &&
    typeof data.difficultyScore === 'number' &&
    typeof data.competitionScore === 'number' &&
    typeof data.matchScore === 'number' &&
    ['HIGH', 'MEDIUM', 'LOW'].includes(data.priority) &&
    typeof data.scoreBreakdown === 'object' &&
    Array.isArray(data.recommendations)
  )
}

// 竞争对手验证函数
export function validateCompetitor(data: any): data is Competitor {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.name === 'string' &&
    typeof data.strength === 'number' &&
    data.strength >= 0 &&
    data.strength <= 100 &&
    typeof data.previousWins === 'number' &&
    data.previousWins >= 0 &&
    Array.isArray(data.advantages) &&
    Array.isArray(data.weaknesses)
  )
}

// 竞争对手分析验证函数
export function validateCompetitorAnalysis(data: any): data is CompetitorAnalysis {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.competitors) &&
    data.competitors.every(validateCompetitor) &&
    ['HIGH', 'MEDIUM', 'LOW'].includes(data.competitionLevel) &&
    typeof data.estimatedBidRange === 'object' &&
    typeof data.marketAnalysis === 'object' &&
    Array.isArray(data.recommendations)
  )
}

// 创建默认AI分类结果
export function createDefaultAIClassification(): AIClassification {
  return {
    projectType: 'OTHER',
    confidence: 0,
    keywords: [],
    isAIRelated: false,
    isSoftwareProject: false,
    reasoning: '待分析'
  }
}

// 创建默认评分评估
export function createDefaultScoreEvaluation(): ScoreEvaluation {
  return {
    totalScore: 0,
    budgetScore: 0,
    difficultyScore: 0,
    competitionScore: 0,
    matchScore: 0,
    priority: 'LOW',
    scoreBreakdown: {
      budgetWeight: 0.3,
      difficultyWeight: 0.2,
      competitionWeight: 0.25,
      matchWeight: 0.25
    },
    recommendations: []
  }
}

// 创建默认竞争对手分析
export function createDefaultCompetitorAnalysis(): CompetitorAnalysis {
  return {
    competitors: [],
    competitionLevel: 'MEDIUM',
    estimatedBidRange: {
      min: 0,
      max: 0,
      average: 0
    },
    marketAnalysis: {
      totalParticipants: 0,
      winProbability: 0,
      recommendedStrategy: '待分析'
    },
    recommendations: []
  }
}