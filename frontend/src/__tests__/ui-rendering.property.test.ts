/**
 * Property-based tests for UI rendering completeness
 * Feature: tender-ui-dashboard, Property 1: 界面元素渲染完整性
 * Validates: Requirements 1.2, 2.1, 3.1, 4.1
 */

import fc from 'fast-check';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import React from 'react';
import HomePage from '@/app/page';

// Mock the hooks to avoid API calls during testing
jest.mock('@/hooks/useProjects', () => ({
  useSystemStatus: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  useStatistics: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(ConfigProvider, null, children)
    )
  );

  return TestWrapper;
};

describe('UI Rendering Property Tests', () => {
  test('Property 1: 界面元素渲染完整性 - For any page data, rendered interface should contain all required UI elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          todayNewProjects: fc.integer({ min: 0, max: 1000 }),
          totalProjects: fc.integer({ min: 0, max: 10000 }),
          systemHealth: fc.constantFrom('healthy', 'warning', 'error'),
          crawlerStatus: fc.constantFrom('running', 'stopped', 'error'),
        }),
        (mockData) => {
          // Mock the hooks with generated data
          jest.doMock('@/hooks/useProjects', () => ({
            useSystemStatus: () => ({
              data: { data: mockData },
              isLoading: false,
              error: null,
            }),
            useStatistics: () => ({
              data: { data: mockData },
              isLoading: false,
              error: null,
            }),
          }));

          const Wrapper = createTestWrapper();
          const { container } = render(React.createElement(HomePage), { wrapper: Wrapper });

          // Verify essential UI elements are present
          const requiredSelectors = [
            '.ant-card', // Cards should be present
            '.ant-statistic', // Statistics should be present
            '.ant-layout', // Layout should be present
          ];

          requiredSelectors.forEach(selector => {
            const elements = container.querySelectorAll(selector);
            expect(elements.length).toBeGreaterThan(0);
          });

          // Verify the page has proper structure
          expect(container.querySelector('.ant-layout')).toBeTruthy();
          expect(container.querySelector('.ant-card')).toBeTruthy();
        }
      ),
      { numRuns: 10 } // Reduced for faster testing
    );
  });
});