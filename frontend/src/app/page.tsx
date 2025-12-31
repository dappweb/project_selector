'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Button, Space } from 'antd';
import {
  ProjectOutlined,
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useSystemStatus, useStatistics } from '@/hooks/useProjects';

export default function HomePage() {
  const { data: systemStatus, isLoading: statusLoading } = useSystemStatus();
  const { data: statistics, isLoading: statsLoading } = useStatistics();

  const quickActions = [
    {
      title: '启动数据抓取',
      icon: <PlayCircleOutlined />,
      action: () => console.log('Start crawler'),
    },
    {
      title: '生成分析报告',
      icon: <FileTextOutlined />,
      action: () => console.log('Generate report'),
    },
  ];

  return (
    <MainLayout title="仪表板">
      <div style={{ padding: '0 0 24px 0' }}>
        {/* 快速操作 */}
        <Card title="快速操作" style={{ marginBottom: 24 }}>
          <Space size="large">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                type="primary"
                icon={action.icon}
                size="large"
                onClick={action.action}
              >
                {action.title}
              </Button>
            ))}
          </Space>
        </Card>

        {/* 关键指标 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="今日新增项目"
                value={systemStatus?.data?.todayNewProjects || 0}
                prefix={<ProjectOutlined />}
                loading={statusLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="项目总数"
                value={systemStatus?.data?.totalProjects || 0}
                prefix={<ProjectOutlined />}
                loading={statusLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均项目价值"
                value={1250000}
                prefix={<DollarOutlined />}
                suffix="元"
                precision={0}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="中标率"
                value={68.5}
                prefix={<TrophyOutlined />}
                suffix="%"
                precision={1}
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>

        {/* 系统状态 */}
        <Card title="系统状态">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="爬虫状态"
                value={systemStatus?.data?.crawlerStatus === 'running' ? '运行中' : '已停止'}
                valueStyle={{
                  color: systemStatus?.data?.crawlerStatus === 'running' ? '#3f8600' : '#cf1322',
                }}
                loading={statusLoading}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="系统健康状况"
                value={systemStatus?.data?.systemHealth === 'healthy' ? '健康' : '警告'}
                valueStyle={{
                  color: systemStatus?.data?.systemHealth === 'healthy' ? '#3f8600' : '#faad14',
                }}
                loading={statusLoading}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="最后更新时间"
                value={systemStatus?.data?.lastCrawlTime ? new Date(systemStatus.data.lastCrawlTime).toLocaleString('zh-CN') : '暂无数据'}
                loading={statusLoading}
              />
            </Col>
          </Row>
        </Card>
      </div>
    </MainLayout>
  );
}