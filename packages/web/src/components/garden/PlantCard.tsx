'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { gardenApi } from '@/lib/api/garden';
import type { Plant } from '@/types/garden';
import { Droplets, Sprout, Scissors, Pencil, Trash2, Calendar, MapPin, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ConfirmModal } from '@/components/ui/Modal';
import clsx from 'clsx';

interface PlantCardProps {
  plant: Plant;
}

export function PlantCard({ plant }: PlantCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const waterMutation = useMutation({
    mutationFn: () => gardenApi.plants.water(plant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  const fertilizeMutation = useMutation({
    mutationFn: () => gardenApi.plants.fertilize(plant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  const pruneMutation = useMutation({
    mutationFn: () => gardenApi.plants.prune(plant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => gardenApi.plants.delete(plant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      setShowDeleteModal(false);
    },
  });

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow relative group">
        {/* Menu Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
                <button
                  onClick={() => {
                    router.push(`/garden/plants/${plant.id}/edit`);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-t-lg"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Plant
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Plant
                </button>
              </div>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pr-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {plant.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {plant.variety} • {plant.type}
            </p>
          </div>
          <div
            className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium',
              plant.growthStage === 'mature'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : plant.growthStage === 'flowering'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            )}
          >
            {plant.growthStage}
          </div>
        </div>

      {/* Plant Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>{plant.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>Planted {formatDistanceToNow(new Date(plant.plantedDate), { addSuffix: true })}</span>
        </div>
        {plant.lastWatered && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Droplets className="w-4 h-4" />
            <span>Watered {formatDistanceToNow(new Date(plant.lastWatered), { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* Needs Attention Badge */}
      {plant.needsWatering && (
        <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            💧 Needs watering
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => waterMutation.mutate()}
          disabled={waterMutation.isPending}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Water plant"
        >
          <Droplets className="w-4 h-4" />
          <span className="text-xs font-medium">Water</span>
        </button>

        <button
          onClick={() => fertilizeMutation.mutate()}
          disabled={fertilizeMutation.isPending}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Fertilize plant"
        >
          <Sprout className="w-4 h-4" />
          <span className="text-xs font-medium">Feed</span>
        </button>

        <button
          onClick={() => pruneMutation.mutate()}
          disabled={pruneMutation.isPending}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Prune plant"
        >
          <Scissors className="w-4 h-4" />
          <span className="text-xs font-medium">Prune</span>
        </button>
      </div>
    </div>

    <ConfirmModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={() => deleteMutation.mutate()}
      title="Delete Plant"
      message={`Are you sure you want to delete "${plant.name}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={deleteMutation.isPending}
    />
  </>
  );
}
