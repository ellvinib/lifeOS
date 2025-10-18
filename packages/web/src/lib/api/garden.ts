import { apiClient } from './client';
import type {
  Plant,
  GardenArea,
  GardenTask,
  PaginatedResponse,
  CreatePlantInput,
  CreateGardenAreaInput,
  CreateTaskInput,
} from '@/types/garden';

// Plants API
export const gardenApi = {
  // Plants
  plants: {
    getAll: async (params?: { page?: number; limit?: number; needsWatering?: boolean }) => {
      const { data } = await apiClient.get<PaginatedResponse<Plant>>('/garden/plants', { params });
      return data;
    },

    getById: async (id: string) => {
      const { data } = await apiClient.get<Plant>(`/garden/plants/${id}`);
      return data;
    },

    create: async (input: CreatePlantInput) => {
      const { data } = await apiClient.post<Plant>('/garden/plants', input);
      return data;
    },

    update: async (id: string, input: Partial<CreatePlantInput>) => {
      const { data } = await apiClient.put<Plant>(`/garden/plants/${id}`, input);
      return data;
    },

    delete: async (id: string) => {
      await apiClient.delete(`/garden/plants/${id}`);
    },

    // Plant actions
    water: async (id: string) => {
      const { data } = await apiClient.post<Plant>(`/garden/plants/${id}/water`, {});
      return data;
    },

    fertilize: async (id: string) => {
      const { data } = await apiClient.post<Plant>(`/garden/plants/${id}/fertilize`, {});
      return data;
    },

    prune: async (id: string) => {
      const { data } = await apiClient.post<Plant>(`/garden/plants/${id}/prune`, {});
      return data;
    },

    harvest: async (id: string, harvestDate: string) => {
      const { data } = await apiClient.post<Plant>(`/garden/plants/${id}/harvest`, { harvestDate });
      return data;
    },
  },

  // Garden Areas
  areas: {
    getAll: async (params?: { page?: number; limit?: number; needsMaintenance?: boolean }) => {
      const { data } = await apiClient.get<PaginatedResponse<GardenArea>>('/garden/areas', { params });
      return data;
    },

    getById: async (id: string) => {
      const { data } = await apiClient.get<GardenArea>(`/garden/areas/${id}`);
      return data;
    },

    create: async (input: CreateGardenAreaInput) => {
      const { data } = await apiClient.post<GardenArea>('/garden/areas', input);
      return data;
    },

    update: async (id: string, input: Partial<CreateGardenAreaInput>) => {
      const { data } = await apiClient.put<GardenArea>(`/garden/areas/${id}`, input);
      return data;
    },

    delete: async (id: string) => {
      await apiClient.delete(`/garden/areas/${id}`);
    },

    // Area actions
    maintenance: async (id: string) => {
      const { data } = await apiClient.post<GardenArea>(`/garden/areas/${id}/maintenance`, {});
      return data;
    },
  },

  // Garden Tasks
  tasks: {
    getAll: async (params?: { page?: number; limit?: number; status?: string; priority?: string }) => {
      const { data } = await apiClient.get<PaginatedResponse<GardenTask>>('/garden/tasks', { params });
      return data;
    },

    getById: async (id: string) => {
      const { data } = await apiClient.get<GardenTask>(`/garden/tasks/${id}`);
      return data;
    },

    create: async (input: CreateTaskInput) => {
      const { data } = await apiClient.post<GardenTask>('/garden/tasks', input);
      return data;
    },

    update: async (id: string, input: Partial<CreateTaskInput>) => {
      const { data } = await apiClient.put<GardenTask>(`/garden/tasks/${id}`, input);
      return data;
    },

    delete: async (id: string) => {
      await apiClient.delete(`/garden/tasks/${id}`);
    },

    // Task actions
    complete: async (id: string) => {
      const { data } = await apiClient.post<GardenTask>(`/garden/tasks/${id}/complete`, {});
      return data;
    },
  },
};
