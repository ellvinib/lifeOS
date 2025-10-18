export type PlantType = 'vegetable' | 'fruit' | 'herb' | 'flower' | 'tree' | 'shrub' | 'other';
export type GrowthStage = 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'mature' | 'dormant';
export type SunExposure = 'full_sun' | 'partial_sun' | 'partial_shade' | 'full_shade';
export type WateringFrequency = 'daily' | 'every_2_days' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed';
export type TaskType = 'watering' | 'fertilizing' | 'pruning' | 'harvesting' | 'weeding' | 'pest_control' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type WeatherDependency = 'none' | 'dry_weather' | 'wet_weather' | 'mild_temperature';
export type AreaType = 'lawn' | 'flower_bed' | 'vegetable_patch' | 'herb_garden' | 'hedge' | 'tree_area' | 'patio' | 'pathway' | 'pond' | 'greenhouse' | 'compost' | 'other';

export interface Plant {
  id: string;
  name: string;
  scientificName?: string;
  type: PlantType;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate: string;
  growthStage: GrowthStage;
  sunExposure: SunExposure;
  wateringFrequency: WateringFrequency;
  lastWatered?: string;
  lastFertilized?: string;
  lastPruned?: string;
  notes?: string;
  imageUrl?: string;
  isActive: boolean;
  harvestDate?: string;
  expectedHarvestDate?: string;
  metadata?: Record<string, unknown>;
  age?: number;
  needsWatering?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GardenArea {
  id: string;
  name: string;
  type: AreaType;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  lastMaintained?: string;
  maintenanceFrequencyDays: number;
  isActive: boolean;
  notes?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  needsMaintenance?: boolean;
  daysUntilNextMaintenance?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GardenTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  areaId?: string;
  plantIds: string[];
  weatherDependency: WeatherDependency;
  idealSeasons: string[];
  dueDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  tools: string[];
  materials: string[];
  cost?: number;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePlantInput {
  name: string;
  scientificName?: string;
  type: PlantType;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate: string;
  growthStage: GrowthStage;
  sunExposure: SunExposure;
  wateringFrequency: WateringFrequency;
  notes?: string;
  expectedHarvestDate?: string;
}

export interface CreateGardenAreaInput {
  name: string;
  type: AreaType;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  maintenanceFrequencyDays: number;
  notes?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  areaId?: string;
  plantIds?: string[];
  weatherDependency?: WeatherDependency;
  idealSeasons?: string[];
  dueDate?: string;
  scheduledDate?: string;
  estimatedDurationMinutes?: number;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  tags?: string[];
}
