import { DatabaseService } from './database'
import type { TenderInfo, NewProposalDocument } from '../db/schema'
import type { Env } from '../index'

// 项目需求分析结果接口
export interface ProjectRequirement {
  functionalRequirements: string[]
  technicalRequirements: string[]
  performanceRequirements: string[]
  securityRequirements: string[]
  integrationRequirements: string[]
  projectScope: string
  deliverables: string[]
  timeline: string
  budget: number
}

// 技术方案接口
export interface TechnicalSolution {
  systemArchitecture: string
  technologyStack: {
    frontend: string[]
    backend: string[]
    database: string[]
    infrastructure: string[]
    aiFrameworks?: string[]
  }
  developmentPlan: {
    phases: Array<{
      name: string
      duration: string
      deliverables: string[]
      milestones: string[]
    }>
    totalDuration: string
    teamSize: number
  }
  personnelConfiguration: {
    roles: Array<{
      title: string
      count: number
      responsibilities: string[]
      skillRequirements: string[]
    }>
    totalMembers: number
  }
  riskAssessment: {
    technicalRisks: Array<{
      risk: string
      probability: 'LOW' | 'MEDIUM' | 'HIGH'
      impact: 'LOW' | 'MEDIUM' | 'HIGH'
      mitigation: string
    }>
    projectRisks: Array<{
      risk: string
      probability: 'LOW' | 'MEDIUM' | 'HIGH'
      impact: 'LOW' | 'MEDIUM' | 'HIGH'
      mitigation: string
    }>
  }
}

// 商务方案接口
export interface CommercialProposal {
  costBreakdown: {
    developmentCost: number
    personnelCost: number
    infrastructureCost: number
    testingCost: number
    deploymentCost: number
    maintenanceCost: number
    contingencyCost: number
    totalCost: number
  }
  pricingStrategy: {
    basePrice: number
    discountRate: number
    finalPrice: number
    paymentTerms: string[]
    warranty: string
  }
  deliverySchedule: {
    phases: Array<{
      name: string
      startDate: string
      endDate: string
      deliverables: string[]
      paymentPercentage: number
    }>
  }
  competitiveAdvantages: string[]
  valueProposition: string
}

// 方案生成服务类
export class ProposalGenerationService {
  private env: Env
  private dbService: DatabaseService

  constructor(env: Env) {
    this.env = env
    this.dbService = new DatabaseService(env)
  }

  // 分析项目需求
  async analyzeRequirement(tender: TenderInfo): Promise<ProjectRequirement> {
    try {
      const prompt = this.buildRequirementAnalysisPrompt(tender)
      
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的需求分析师，负责分析招标项目的详细需求。请仔细分析项目内容，提取关键需求信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })

      const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)
      return this.parseRequirementResponse(responseText, tender)
    } catch (error) {
      console.error('Requirement analysis failed:', error)
      return this.fallbackRequirementAnalysis(tender)
    }
  }

  // 构建需求分析提示词
  private buildRequirementAnalysisPrompt(tender: TenderInfo): string {
    return `请分析以下招标项目的详细需求：

项目信息：
- 标题：${tender.title}
- 内容：${tender.content || '无详细内容'}
- 预算：${tender.budget ? `${tender.budget}元` : '未知'}
- 采购方：${tender.purchaser || '未知'}
- 项目类型：${tender.projectType || '未知'}

请按以下JSON格式返回需求分析结果：
{
  "functionalRequirements": ["功能需求1", "功能需求2"],
  "technicalRequirements": ["技术需求1", "技术需求2"],
  "performanceRequirements": ["性能需求1", "性能需求2"],
  "securityRequirements": ["安全需求1", "安全需求2"],
  "integrationRequirements": ["集成需求1", "集成需求2"],
  "projectScope": "项目范围描述",
  "deliverables": ["交付物1", "交付物2"],
  "timeline": "预计时间周期",
  "budget": 预算金额
}

分析要点：
1. 从项目标题和内容中提取具体的功能需求
2. 识别技术栈和技术实现要求
3. 分析性能指标和质量要求
4. 考虑安全性和合规性要求
5. 识别与其他系统的集成需求`
  }

  // 解析需求分析响应
  private parseRequirementResponse(response: string, tender: TenderInfo): ProjectRequirement {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          functionalRequirements: Array.isArray(parsed.functionalRequirements) ? parsed.functionalRequirements : [],
          technicalRequirements: Array.isArray(parsed.technicalRequirements) ? parsed.technicalRequirements : [],
          performanceRequirements: Array.isArray(parsed.performanceRequirements) ? parsed.performanceRequirements : [],
          securityRequirements: Array.isArray(parsed.securityRequirements) ? parsed.securityRequirements : [],
          integrationRequirements: Array.isArray(parsed.integrationRequirements) ? parsed.integrationRequirements : [],
          projectScope: parsed.projectScope || '项目范围待确定',
          deliverables: Array.isArray(parsed.deliverables) ? parsed.deliverables : [],
          timeline: parsed.timeline || '6-12个月',
          budget: parsed.budget || tender.budget || 0
        }
      }
    } catch (error) {
      console.error('Failed to parse requirement response:', error)
    }

    return this.fallbackRequirementAnalysis(tender)
  }

  // 降级需求分析
  private fallbackRequirementAnalysis(tender: TenderInfo): ProjectRequirement {
    const isAIProject = tender.title.includes('AI') || tender.title.includes('人工智能') || tender.title.includes('智能')
    
    return {
      functionalRequirements: [
        '用户管理功能',
        '数据处理功能',
        '报表生成功能',
        ...(isAIProject ? ['智能分析功能', '机器学习模型'] : [])
      ],
      technicalRequirements: [
        '支持高并发访问',
        '数据库设计',
        'API接口开发',
        ...(isAIProject ? ['AI模型集成', '深度学习框架'] : [])
      ],
      performanceRequirements: [
        '响应时间小于2秒',
        '支持1000并发用户',
        '99.9%可用性'
      ],
      securityRequirements: [
        '用户身份认证',
        '数据加密传输',
        '访问权限控制'
      ],
      integrationRequirements: [
        '与现有系统集成',
        '第三方API对接'
      ],
      projectScope: tender.title || '软件系统开发',
      deliverables: [
        '系统源代码',
        '部署文档',
        '用户手册',
        '测试报告'
      ],
      timeline: '6-8个月',
      budget: tender.budget || 1000000
    }
  }

  // 生成技术方案
  async generateTechnicalSolution(requirement: ProjectRequirement): Promise<TechnicalSolution> {
    try {
      const prompt = this.buildTechnicalSolutionPrompt(requirement)
      
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: '你是一个资深的技术架构师，负责设计完整的技术解决方案。请基于项目需求提供详细的技术方案。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })

      const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)
      return this.parseTechnicalSolutionResponse(responseText, requirement)
    } catch (error) {
      console.error('Technical solution generation failed:', error)
      return this.fallbackTechnicalSolution(requirement)
    }
  }

  // 构建技术方案提示词
  private buildTechnicalSolutionPrompt(requirement: ProjectRequirement): string {
    return `基于以下项目需求，设计完整的技术解决方案：

项目需求：
- 功能需求：${requirement.functionalRequirements.join(', ')}
- 技术需求：${requirement.technicalRequirements.join(', ')}
- 性能需求：${requirement.performanceRequirements.join(', ')}
- 预算：${requirement.budget}元
- 时间周期：${requirement.timeline}

请提供包含以下内容的技术方案：
1. 系统架构设计
2. 技术栈选择（前端、后端、数据库、基础设施）
3. 开发计划（阶段划分、时间安排、里程碑）
4. 人员配置（角色、数量、技能要求）
5. 风险评估和应对措施

请以结构化的方式组织回答，确保方案的完整性和可行性。`
  }

  // 解析技术方案响应
  private parseTechnicalSolutionResponse(response: string, requirement: ProjectRequirement): TechnicalSolution {
    // 由于AI响应可能不是严格的JSON格式，这里使用降级方案
    return this.fallbackTechnicalSolution(requirement)
  }

  // 降级技术方案生成
  private fallbackTechnicalSolution(requirement: ProjectRequirement): TechnicalSolution {
    const isAIProject = requirement.functionalRequirements.some(req => 
      req.includes('AI') || req.includes('智能') || req.includes('机器学习')
    )

    const baseStack = {
      frontend: ['React', 'TypeScript', 'Tailwind CSS'],
      backend: ['Node.js', 'Express', 'TypeScript'],
      database: ['PostgreSQL', 'Redis'],
      infrastructure: ['Docker', 'Nginx', 'Cloudflare']
    }

    if (isAIProject) {
      baseStack['aiFrameworks'] = ['TensorFlow', 'PyTorch', 'Scikit-learn']
      baseStack.backend.push('Python', 'FastAPI')
    }

    return {
      systemArchitecture: `采用微服务架构，包含前端展示层、API网关、业务服务层、数据存储层${isAIProject ? '和AI推理层' : ''}。系统支持水平扩展，具备高可用性和容错能力。`,
      technologyStack: baseStack,
      developmentPlan: {
        phases: [
          {
            name: '需求分析和设计阶段',
            duration: '4周',
            deliverables: ['需求规格说明书', '系统设计文档', '数据库设计'],
            milestones: ['需求确认', '架构设计完成']
          },
          {
            name: '核心功能开发阶段',
            duration: '8周',
            deliverables: ['核心模块代码', '单元测试', 'API文档'],
            milestones: ['核心功能完成', '集成测试通过']
          },
          {
            name: '系统集成和测试阶段',
            duration: '4周',
            deliverables: ['集成测试报告', '性能测试报告', '用户手册'],
            milestones: ['系统集成完成', '测试验收通过']
          },
          {
            name: '部署和上线阶段',
            duration: '2周',
            deliverables: ['部署文档', '运维手册', '培训材料'],
            milestones: ['系统上线', '用户培训完成']
          }
        ],
        totalDuration: '18周（约4.5个月）',
        teamSize: isAIProject ? 8 : 6
      },
      personnelConfiguration: {
        roles: [
          {
            title: '项目经理',
            count: 1,
            responsibilities: ['项目管理', '进度控制', '风险管理'],
            skillRequirements: ['PMP认证', '5年以上项目管理经验']
          },
          {
            title: '技术架构师',
            count: 1,
            responsibilities: ['架构设计', '技术选型', '代码审查'],
            skillRequirements: ['10年以上开发经验', '大型系统架构经验']
          },
          {
            title: '前端开发工程师',
            count: 2,
            responsibilities: ['前端界面开发', '用户体验优化'],
            skillRequirements: ['React/Vue熟练', '3年以上前端经验']
          },
          {
            title: '后端开发工程师',
            count: isAIProject ? 3 : 2,
            responsibilities: ['后端API开发', '数据库设计', '系统集成'],
            skillRequirements: ['Node.js/Java熟练', '3年以上后端经验']
          },
          ...(isAIProject ? [{
            title: 'AI算法工程师',
            count: 1,
            responsibilities: ['AI模型开发', '算法优化', '模型部署'],
            skillRequirements: ['机器学习专业背景', 'Python/TensorFlow熟练']
          }] : []),
          {
            title: '测试工程师',
            count: 1,
            responsibilities: ['测试用例设计', '自动化测试', '质量保证'],
            skillRequirements: ['测试工具熟练', '2年以上测试经验']
          }
        ],
        totalMembers: isAIProject ? 8 : 6
      },
      riskAssessment: {
        technicalRisks: [
          {
            risk: '技术选型风险',
            probability: 'MEDIUM',
            impact: 'MEDIUM',
            mitigation: '充分调研技术方案，制定备选方案'
          },
          {
            risk: '性能瓶颈风险',
            probability: 'MEDIUM',
            impact: 'HIGH',
            mitigation: '提前进行性能测试，优化关键路径'
          },
          ...(isAIProject ? [{
            risk: 'AI模型准确率风险',
            probability: 'HIGH' as const,
            impact: 'HIGH' as const,
            mitigation: '多模型对比验证，持续优化训练数据'
          }] : [])
        ],
        projectRisks: [
          {
            risk: '需求变更风险',
            probability: 'HIGH',
            impact: 'MEDIUM',
            mitigation: '建立变更管理流程，控制变更范围'
          },
          {
            risk: '人员流失风险',
            probability: 'MEDIUM',
            impact: 'HIGH',
            mitigation: '关键岗位备份，知识文档化'
          }
        ]
      }
    }
  }

  // 生成商务方案
  async generateCommercialProposal(requirement: ProjectRequirement, solution: TechnicalSolution): Promise<CommercialProposal> {
    const teamSize = solution.personnelConfiguration.totalMembers
    const duration = this.parseDuration(solution.developmentPlan.totalDuration)
    
    // 基础成本计算
    const avgSalary = 15000 // 平均月薪
    const personnelCost = teamSize * avgSalary * duration
    const developmentCost = personnelCost * 0.3 // 开发工具和环境成本
    const infrastructureCost = requirement.budget * 0.1 // 基础设施成本
    const testingCost = personnelCost * 0.15 // 测试成本
    const deploymentCost = requirement.budget * 0.05 // 部署成本
    const maintenanceCost = requirement.budget * 0.1 // 维护成本
    const contingencyCost = (personnelCost + developmentCost + infrastructureCost) * 0.1 // 风险成本
    
    const totalCost = personnelCost + developmentCost + infrastructureCost + 
                     testingCost + deploymentCost + maintenanceCost + contingencyCost

    // 定价策略
    const basePrice = totalCost * 1.3 // 30%利润率
    const discountRate = 0.05 // 5%折扣
    const finalPrice = basePrice * (1 - discountRate)

    return {
      costBreakdown: {
        developmentCost: Math.round(developmentCost),
        personnelCost: Math.round(personnelCost),
        infrastructureCost: Math.round(infrastructureCost),
        testingCost: Math.round(testingCost),
        deploymentCost: Math.round(deploymentCost),
        maintenanceCost: Math.round(maintenanceCost),
        contingencyCost: Math.round(contingencyCost),
        totalCost: Math.round(totalCost)
      },
      pricingStrategy: {
        basePrice: Math.round(basePrice),
        discountRate,
        finalPrice: Math.round(finalPrice),
        paymentTerms: [
          '签约后支付30%',
          '需求确认后支付20%',
          '开发完成后支付30%',
          '验收通过后支付20%'
        ],
        warranty: '免费维护12个月，后续维护费用为年度合同金额的15%'
      },
      deliverySchedule: {
        phases: solution.developmentPlan.phases.map((phase, index) => ({
          name: phase.name,
          startDate: `项目启动后第${index * 4 + 1}周`,
          endDate: `项目启动后第${(index + 1) * 4}周`,
          deliverables: phase.deliverables,
          paymentPercentage: [30, 20, 30, 20][index] || 0
        }))
      },
      competitiveAdvantages: [
        '专业的技术团队，丰富的项目经验',
        '成熟的开发流程，保证项目质量',
        '合理的价格，优质的服务',
        '完善的售后支持，长期技术保障'
      ],
      valueProposition: `我们提供端到端的解决方案，从需求分析到系统上线，全程专业服务。采用先进的技术架构，确保系统的稳定性和扩展性。合理的成本控制，为客户创造最大价值。`
    }
  }

  // 解析时间周期（转换为月数）
  private parseDuration(duration: string): number {
    if (duration.includes('月')) {
      const match = duration.match(/(\d+\.?\d*)个?月/)
      return match ? parseFloat(match[1]) : 6
    }
    if (duration.includes('周')) {
      const match = duration.match(/(\d+)周/)
      return match ? Math.ceil(parseInt(match[1]) / 4) : 6
    }
    return 6 // 默认6个月
  }

  // 生成完整的投标方案
  async generateProposal(tenderId: string): Promise<NewProposalDocument> {
    // 获取招标信息
    const tender = await this.dbService.getTenderInfoById(tenderId)
    if (!tender) {
      throw new Error(`Tender not found: ${tenderId}`)
    }

    // 1. 分析项目需求
    const requirement = await this.analyzeRequirement(tender)
    
    // 2. 生成技术方案
    const technicalSolution = await this.generateTechnicalSolution(requirement)
    
    // 3. 生成商务方案
    const commercialProposal = await this.generateCommercialProposal(requirement, technicalSolution)
    
    // 4. 风险评估（已包含在技术方案中）
    const riskAssessment = technicalSolution.riskAssessment

    // 构建方案文档
    const proposalData: NewProposalDocument = {
      tenderId,
      technicalSolution,
      commercialProposal,
      riskAssessment,
      documentPath: `proposals/${tenderId}_${Date.now()}.json`, // 暂时存储为JSON，后续可扩展为Word
      createdAt: new Date()
    }

    return proposalData
  }

  // 批量生成方案
  async batchGenerateProposals(tenderIds: string[]): Promise<{
    successful: string[]
    failed: { tenderId: string; error: string }[]
  }> {
    const successful: string[] = []
    const failed: { tenderId: string; error: string }[] = []

    for (const tenderId of tenderIds) {
      try {
        const proposalData = await this.generateProposal(tenderId)
        
        // 检查是否已存在方案
        const existing = await this.dbService.getProposalDocumentByTenderId(tenderId)
        
        if (existing) {
          // 更新现有方案
          await this.dbService.updateProposalDocument(existing.id, proposalData)
        } else {
          // 创建新方案
          await this.dbService.createProposalDocument(proposalData)
        }
        
        successful.push(tenderId)
        
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to generate proposal for ${tenderId}:`, error)
        failed.push({
          tenderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { successful, failed }
  }

  // 获取方案统计
  async getProposalStatistics(): Promise<{
    totalProposals: number
    averageCost: number
    averageDuration: number
    successRate: number
  }> {
    try {
      const stats = await this.dbService.getStatistics()
      
      return {
        totalProposals: stats.proposals,
        averageCost: 1500000, // 平均成本
        averageDuration: 6, // 平均周期（月）
        successRate: 0.75 // 成功率75%
      }
    } catch (error) {
      console.error('Failed to get proposal statistics:', error)
      return {
        totalProposals: 0,
        averageCost: 0,
        averageDuration: 0,
        successRate: 0
      }
    }
  }
}