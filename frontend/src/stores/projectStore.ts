import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TenderProject, ProjectFilters } from '@/types';

interface ProjectStore {
  // State
  projects: TenderProject[];
  selectedProject: TenderProject | null;
  filters: ProjectFilters;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: TenderProject[]) => void;
  addProject: (project: TenderProject) => void;
  updateProject: (id: string, updates: Partial<TenderProject>) => void;
  selectProject: (project: TenderProject | null) => void;
  updateFilters: (filters: Partial<ProjectFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  filteredProjects: () => TenderProject[];
}

const initialFilters: ProjectFilters = {
  keyword: '',
  budgetRange: undefined,
  projectType: undefined,
  area: undefined,
  status: undefined,
  dateRange: undefined,
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: [],
        selectedProject: null,
        filters: initialFilters,
        loading: false,
        error: null,

        // Actions
        setProjects: (projects) => set({ projects }),
        
        addProject: (project) => set((state) => ({
          projects: [project, ...state.projects]
        })),
        
        updateProject: (id, updates) => set((state) => ({
          projects: state.projects.map(project =>
            project.id === id ? { ...project, ...updates } : project
          )
        })),
        
        selectProject: (project) => set({ selectedProject: project }),
        
        updateFilters: (newFilters) => set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),
        
        clearFilters: () => set({ filters: initialFilters }),
        
        setLoading: (loading) => set({ loading }),
        
        setError: (error) => set({ error }),

        // Computed
        filteredProjects: () => {
          const { projects, filters } = get();
          
          return projects.filter(project => {
            // 关键词筛选
            if (filters.keyword) {
              const keyword = filters.keyword.toLowerCase();
              if (!project.title.toLowerCase().includes(keyword) &&
                  !project.content.toLowerCase().includes(keyword) &&
                  !project.purchaser.toLowerCase().includes(keyword)) {
                return false;
              }
            }
            
            // 预算范围筛选
            if (filters.budgetRange) {
              const [min, max] = filters.budgetRange;
              if (project.budget < min || project.budget > max) {
                return false;
              }
            }
            
            // 项目类型筛选
            if (filters.projectType && project.projectType !== filters.projectType) {
              return false;
            }
            
            // 地区筛选
            if (filters.area && project.area !== filters.area) {
              return false;
            }
            
            // 状态筛选
            if (filters.status && project.status !== filters.status) {
              return false;
            }
            
            // 日期范围筛选
            if (filters.dateRange) {
              const [startDate, endDate] = filters.dateRange;
              const projectDate = new Date(project.publishTime);
              if (projectDate < new Date(startDate) || projectDate > new Date(endDate)) {
                return false;
              }
            }
            
            return true;
          });
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedProject: state.selectedProject,
        }),
      }
    ),
    {
      name: 'project-store',
    }
  )
);