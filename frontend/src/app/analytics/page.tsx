'use client';

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Space,
  Button,
  Tabs,
  Table,
  Progress,
  Tag,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TrophyOutlined,
  DollarOutlined,
  ProjectOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  // 模拟数据
  const overviewData = {
    totalProjects: 156,
    totalValue: 45600000,
    winRate: 68.5,
    avgProjectValue: 292308,
    monthlyGrowth: 15.2,
    valueGrowth: 23.8,
    newProjects: 24,
    completedProjects: 18
  };

  const categoryData = [
    { name: '软件开发', value: 45, amount: 18500000, winRate: 72.3 },
    { name: '系统集成', value: 38, amount: 15200000, winRate: 65.8 },
    { name: '硬件采购', value: 32, amount: 8900000, winRate: 58.2 },
    { name: '咨询服务', value: 25, amount: 2100000, winRate: 78.5 },
    { name: '运维服务', value: 16, amount: 900000, winRate: 81.2 }
  ];

  const trendData = [
    { month: '1月', projects: 28, value: 12500000, winRate: 65.2 },
    { month: '2月', projects: 32, value: 15800000, winRate: 67.1 },
    { month: '3月', projects: 35, value: 18200000, winRate: 68.5 },
    { month: '4月', projects: 42, value: 21600000, winRate: 70.2 },
    { month: '5月', projects: 38, value: 19400000, winRate: 69.8 },
    { month: '6月', projects: 45, value: 25600000, winRate: 72.1 }
  ];

  const competitorData = [
    { name: '科技有限公司A', projects: 12, winRate: 58.3, avgBid: 1850000 },
    { name: '信息技术公司B', projects: 8, winRate: 62.5, avgBid: 2100000 },
    { name: '系统集成公司C', projects: 15, winRate: 46.7, avgBid: 1650000 },
    { name: '软件开发公司D', projects: 6, winRate: 66.7, avgBid: 2350000 },
    { name: '数据服务公司E', projects: 9, winRate: 55.6, avgBid: 1920000 }
  ];

  // 项目分布饼图配置
  const pieChartOption = {
    title: {
      text: '项目分类分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '项目数量',
        type: 'pie',
        radius: '50%',
        data: categoryData.map(item => ({
          value: item.value,
          name: item.name
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // 趋势图配置
  const lineChartOption = {
    title: {
      text: '项目趋势分析'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['项目数量', '项目价值', '中标率']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.map(item => item.month)
    },
    yAxis: [
      {
        type: 'value',
        name: '数量/价值',
        position: 'left'
      },
      {
        type: 'value',
        name: '中标率(%)',
        position: 'right',
        min: 0,
        max: 100
      }
    ],
    series: [
      {
        name: '项目数量',
        type: 'line',
        data: trendData.map(item => item.projects),
        smooth: true
      },
      {
        name: '项目价值',
        type: 'line',
        data: trendData.map(item => item.value / 1000000),
        smooth: true
      },
      {
        name: '中标率',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map(item => item.winRate),
        smooth: true
      }
    ]
  };

  // 柱状图配置
  const barChartOption = {
    title: {
      text: '各分类项目价值对比'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: categoryData.map(item => item.name)
    },
    series: [
      {
        name: '项目价值',
        type: 'bar',
        data: categoryData.map(item => item.amount / 10000),
        itemStyle: {
          color: '#1890ff'
        }
      }
    ]
  };

  // 竞争对手表格列
  const competitorColumns = [
    {
      title: '竞争对手',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '参与项目',
      dataIndex: 'projects',
      key: 'projects',
      render: (value: number) => `${value}个`,
    },
    {
      title: '中标率',
      dataIndex: 'winRate',
      key: 'winRate',
      render: (value: number) => (
        <span style={{ color: value > 60 ? '#52c41a' : value > 50 ? '#faad14' : '#ff4d4f' }}>
          {formatPercentage(value)}
        </span>
      ),
    },
    {
      title: '平均投标额',
      dataIndex: 'avgBid',
      key: 'avgBid',
      render: (value: number) => formatCurrency(value),
    },
  ];

  const handleRefresh = () => {
    // 刷新数据逻辑
    console.log('Refreshing analytics data...');
  };

  return (
    <MainLayout title="数据分析">
      {/* 筛选控件 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Space>
              <span>时间范围：</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                format="YYYY-MM-DD"
              />
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <span>项目分类：</span>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: 120 }}
              >
                <Option value="all">全部</Option>
                <Option value="软件开发">软件开发</Option>
                <Option value="系统集成">系统集成</Option>
                <Option value="硬件采购">硬件采购</Option>
                <Option value="咨询服务">咨询服务</Option>
                <Option value="运维服务">运维服务</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={10}>
            <div style={{ textAlign: 'right' }}>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新数据
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 总览 */}
        <TabPane tab="总览" key="overview">
          {/* 关键指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="项目总数"
                  value={overviewData.totalProjects}
                  prefix={<ProjectOutlined />}
                  suffix={
                    <span style={{ fontSize: 12, color: '#52c41a' }}>
                      <RiseOutlined /> {formatPercentage(overviewData.monthlyGrowth)}
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="项目总价值"
                  value={overviewData.totalValue}
                  formatter={(value) => formatCurrency(Number(value))}
                  prefix={<DollarOutlined />}
                  suffix={
                    <span style={{ fontSize: 12, color: '#52c41a' }}>
                      <RiseOutlined /> {formatPercentage(overviewData.valueGrowth)}
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="中标率"
                  value={overviewData.winRate}
                  precision={1}
                  suffix="%"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="平均项目价值"
                  value={overviewData.avgProjectValue}
                  formatter={(value) => formatCurrency(Number(value))}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 图表 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="项目分类分布">
                <ReactECharts option={pieChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="各分类详细数据">
                <div style={{ height: 400, overflowY: 'auto' }}>
                  {categoryData.map((item, index) => (
                    <div key={index} style={{ marginBottom: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                      <Row align="middle">
                        <Col span={8}>
                          <strong>{item.name}</strong>
                        </Col>
                        <Col span={16}>
                          <div style={{ marginBottom: 8 }}>
                            <span>项目数量: {item.value}个</span>
                            <Progress
                              percent={(item.value / Math.max(...categoryData.map(d => d.value))) * 100}
                              showInfo={false}
                              size="small"
                              style={{ marginLeft: 8 }}
                            />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <span>项目价值: {formatCurrency(item.amount)}</span>
                          </div>
                          <div>
                            <span>中标率: </span>
                            <Tag color={item.winRate > 70 ? 'green' : item.winRate > 60 ? 'orange' : 'red'}>
                              {formatPercentage(item.winRate)}
                            </Tag>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 趋势分析 */}
        <TabPane tab="趋势分析" key="trend">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="项目趋势分析">
                <ReactECharts option={lineChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="各分类价值对比">
                <ReactECharts option={barChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 竞争分析 */}
        <TabPane tab="竞争分析" key="competitor">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="主要竞争对手分析">
                <Table
                  columns={competitorColumns}
                  dataSource={competitorData}
                  rowKey="name"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 业绩报告 */}
        <TabPane tab="业绩报告" key="performance">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="本月新增项目"
                  value={overviewData.newProjects}
                  prefix={<ProjectOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="本月完成项目"
                  value={overviewData.completedProjects}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="完成率"
                  value={(overviewData.completedProjects / overviewData.newProjects * 100)}
                  precision={1}
                  suffix="%"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </MainLayout>
  );
}