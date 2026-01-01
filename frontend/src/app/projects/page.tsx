'use client';

import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Modal,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useProjects, useAnalyzeProject, useGenerateProposal } from '@/hooks/useProjects';
import { Project } from '@/hooks/useProjects';
import { formatCurrency, formatDate } from '@/utils/format';

const { Search } = Input;
const { Option } = Select;

export default function ProjectsPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // API hooks
  const { data: projectsData, isLoading, refetch } = useProjects({
    page: currentPage,
    limit: pageSize,
    search: searchText,
    category: selectedCategory,
    status: selectedStatus,
  });

  const analyzeProjectMutation = useAnalyzeProject();
  const generateProposalMutation = useGenerateProposal();

  // 项目状态配置
  const statusConfig = {
    active: { label: '进行中', color: 'processing' },
    completed: { label: '已完成', color: 'success' },
    cancelled: { label: '已取消', color: 'error' },
  };

  // 项目分类选项
  const categoryOptions = [
    { label: '软件开发', value: '软件开发' },
    { label: '系统集成', value: '系统集成' },
    { label: '硬件采购', value: '硬件采购' },
    { label: '咨询服务', value: '咨询服务' },
    { label: '运维服务', value: '运维服务' },
  ];

  // 表格列配置
  const columns = [
    {
      title: '项目名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: true,
      render: (text: string, record: Project) => (
        <Tooltip title={text}>
          <Button
            type="link"
            onClick={() => handleViewDetail(record)}
            style={{ padding: 0, height: 'auto' }}
          >
            {text}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      align: 'right' as const,
      render: (budget: number) => formatCurrency(budget),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof statusConfig) => (
        <Tag color={statusConfig[status]?.color}>
          {statusConfig[status]?.label}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Project) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="AI分析">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              loading={analyzeProjectMutation.isPending}
              onClick={() => handleAnalyzeProject(record.id)}
            />
          </Tooltip>
          <Tooltip title="生成方案">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              loading={generateProposalMutation.isPending}
              onClick={() => handleGenerateProposal(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 处理查看详情
  const handleViewDetail = (project: Project) => {
    setSelectedProject(project);
    setDetailModalVisible(true);
  };

  // 处理AI分析
  const handleAnalyzeProject = (projectId: string) => {
    analyzeProjectMutation.mutate(projectId);
  };

  // 处理生成方案
  const handleGenerateProposal = (projectId: string) => {
    generateProposalMutation.mutate(projectId);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 处理筛选
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  // 处理刷新
  const handleRefresh = () => {
    refetch();
    message.success('数据已刷新');
  };

  // 统计数据
  const projects = projectsData?.data?.projects || [];
  const pagination = projectsData?.data?.pagination;
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  return (
    <MainLayout title="项目管理">
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="项目总数"
              value={pagination?.total || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="进行中"
              value={activeProjects}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedProjects}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总预算"
              value={totalBudget}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        {/* 搜索和筛选 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8}>
              <Search
                placeholder="搜索项目名称"
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="选择分类"
                allowClear
                value={selectedCategory || undefined}
                onChange={handleCategoryChange}
                style={{ width: '100%' }}
              >
                {categoryOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="选择状态"
                allowClear
                value={selectedStatus || undefined}
                onChange={handleStatusChange}
                style={{ width: '100%' }}
              >
                <Option value="active">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={isLoading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 项目表格 */}
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 项目详情模态框 */}
      <Modal
        title="项目详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="analyze"
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={analyzeProjectMutation.isPending}
            onClick={() => {
              if (selectedProject) {
                handleAnalyzeProject(selectedProject.id);
                setDetailModalVisible(false);
              }
            }}
          >
            AI分析
          </Button>,
        ]}
        width={800}
      >
        {selectedProject && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <h3>{selectedProject.title}</h3>
              </Col>
              <Col span={12}>
                <p><strong>分类：</strong>{selectedProject.category}</p>
              </Col>
              <Col span={12}>
                <p><strong>预算：</strong>{formatCurrency(selectedProject.budget)}</p>
              </Col>
              <Col span={12}>
                <p><strong>状态：</strong>
                  <Tag color={statusConfig[selectedProject.status as keyof typeof statusConfig]?.color}>
                    {statusConfig[selectedProject.status as keyof typeof statusConfig]?.label}
                  </Tag>
                </p>
              </Col>
              <Col span={12}>
                <p><strong>创建时间：</strong>{formatDate(selectedProject.createdAt)}</p>
              </Col>
              {selectedProject.description && (
                <Col span={24}>
                  <p><strong>项目描述：</strong></p>
                  <p>{selectedProject.description}</p>
                </Col>
              )}
              {selectedProject.deadline && (
                <Col span={12}>
                  <p><strong>截止时间：</strong>{formatDate(selectedProject.deadline)}</p>
                </Col>
              )}
              {selectedProject.location && (
                <Col span={12}>
                  <p><strong>项目地点：</strong>{selectedProject.location}</p>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}