'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { gardenApi } from '@/lib/api/garden';
import type { CreatePlantInput } from '@/types/garden';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Leaf } from 'lucide-react';
import Link from 'next/link';

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const plantId = params.id as string;
  const queryClient = useQueryClient();

  const { data: plant, isLoading } = useQuery({
    queryKey: ['plants', plantId],
    queryFn: () => gardenApi.plants.getById(plantId),
  });

  const [formData, setFormData] = useState<CreatePlantInput>({
    name: '',
    type: 'vegetable',
    variety: '',
    location: '',
    plantedDate: new Date().toISOString().split('T')[0],
    growthStage: 'seedling',
    sunExposure: 'full_sun',
    wateringFrequency: 'daily',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plant) {
      setFormData({
        name: plant.name,
        scientificName: plant.scientificName,
        type: plant.type,
        variety: plant.variety,
        location: plant.location,
        plantedDate: plant.plantedDate.split('T')[0],
        growthStage: plant.growthStage,
        sunExposure: plant.sunExposure,
        wateringFrequency: plant.wateringFrequency,
        notes: plant.notes,
        expectedHarvestDate: plant.expectedHarvestDate?.split('T')[0],
      });
    }
  }, [plant]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreatePlantInput>) => gardenApi.plants.update(plantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
      router.push('/garden');
    },
    onError: (error: any) => {
      const apiErrors = error.response?.data?.error?.details || [];
      const newErrors: Record<string, string> = {};
      apiErrors.forEach((err: any) => {
        if (err.field) {
          newErrors[err.field] = err.message;
        }
      });
      setErrors(newErrors);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Plant name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateMutation.mutate({
      ...formData,
      plantedDate: new Date(formData.plantedDate).toISOString(),
      expectedHarvestDate: formData.expectedHarvestDate
        ? new Date(formData.expectedHarvestDate).toISOString()
        : undefined,
    });
  };

  const handleChange = (field: keyof CreatePlantInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading plant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/garden"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Garden</span>
            </Link>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Plant</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Update {plant?.name || 'plant'} details
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form - Same as create but with update mutation */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="name"
                    label="Plant Name"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={errors.name}
                  />
                  <Input
                    id="scientificName"
                    label="Scientific Name"
                    value={formData.scientificName || ''}
                    onChange={(e) => handleChange('scientificName', e.target.value)}
                  />
                  <Select
                    id="type"
                    label="Plant Type"
                    required
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    options={[
                      { value: 'vegetable', label: 'Vegetable' },
                      { value: 'fruit', label: 'Fruit' },
                      { value: 'herb', label: 'Herb' },
                      { value: 'flower', label: 'Flower' },
                      { value: 'tree', label: 'Tree' },
                      { value: 'shrub', label: 'Shrub' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                  <Input
                    id="variety"
                    label="Variety"
                    value={formData.variety || ''}
                    onChange={(e) => handleChange('variety', e.target.value)}
                  />
                </div>
              </div>

              {/* Location & Planting */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Location & Planting
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="location"
                    label="Location"
                    required
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    error={errors.location}
                  />
                  <Input
                    id="plantedDate"
                    label="Planted Date"
                    type="date"
                    required
                    value={formData.plantedDate}
                    onChange={(e) => handleChange('plantedDate', e.target.value)}
                  />
                  <Select
                    id="growthStage"
                    label="Growth Stage"
                    required
                    value={formData.growthStage}
                    onChange={(e) => handleChange('growthStage', e.target.value)}
                    options={[
                      { value: 'seed', label: 'Seed' },
                      { value: 'seedling', label: 'Seedling' },
                      { value: 'vegetative', label: 'Vegetative' },
                      { value: 'flowering', label: 'Flowering' },
                      { value: 'fruiting', label: 'Fruiting' },
                      { value: 'mature', label: 'Mature' },
                      { value: 'dormant', label: 'Dormant' },
                    ]}
                  />
                  <Input
                    id="expectedHarvestDate"
                    label="Expected Harvest Date"
                    type="date"
                    value={formData.expectedHarvestDate || ''}
                    onChange={(e) => handleChange('expectedHarvestDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Care Requirements */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Care Requirements
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    id="sunExposure"
                    label="Sun Exposure"
                    required
                    value={formData.sunExposure}
                    onChange={(e) => handleChange('sunExposure', e.target.value)}
                    options={[
                      { value: 'full_sun', label: 'Full Sun (6+ hours)' },
                      { value: 'partial_sun', label: 'Partial Sun (4-6 hours)' },
                      { value: 'partial_shade', label: 'Partial Shade (2-4 hours)' },
                      { value: 'full_shade', label: 'Full Shade (< 2 hours)' },
                    ]}
                  />
                  <Select
                    id="wateringFrequency"
                    label="Watering Frequency"
                    required
                    value={formData.wateringFrequency}
                    onChange={(e) => handleChange('wateringFrequency', e.target.value)}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'every_2_days', label: 'Every 2 Days' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'bi_weekly', label: 'Bi-Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'as_needed', label: 'As Needed' },
                    ]}
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <Textarea
                  id="notes"
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateMutation.isPending}
                  disabled={updateMutation.isPending}
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/garden')}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
