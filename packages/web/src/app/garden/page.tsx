'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gardenApi } from '@/lib/api/garden';
import { PlantCard } from '@/components/garden/PlantCard';
import { TaskList } from '@/components/garden/TaskList';
import { GardenStats } from '@/components/garden/GardenStats';
import { Leaf, Plus, MapPin, CheckSquare, Search } from 'lucide-react';
import Link from 'next/link';

export default function GardenPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNeedsWater, setFilterNeedsWater] = useState(false);

  const { data: plantsData, isLoading: plantsLoading } = useQuery({
    queryKey: ['plants'],
    queryFn: () => gardenApi.plants.getAll({ limit: 50 }),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => gardenApi.tasks.getAll({ limit: 20 }),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: () => gardenApi.areas.getAll({ limit: 20 }),
  });

  const filteredPlants = useMemo(() => {
    if (!plantsData?.data) return [];

    let filtered = plantsData.data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plant =>
        plant.name.toLowerCase().includes(query) ||
        plant.variety?.toLowerCase().includes(query) ||
        plant.location.toLowerCase().includes(query)
      );
    }

    if (filterNeedsWater) {
      filtered = filtered.filter(plant => plant.needsWatering);
    }

    return filtered;
  }, [plantsData?.data, searchQuery, filterNeedsWater]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <span className="text-sm">← Back</span>
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Garden</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your plants and garden tasks
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/garden/plants/new"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Plant</span>
              </Link>
              <Link
                href="/garden/areas/new"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                <span className="hidden sm:inline">Add Area</span>
              </Link>
              <Link
                href="/garden/tasks/new"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <CheckSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <GardenStats
          totalPlants={plantsData?.data.length || 0}
          plantsNeedingWater={plantsData?.data.filter((p) => p.needsWatering).length || 0}
          pendingTasks={tasksData?.data.filter((t) => t.status === 'pending').length || 0}
          totalAreas={areasData?.data.length || 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Plants Section */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Plants</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterNeedsWater(false)}
                    className={`px-3 py-1 text-sm border rounded-lg transition-colors ${
                      !filterNeedsWater
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterNeedsWater(true)}
                    className={`px-3 py-1 text-sm border rounded-lg transition-colors ${
                      filterNeedsWater
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Needs Water
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search plants by name, variety, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {plantsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-white dark:bg-gray-800 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPlants.length === 0 && searchQuery ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No plants found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search or filters
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterNeedsWater(false);
                  }}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : plantsData?.data.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                <Leaf className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No plants yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start your garden by adding your first plant
                </p>
                <Link
                  href="/garden/plants/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Plant
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPlants.map((plant) => (
                  <PlantCard key={plant.id} plant={plant} />
                ))}
              </div>
            )}
          </div>

          {/* Tasks Sidebar */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tasks</h2>
            <TaskList tasks={tasksData?.data || []} isLoading={tasksLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
