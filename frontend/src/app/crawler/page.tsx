'use client';

import React, { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Descriptions,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useCrawlerStart, useCrawlerStop, useSystemStatus } from '@/hooks/useProjects';
import { formatDate, formatTimeAgo } from '@/utils/format';

const { Option } = Select;

export default function CrawlerPage() {
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [form] = Form.useForm();

  // API hooks
  const { data: systemStatus, isLoading: statusLoading, refetch } = useSystemStatus();
  const crawlerStartMutation = useCrawlerStart();
  const crawlerStopMutation = useCrawlerStop();

  // 模拟爬虫任务数据
  const crawlerTasks = [
    {
      id: '1',
      name: '剑鱼标讯数据抓取',
      status: 'running',
      lastRun: '2024-12-31T10:30:00Z',
      nextRun: '2024-12-31T11:30:00Z',
      successCount: 1250,
      errorCount: 15,
      progress: 75,
      source: '剑鱼标讯',
      category: '全部分类',
      interval: '1小时'
    },
    {
      id: '2',
      name: '政府采购网数据抓取',
      status: 'stopped',
      lastRun: '2024-12-31T09:00:00Z',
      nextRun: null,
      successCount: 890,
      errorCount: 8,
      progress: 0,
      source: '政府采购网',
      category: '软件开发',
      interval: '2小时'
    },
    {
      id: '3',
      name: '招标网数据抓取',
      status: 'error',
      lastRun: '2024-12-31T08:45:00Z',
      nextRun: '2024-12-31T12:45:00Z',
      successCount: 567,
      errorCount: 23,
      progress: 0,
      source: '招标网',
      category: '系统集成',
      interval: '4小时'
    }
  ];

  // 状态配置
  const statusConfig = {
    running: { label: '运行中', color: 'processing', icon: <PlayCircleOutlined /> },
    stopped: { label: '已停止', color: 'default', icon: <PauseCircleOutlined /> },
    error: { label: '错误', color: 'error', icon: <ExclamationCircleOutlined /> },
    completed: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> }
  };

  // 表格列配置
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '数据源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof statusConfig) => (
        <Tag color={statusConfig[status]?.color} icon={statusConfig[status]?.icon}>
          {statusConfig[status]?.label}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: any) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'error' ? 'exception' : 'normal'}
        />
      ),
    },
    {
      title: '成功/错误',
      key: 'counts',
      width: 120,
      render: (_, record: any) => (
        <div>
          <div style={{ color: '#52c41a' }}>成功: {record.successCount}</div>
          <div style={{ color: '#ff4d4f' }}>错误: {record.errorCount}</div>
        </div>
      ),
    },
    {
      title: '最后运行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      width: 120,
      render: (date: string) => formatTimeAgo(date),
    },
    {
      title: '下次运行',
      dataIndex: 'nextRun',
      key: 'nextRun',
      width: 120,
      render: (date: string | null) => date ? formatTimeAgo(date) : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewLogs(record)}
          />
          <Button
            type="text"
            icon={record.status === 'running' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleTask(record)}
          />
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => handleConfigTask(record)}
          />
        </Space>
      ),
    },
  ];

  // 处理启动/停止爬虫
  const handleStartCrawler = () => {
    crawlerStartMutation.mutate();
  };

  const handleStopCrawler = () => {
    crawlerStopMutation.mutate();
  };

  // 处理任务切换
  const handleToggleTask = (task: any) => {
    if (task.status === 'running') {
      message.success(`任务 ${task.name} 已停止`);
    } else {
      message.success(`任务 ${task.name} 已启动`);
    }
    // 这里应该调用相应的API
  };

  // 处理查看日志
  const handleViewLogs = (task: any) => {
    setSelectedTask(task);
    setLogModalVisible(true);
  };

  // 处理配置任务
  const handleConfigTask = (task: any) => {
    setSelectedTask(task);
    form.setFieldsValue({
      name: task.name,
      source: task.source,
      category: task.category,
      interval: task.interval,
      enabled: task.status === 'running'
    });
    setConfigModalVisible(true);
  };

  // 处理配置保存
  const handleConfigSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('Config values:', values);
      message.success('配置已保存');
      setConfigModalVisible(false);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 计算统计数据
  const totalTasks = crawlerTasks.length;
  const runningTasks = crawlerTasks.filter(t => t.status === 'running').length;
  const errorTasks = crawlerTasks.filter(t => t.status === 'error').length;
  const totalSuccess = crawlerTasks.reduce((sum, t) => sum + t.successCount, 0);
  const totalErrors = crawlerTasks.reduce((sum, t) => sum + t.errorCount, 0);
  const successRate = totalSuccess / (totalSuccess + totalErrors) * 100;

  return (
    <MainLayout title="数据抓取">
      {/* 系统状态警告 */}
      {systemStatus?.data?.crawlerStatus === 'stopped' && (
        <Alert
          message="爬虫服务已停止"
          description="数据抓取服务当前处于停止状态，请启动服务以开始数据收集。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartCrawler}
              loading={crawlerStartMutation.isPending}
            >
              启动服务
            </Button>
          }
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={totalTasks}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="运行中"
              value={runningTasks}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="错误任务"
              value={errorTasks}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="成功率"
              value={successRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 控制面板 */}
      <Card title="爬虫控制" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space size="large">
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>服务状态</div>
                <Tag
                  color={systemStatus?.data?.crawlerStatus === 'running' ? 'processing' : 'default'}
                  icon={systemStatus?.data?.crawlerStatus === 'running' ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                >
                  {systemStatus?.data?.crawlerStatus === 'running' ? '运行中' : '已停止'}
                </Tag>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>最后更新</div>
                <div>{systemStatus?.data?.lastCrawlTime ? formatTimeAgo(systemStatus.data.lastCrawlTime) : '暂无数据'}</div>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                  loading={statusLoading}
                >
                  刷新状态
                </Button>
                {systemStatus?.data?.crawlerStatus === 'running' ? (
                  <Button
                    danger
                    icon={<PauseCircleOutlined />}
                    onClick={handleStopCrawler}
                    loading={crawlerStopMutation.isPending}
                  >
                    停止服务
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartCrawler}
                    loading={crawlerStartMutation.isPending}
                  >
                    启动服务
                  </Button>
                )}
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card title="抓取任务">
        <Table
          columns={columns}
          dataSource={crawlerTasks}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 任务配置模态框 */}
      <Modal
        title="任务配置"
        open={configModalVisible}
        onOk={handleConfigSave}
        onCancel={() => setConfigModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="source"
            label="数据源"
            rules={[{ required: true, message: '请选择数据源' }]}
          >
            <Select>
              <Option value="剑鱼标讯">剑鱼标讯</Option>
              <Option value="政府采购网">政府采购网</Option>
              <Option value="招标网">招标网</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="category"
            label="项目分类"
            rules={[{ required: true, message: '请选择项目分类' }]}
          >
            <Select>
              <Option value="全部分类">全部分类</Option>
              <Option value="软件开发">软件开发</Option>
              <Option value="系统集成">系统集成</Option>
              <Option value="硬件采购">硬件采购</Option>
              <Option value="咨询服务">咨询服务</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="interval"
            label="抓取间隔"
            rules={[{ required: true, message: '请选择抓取间隔' }]}
          >
            <Select>
              <Option value="30分钟">30分钟</Option>
              <Option value="1小时">1小时</Option>
              <Option value="2小时">2小时</Option>
              <Option value="4小时">4小时</Option>
              <Option value="6小时">6小时</Option>
              <Option value="12小时">12小时</Option>
              <Option value="24小时">24小时</Option>
            </Select>
          </Form.Item>
          <Form.Item name="enabled" label="启用任务" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 日志查看模态框 */}
      <Modal
        title="任务日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLogModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            <Descriptions column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务名称">{selectedTask.name}</Descriptions.Item>
              <Descriptions.Item label="数据源">{selectedTask.source}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusConfig[selectedTask.status as keyof typeof statusConfig]?.color}>
                  {statusConfig[selectedTask.status as keyof typeof statusConfig]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最后运行">{formatDate(selectedTask.lastRun)}</Descriptions.Item>
            </Descriptions>
            
            <div style={{ 
              height: 300, 
              backgroundColor: '#f5f5f5', 
              padding: 16, 
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              overflowY: 'auto'
            }}>
              <div>[2024-12-31 10:30:15] INFO: 开始抓取数据...</div>
              <div>[2024-12-31 10:30:16] INFO: 连接到数据源: {selectedTask.source}</div>
              <div>[2024-12-31 10:30:17] INFO: 获取项目列表...</div>
              <div>[2024-12-31 10:30:18] INFO: 找到 25 个新项目</div>
              <div>[2024-12-31 10:30:19] INFO: 开始处理项目数据...</div>
              <div>[2024-12-31 10:30:20] INFO: 处理完成 5/25 项目</div>
              <div>[2024-12-31 10:30:21] INFO: 处理完成 10/25 项目</div>
              <div>[2024-12-31 10:30:22] INFO: 处理完成 15/25 项目</div>
              <div>[2024-12-31 10:30:23] INFO: 处理完成 20/25 项目</div>
              <div>[2024-12-31 10:30:24] INFO: 处理完成 25/25 项目</div>
              <div>[2024-12-31 10:30:25] INFO: 数据抓取完成</div>
              {selectedTask.status === 'error' && (
                <div style={{ color: '#ff4d4f' }}>
                  [2024-12-31 10:30:26] ERROR: 连接超时，任务失败
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}