import { DatabaseService } from './database'
import type { TenderInfo, NewProjectAnalysis } from '../db/schema'
import type { Env } from '../index'

// AI分类结果接口
export interface AIClassification {
  isAIProject: boolean
  isSoftwareProject: boolean
  projectCategory: string
  confidence: number
  keywords: string[]
  reasoning: string
}

// 项目评分结果接口
export interface ProjectScore {
  total: number
  budget: number
  difficulty: number
  competition: number
  match: number
  details: {
    budgetReason: string
    difficultyReason: string
    competitionReason: string
    matchReason: string
  }
}

// 竞争对手分析结果接口
export interface CompetitorAnalysis {
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  estimatedCompetitors: number
  mainCompetitors: string[]
  competitiveAdvantages: string[]
  risks: string[]
  recommendations: string[]
}

// AI分析服务类
export class AIAnalysisService {
  private env: Env
  private dbService: DatabaseService

  constructor(env: Env) {
    this.env = env
    this.dbService = new DatabaseService(env.DB)
  }

  // 使用Qwen模型进行项目分类
  async classifyProject(tender: TenderInfo): Promise<AIClassification> {
    try {
      const prompt = this.buildClassificationPrompt(tender)
      
      // 使用Cloudflare Workers AI的Llama 3.1模型
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的招投标项目分析师，专门识别AI和软件开发类项目。请根据项目信息进行准确分类。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1 // 低温度确保结果稳定
      })

      const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)
      return this.parseClassificationResponse(responseText, tender)
    } catch (error) {
      console.error('AI classification failed:', error)
      // 降级到规则引擎
      return this.fallbackClassification(tender)
    }
  }

  // 构建分类提示词
  private buildClassificationPrompt(tender: TenderInfo): string {
    return `请分析以下招标项目，判断是否为AI开发或软件开发项目：

项目标题：${tender.title}
项目内容：${tender.content || '无详细内容'}
项目预算：${tender.budget ? `${tender.budget}元` : '未知'}
采购方：${tender.purchaser || '未知'}
项目类型：${tender.projectType || '未知'}

请按以下JSON格式返回分析结果：
{
  "isAIProject": boolean,
  "isSoftwareProject": boolean,
  "projectCategory": "AI开发|软件开发|系统集成|平台建设|数据分析|其他",
  "confidence": 0-100,
  "keywords": ["关键词1", "关键词2"],
  "reasoning": "分析理由"
}

判断标准：
1. AI项目：包含人工智能、机器学习、深度学习、自然语言处理、计算机视觉等关键词
2. 软件项目：包含软件开发、系统开发、应用开发、平台建设、系统集成等关键词
3. 排除：纯硬件采购、工程建设、服务外包等非软件开发项目`
  }

  // 解析AI分类响应
  private parseClassificationResponse(response: string, tender: TenderInfo): AIClassification {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          isAIProject: Boolean(parsed.isAIProject),
          isSoftwareProject: Boolean(parsed.isSoftwareProject),
          projectCategory: parsed.projectCategory || '其他',
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          reasoning: parsed.reasoning || '无分析理由'
        }
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
    }

    // 解析失败，使用规则引擎
    return this.fallbackClassification(tender)
  }

  // 规则引擎降级分类
  private fallbackClassification(tender: TenderInfo): AIClassification {
    const text = `${tender.title} ${tender.content || ''}`.toLowerCase()
    
    // AI关键词
    const aiKeywords = ['人工智能', 'ai', '机器学习', '深度学习', '自然语言处理', 'nlp', '计算机视觉', '神经网络', '算法', '智能']
    const softwareKeywords = ['软件开发', '系统开发', '应用开发', '平台建设', '系统集成', '信息系统', '管理系统', '网站', 'app']
    
    const foundAIKeywords = aiKeywords.filter(keyword => text.includes(keyword))
    const foundSoftwareKeywords = softwareKeywords.filter(keyword => text.includes(keyword))
    
    const isAIProject = foundAIKeywords.length > 0
    const isSoftwareProject = foundSoftwareKeywords.length > 0 || isAIProject
    
    let projectCategory = '其他'
    if (isAIProject) projectCategory = 'AI开发'
    else if (isSoftwareProject) projectCategory = '软件开发'
    
    return {
      isAIProject,
      isSoftwareProject,
      projectCategory,
      confidence: isAIProject ? 80 : (isSoftwareProject ? 70 : 30),
      keywords: [...foundAIKeywords, ...foundSoftwareKeywords],
      reasoning: `基于关键词匹配：${[...foundAIKeywords, ...foundSoftwareKeywords].join(', ')}`
    }
  }

  // 计算项目评分
  async calculateProjectScore(tender: TenderInfo, classification: AIClassification): Promise<ProjectScore> {
    try {
      const prompt = this.buildScoringPrompt(tender, classification)
      
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的项目评估师，负责评估招投标项目的性价比和可行性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2
      })

      const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)
      return this.parseScoringResponse(responseText, tender, classification)
    } catch (error) {
      console.error('AI scoring failed:', error)
      return this.fallbackScoring(tender, classification)
    }
  }

  // 构建评分提示词
  private buildScoringPrompt(tender: TenderInfo, classification: AIClassification): string {
    return `请对以下招标项目进行综合评分（0-100分）：

项目信息：
- 标题：${tender.title}
- 预算：${tender.budget ? `${tender.budget}元` : '未知'}
- 采购方：${tender.purchaser || '未知'}
- 项目类型：${classification.projectCategory}
- AI项目：${classification.isAIProject ? '是' : '否'}

评分维度：
1. 预算合理性（30%）：预算与项目复杂度的匹配程度
2. 技术难度（20%）：项目技术实现的难易程度
3. 竞争程度（25%）：预估竞争对手数量和竞争激烈程度
4. 技术匹配度（25%）：项目技术要求与AI/软件开发能力的匹配度

请按以下JSON格式返回评分结果：
{
  "total": 总分(0-100),
  "budget": 预算评分(0-100),
  "difficulty": 难度评分(0-100),
  "competition": 竞争评分(0-100),
  "match": 匹配度评分(0-100),
  "details": {
    "budgetReason": "预算评分理由",
    "difficultyReason": "难度评分理由", 
    "competitionReason": "竞争评分理由",
    "matchReason": "匹配度评分理由"
  }
}`
  }

  // 解析评分响应
  private parseScoringResponse(response: string, tender: TenderInfo, classification: AIClassification): ProjectScore {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          total: Math.min(100, Math.max(0, Number(parsed.total) || 0)),
          budget: Math.min(100, Math.max(0, Number(parsed.budget) || 0)),
          difficulty: Math.min(100, Math.max(0, Number(parsed.difficulty) || 0)),
          competition: Math.min(100, Math.max(0, Number(parsed.competition) || 0)),
          match: Math.min(100, Math.max(0, Number(parsed.match) || 0)),
          details: {
            budgetReason: parsed.details?.budgetReason || '无评分理由',
            difficultyReason: parsed.details?.difficultyReason || '无评分理由',
            competitionReason: parsed.details?.competitionReason || '无评分理由',
            matchReason: parsed.details?.matchReason || '无评分理由'
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse scoring response:', error)
    }

    return this.fallbackScoring(tender, classification)
  }

  // 降级评分算法
  private fallbackScoring(tender: TenderInfo, classification: AIClassification): ProjectScore {
    // 预算评分
    let budgetScore = 50
    if (tender.budget) {
      if (tender.budget >= 500000 && tender.budget <= 20000000) {
        budgetScore = 80 // 在目标范围内
      } else if (tender.budget < 500000) {
        budgetScore = 30 // 预算偏低
      } else {
        budgetScore = 60 // 预算偏高但可接受
      }
    }

    // 难度评分（AI项目难度相对较高）
    const difficultyScore = classification.isAIProject ? 70 : 80

    // 竞争评分（政府项目竞争激烈）
    let competitionScore = 60
    if (tender.purchaser && tender.purchaser.includes('政府')) {
      competitionScore = 40
    } else if (tender.purchaser && tender.purchaser.includes('企业')) {
      competitionScore = 70
    }

    // 匹配度评分
    const matchScore = classification.isAIProject ? 90 : (classification.isSoftwareProject ? 80 : 40)

    // 计算总分
    const total = Math.round(budgetScore * 0.3 + difficultyScore * 0.2 + competitionScore * 0.25 + matchScore * 0.25)

    return {
      total,
      budget: budgetScore,
      difficulty: difficultyScore,
      competition: competitionScore,
      match: matchScore,
      details: {
        budgetReason: `预算${tender.budget ? `${tender.budget}元` : '未知'}，${budgetScore > 70 ? '在合理范围内' : '需要评估'}`,
        difficultyReason: `${classification.isAIProject ? 'AI项目技术难度较高' : '软件项目难度适中'}`,
        competitionReason: `${tender.purchaser || '未知采购方'}，竞争程度${competitionScore > 60 ? '适中' : '激烈'}`,
        matchReason: `技术匹配度${matchScore > 80 ? '很高' : '一般'}，适合承接`
      }
    }
  }

  // 竞争对手分析
  async analyzeCompetitors(tender: TenderInfo, classification: AIClassification): Promise<CompetitorAnalysis> {
    try {
      const prompt = this.buildCompetitorPrompt(tender, classification)
      
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: '你是一个市场分析专家，专门分析招投标项目的竞争环境。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      })

      const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)
      return this.parseCompetitorResponse(responseText, tender)
    } catch (error) {
      console.error('Competitor analysis failed:', error)
      return this.fallbackCompetitorAnalysis(tender, classification)
    }
  }

  // 构建竞争对手分析提示词
  private buildCompetitorPrompt(tender: TenderInfo, classification: AIClassification): string {
    return `请分析以下招标项目的竞争环境：

项目信息：
- 标题：${tender.title}
- 预算：${tender.budget ? `${tender.budget}元` : '未知'}
- 采购方：${tender.purchaser || '未知'}
- 地区：${tender.area || '未知'}
- 项目类型：${classification.projectCategory}

请按以下JSON格式返回分析结果：
{
  "competitionLevel": "LOW|MEDIUM|HIGH",
  "estimatedCompetitors": 预估竞争对手数量,
  "mainCompetitors": ["主要竞争对手类型1", "主要竞争对手类型2"],
  "competitiveAdvantages": ["我方优势1", "我方优势2"],
  "risks": ["竞争风险1", "竞争风险2"],
  "recommendations": ["竞争策略建议1", "竞争策略建议2"]
}`
  }

  // 解析竞争对手分析响应
  private parseCompetitorResponse(response: string, tender: TenderInfo): CompetitorAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          competitionLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.competitionLevel) ? parsed.competitionLevel : 'MEDIUM',
          estimatedCompetitors: Math.max(0, Number(parsed.estimatedCompetitors) || 5),
          mainCompetitors: Array.isArray(parsed.mainCompetitors) ? parsed.mainCompetitors : [],
          competitiveAdvantages: Array.isArray(parsed.competitiveAdvantages) ? parsed.competitiveAdvantages : [],
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        }
      }
    } catch (error) {
      console.error('Failed to parse competitor response:', error)
    }

    return this.fallbackCompetitorAnalysis(tender, { isAIProject: false, isSoftwareProject: false, projectCategory: '其他', confidence: 0, keywords: [], reasoning: '' })
  }

  // 降级竞争对手分析
  private fallbackCompetitorAnalysis(tender: TenderInfo, classification: AIClassification): CompetitorAnalysis {
    let competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
    let estimatedCompetitors = 5

    // 根据预算和项目类型估算竞争程度
    if (tender.budget) {
      if (tender.budget > 10000000) {
        competitionLevel = 'HIGH'
        estimatedCompetitors = 10
      } else if (tender.budget < 1000000) {
        competitionLevel = 'LOW'
        estimatedCompetitors = 3
      }
    }

    return {
      competitionLevel,
      estimatedCompetitors,
      mainCompetitors: ['大型软件公司', '系统集成商', '本地技术公司'],
      competitiveAdvantages: ['AI技术专长', '快速响应能力', '成本优势'],
      risks: ['价格竞争激烈', '大公司品牌优势', '资质要求'],
      recommendations: ['突出技术优势', '合理定价策略', '加强方案质量']
    }
  }

  // 执行完整的AI分析
  async analyzeProject(tenderId: string): Promise<NewProjectAnalysis> {
    // 获取招标信息
    const tender = await this.dbService.getTenderInfoById(tenderId)
    if (!tender) {
      throw new Error(`Tender not found: ${tenderId}`)
    }

    // 执行AI分类
    const classification = await this.classifyProject(tender)
    
    // 计算项目评分
    const scoreEvaluation = await this.calculateProjectScore(tender, classification)
    
    // 竞争对手分析
    const competitorAnalysis = await this.analyzeCompetitors(tender, classification)

    // 构建分析结果
    const analysisData: NewProjectAnalysis = {
      tenderId,
      aiClassification: classification,
      scoreEvaluation,
      competitorAnalysis,
      analysisTime: new Date()
    }

    return analysisData
  }

  // 批量分析项目
  async batchAnalyzeProjects(tenderIds: string[]): Promise<{
    successful: string[]
    failed: { tenderId: string; error: string }[]
  }> {
    const successful: string[] = []
    const failed: { tenderId: string; error: string }[] = []

    for (const tenderId of tenderIds) {
      try {
        const analysisData = await this.analyzeProject(tenderId)
        
        // 检查是否已存在分析结果
        const existing = await this.dbService.getProjectAnalysisByTenderId(tenderId)
        
        if (existing) {
          // 更新现有分析
          await this.dbService.updateProjectAnalysis(existing.id, analysisData)
        } else {
          // 创建新分析
          await this.dbService.createProjectAnalysis(analysisData)
        }
        
        successful.push(tenderId)
        
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to analyze project ${tenderId}:`, error)
        failed.push({
          tenderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { successful, failed }
  }

  // 获取分析统计
  async getAnalysisStatistics(): Promise<{
    totalAnalyzed: number
    aiProjects: number
    softwareProjects: number
    averageScore: number
    highValueProjects: number
  }> {
    try {
      // 这里简化实现，实际应该从数据库查询
      const stats = await this.dbService.getStatistics()
      
      return {
        totalAnalyzed: stats.analyses,
        aiProjects: Math.floor(stats.analyses * 0.3), // 估算30%为AI项目
        softwareProjects: Math.floor(stats.analyses * 0.7), // 估算70%为软件项目
        averageScore: 65, // 平均分
        highValueProjects: Math.floor(stats.analyses * 0.2) // 估算20%为高价值项目
      }
    } catch (error) {
      console.error('Failed to get analysis statistics:', error)
      return {
        totalAnalyzed: 0,
        aiProjects: 0,
        softwareProjects: 0,
        averageScore: 0,
        highValueProjects: 0
      }
    }
  }
}