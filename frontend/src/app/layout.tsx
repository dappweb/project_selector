'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { queryClient } from '@/lib/queryClient';
import "./globals.css";

// Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    colorBgContainer: '#ffffff',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <title>招投标智能分析系统</title>
        <meta name="description" content="智能招投标项目分析和管理系统" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider
            locale={zhCN}
            theme={theme}
          >
            <App>
              {children}
            </App>
          </ConfigProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
