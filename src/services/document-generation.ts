import type { TechnicalSolution, CommercialProposal } from './proposal-generation'
import type { Env } from '../index'

// 文档生成服务类
export class DocumentGenerationService {
  private env: Env

  constructor(env: Env) {
    this.env = env
  }

  // 生成投标方案文档（Markdown格式）
  async generateProposalDocument(
    tenderId: string,
    tenderTitle: string,
    technicalSolution: TechnicalSolution,
    commercialProposal: CommercialProposal
  ): Promise<string> {
    const document = this.buildMarkdownDocument(tenderTitle, technicalSolution, commercialProposal)
    
    // 存储到R2
    const fileName = `proposal_${tenderId}_${Date.now()}.md`
    const key = `proposals/${fileName}`
    
    try {
      await this.env.STORAGE.put(key, document, {
        httpMetadata: {
          contentType: 'text/markdown',
          contentDisposition: `attachment; filename="${fileName}"`
        },
        customMetadata: {
          tenderId,
          generatedAt: new Date().toISOString(),
          documentType: 'proposal'
        }
      })
      
      return key
    } catch (error) {
      console.error('Failed to store document to R2:', error)
      throw new Error('Document storage failed')
    }
  }

  // 构建Markdown文档
  private buildMarkdownDocument(
    tenderTitle: string,
    technicalSolution: TechnicalSolution,
    commercialProposal: CommercialProposal
  ): string {
    const currentDate = new Date().toLocaleDateString('zh-CN')
    
    return `# 投标技术方案书

## 项目信息
- **项目名称**: ${tenderTitle}
- **方案生成日期**: ${currentDate}
- **方案版本**: v1.0

---

## 1. 项目概述

本方案针对"${tenderTitle}"项目，提供完整的技术解决方案和商务报价。我们将采用先进的技术架构和成熟的开发流程，确保项目的成功交付。

## 2. 技术方案

### 2.1 系统架构

${technicalSolution.systemArchitecture}

### 2.2 技术栈选择

#### 前端技术
${technicalSolution.technologyStack.frontend.map(tech => `- ${tech}`).join('\n')}

#### 后端技术
${technicalSolution.technologyStack.backend.map(tech => `- ${tech}`).join('\n')}

#### 数据库技术
${technicalSolution.technologyStack.database.map(tech => `- ${tech}`).join('\n')}

#### 基础设施
${technicalSolution.technologyStack.infrastructure.map(tech => `- ${tech}`).join('\n')}

${technicalSolution.technologyStack.aiFrameworks ? `
#### AI框架
${technicalSolution.technologyStack.aiFrameworks.map(tech => `- ${tech}`).join('\n')}
` : ''}

### 2.3 开发计划

**项目总周期**: ${technicalSolution.developmentPlan.totalDuration}
**团队规模**: ${technicalSolution.developmentPlan.teamSize}人

#### 开发阶段

${technicalSolution.developmentPlan.phases.map((phase, index) => `
##### 第${index + 1}阶段：${phase.name}
- **持续时间**: ${phase.duration}
- **主要交付物**:
${phase.deliverables.map(item => `  - ${item}`).join('\n')}
- **关键里程碑**:
${phase.milestones.map(item => `  - ${item}`).join('\n')}
`).join('\n')}

### 2.4 人员配置

**团队总人数**: ${technicalSolution.personnelConfiguration.totalMembers}人

${technicalSolution.personnelConfiguration.roles.map(role => `
#### ${role.title} (${role.count}人)
- **主要职责**:
${role.responsibilities.map(resp => `  - ${resp}`).join('\n')}
- **技能要求**:
${role.skillRequirements.map(skill => `  - ${skill}`).join('\n')}
`).join('\n')}

## 3. 风险评估与应对

### 3.1 技术风险

${technicalSolution.riskAssessment.technicalRisks.map(risk => `
#### ${risk.risk}
- **发生概率**: ${risk.probability}
- **影响程度**: ${risk.impact}
- **应对措施**: ${risk.mitigation}
`).join('\n')}

### 3.2 项目风险

${technicalSolution.riskAssessment.projectRisks.map(risk => `
#### ${risk.risk}
- **发生概率**: ${risk.probability}
- **影响程度**: ${risk.impact}
- **应对措施**: ${risk.mitigation}
`).join('\n')}

## 4. 商务方案

### 4.1 成本构成

| 成本项目 | 金额（元） |
|---------|-----------|
| 人力成本 | ${commercialProposal.costBreakdown.personnelCost.toLocaleString()} |
| 开发成本 | ${commercialProposal.costBreakdown.developmentCost.toLocaleString()} |
| 基础设施成本 | ${commercialProposal.costBreakdown.infrastructureCost.toLocaleString()} |
| 测试成本 | ${commercialProposal.costBreakdown.testingCost.toLocaleString()} |
| 部署成本 | ${commercialProposal.costBreakdown.deploymentCost.toLocaleString()} |
| 维护成本 | ${commercialProposal.costBreakdown.maintenanceCost.toLocaleString()} |
| 风险成本 | ${commercialProposal.costBreakdown.contingencyCost.toLocaleString()} |
| **总成本** | **${commercialProposal.costBreakdown.totalCost.toLocaleString()}** |

### 4.2 报价策略

- **基础报价**: ${commercialProposal.pricingStrategy.basePrice.toLocaleString()}元
- **优惠折扣**: ${(commercialProposal.pricingStrategy.discountRate * 100).toFixed(1)}%
- **最终报价**: **${commercialProposal.pricingStrategy.finalPrice.toLocaleString()}元**

### 4.3 付款条件

${commercialProposal.pricingStrategy.paymentTerms.map(term => `- ${term}`).join('\n')}

### 4.4 质保条件

${commercialProposal.pricingStrategy.warranty}

### 4.5 交付计划

${commercialProposal.deliverySchedule.phases.map((phase, index) => `
#### 第${index + 1}阶段：${phase.name}
- **开始时间**: ${phase.startDate}
- **结束时间**: ${phase.endDate}
- **付款比例**: ${phase.paymentPercentage}%
- **交付物**:
${phase.deliverables.map(item => `  - ${item}`).join('\n')}
`).join('\n')}

## 5. 竞争优势

${commercialProposal.competitiveAdvantages.map(advantage => `- ${advantage}`).join('\n')}

## 6. 价值主张

${commercialProposal.valueProposition}

---

## 联系方式

如有任何疑问，请随时与我们联系：

- **项目经理**: 张经理
- **联系电话**: 138-0000-0000
- **邮箱**: project@company.com
- **公司地址**: 北京市朝阳区科技园区

---

*本方案书由AI智能分析系统自动生成，如需定制化调整，请联系我们的技术团队。*
`
  }

  // 获取文档（从R2读取）
  async getDocument(documentPath: string): Promise<string | null> {
    try {
      const object = await this.env.STORAGE.get(documentPath)
      
      if (!object) {
        return null
      }
      
      return await object.text()
    } catch (error) {
      console.error('Failed to get document from R2:', error)
      return null
    }
  }

  // 删除文档
  async deleteDocument(documentPath: string): Promise<boolean> {
    try {
      await this.env.STORAGE.delete(documentPath)
      return true
    } catch (error) {
      console.error('Failed to delete document from R2:', error)
      return false
    }
  }

  // 列出所有方案文档
  async listProposalDocuments(prefix: string = 'proposals/'): Promise<Array<{
    key: string
    size: number
    lastModified: Date
    metadata?: Record<string, string>
  }>> {
    try {
      const objects = await this.env.STORAGE.list({ prefix })
      
      return objects.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        metadata: obj.customMetadata
      }))
    } catch (error) {
      console.error('Failed to list documents from R2:', error)
      return []
    }
  }

  // 生成文档下载URL（预签名URL）
  async generateDownloadUrl(documentPath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      // 注意：Cloudflare R2 的预签名URL生成方式可能不同
      // 这里提供一个简化的实现，实际使用时需要根据R2的API调整
      const baseUrl = `https://${this.env.STORAGE.name}.r2.cloudflarestorage.com`
      return `${baseUrl}/${documentPath}?expires=${Date.now() + expiresIn * 1000}`
    } catch (error) {
      console.error('Failed to generate download URL:', error)
      return null
    }
  }

  // 生成HTML格式的方案文档
  async generateHtmlDocument(
    tenderId: string,
    tenderTitle: string,
    technicalSolution: TechnicalSolution,
    commercialProposal: CommercialProposal
  ): Promise<string> {
    const htmlContent = this.buildHtmlDocument(tenderTitle, technicalSolution, commercialProposal)
    
    // 存储到R2
    const fileName = `proposal_${tenderId}_${Date.now()}.html`
    const key = `proposals/html/${fileName}`
    
    try {
      await this.env.STORAGE.put(key, htmlContent, {
        httpMetadata: {
          contentType: 'text/html',
          contentDisposition: `inline; filename="${fileName}"`
        },
        customMetadata: {
          tenderId,
          generatedAt: new Date().toISOString(),
          documentType: 'proposal',
          format: 'html'
        }
      })
      
      return key
    } catch (error) {
      console.error('Failed to store HTML document to R2:', error)
      throw new Error('HTML document storage failed')
    }
  }

  // 构建HTML文档
  private buildHtmlDocument(
    tenderTitle: string,
    technicalSolution: TechnicalSolution,
    commercialProposal: CommercialProposal
  ): string {
    const currentDate = new Date().toLocaleDateString('zh-CN')
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投标技术方案书 - ${tenderTitle}</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        h3 {
            color: #7f8c8d;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .highlight {
            background-color: #e8f4fd;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        .risk-item {
            background-color: #fff3cd;
            padding: 10px;
            margin: 10px 0;
            border-left: 4px solid #ffc107;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>投标技术方案书</h1>
        
        <div class="highlight">
            <strong>项目名称:</strong> ${tenderTitle}<br>
            <strong>方案生成日期:</strong> ${currentDate}<br>
            <strong>方案版本:</strong> v1.0
        </div>

        <h2>1. 项目概述</h2>
        <p>本方案针对"${tenderTitle}"项目，提供完整的技术解决方案和商务报价。我们将采用先进的技术架构和成熟的开发流程，确保项目的成功交付。</p>

        <h2>2. 技术方案</h2>
        
        <h3>2.1 系统架构</h3>
        <p>${technicalSolution.systemArchitecture}</p>

        <h3>2.2 技术栈选择</h3>
        <h4>前端技术</h4>
        <ul>
            ${technicalSolution.technologyStack.frontend.map(tech => `<li>${tech}</li>`).join('')}
        </ul>
        
        <h4>后端技术</h4>
        <ul>
            ${technicalSolution.technologyStack.backend.map(tech => `<li>${tech}</li>`).join('')}
        </ul>

        <h3>2.3 人员配置</h3>
        <p><strong>团队总人数:</strong> ${technicalSolution.personnelConfiguration.totalMembers}人</p>
        
        ${technicalSolution.personnelConfiguration.roles.map(role => `
            <div class="highlight">
                <h4>${role.title} (${role.count}人)</h4>
                <p><strong>主要职责:</strong> ${role.responsibilities.join(', ')}</p>
                <p><strong>技能要求:</strong> ${role.skillRequirements.join(', ')}</p>
            </div>
        `).join('')}

        <h2>3. 商务方案</h2>
        
        <h3>3.1 成本构成</h3>
        <table>
            <tr><th>成本项目</th><th>金额（元）</th></tr>
            <tr><td>人力成本</td><td>${commercialProposal.costBreakdown.personnelCost.toLocaleString()}</td></tr>
            <tr><td>开发成本</td><td>${commercialProposal.costBreakdown.developmentCost.toLocaleString()}</td></tr>
            <tr><td>基础设施成本</td><td>${commercialProposal.costBreakdown.infrastructureCost.toLocaleString()}</td></tr>
            <tr><td>测试成本</td><td>${commercialProposal.costBreakdown.testingCost.toLocaleString()}</td></tr>
            <tr><td>部署成本</td><td>${commercialProposal.costBreakdown.deploymentCost.toLocaleString()}</td></tr>
            <tr><td>维护成本</td><td>${commercialProposal.costBreakdown.maintenanceCost.toLocaleString()}</td></tr>
            <tr><td>风险成本</td><td>${commercialProposal.costBreakdown.contingencyCost.toLocaleString()}</td></tr>
            <tr style="background-color: #e8f4fd; font-weight: bold;">
                <td>总成本</td>
                <td>${commercialProposal.costBreakdown.totalCost.toLocaleString()}</td>
            </tr>
        </table>

        <h3>3.2 最终报价</h3>
        <div class="highlight">
            <h4 style="color: #e74c3c; font-size: 24px;">
                ${commercialProposal.pricingStrategy.finalPrice.toLocaleString()}元
            </h4>
            <p>优惠折扣: ${(commercialProposal.pricingStrategy.discountRate * 100).toFixed(1)}%</p>
        </div>

        <h3>3.3 付款条件</h3>
        <ul>
            ${commercialProposal.pricingStrategy.paymentTerms.map(term => `<li>${term}</li>`).join('')}
        </ul>

        <h2>4. 竞争优势</h2>
        <ul>
            ${commercialProposal.competitiveAdvantages.map(advantage => `<li>${advantage}</li>`).join('')}
        </ul>

        <h2>5. 价值主张</h2>
        <div class="highlight">
            <p>${commercialProposal.valueProposition}</p>
        </div>

        <div class="footer">
            <p><strong>联系方式:</strong></p>
            <p>项目经理: 张经理 | 电话: 138-0000-0000 | 邮箱: project@company.com</p>
            <p>公司地址: 北京市朝阳区科技园区</p>
            <hr>
            <p><em>本方案书由AI智能分析系统自动生成，如需定制化调整，请联系我们的技术团队。</em></p>
        </div>
    </div>
</body>
</html>`
  }
}