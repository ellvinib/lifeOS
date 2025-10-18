'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { gardenApi } from '@/lib/api/garden';
import type { CreateGardenAreaInput } from '@/types/garden';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function NewAreaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateGardenAreaInput>({
    name: '',
    type: 'vegetable_patch',
    description: '',
    location: '',
    maintenanceFrequencyDays: 7,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateGardenAreaInput) => gardenApi.areas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
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

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Area name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.maintenanceFrequencyDays < 1) {
      newErrors.maintenanceFrequencyDays = 'Maintenance frequency must be at least 1 day';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field: keyof CreateGardenAreaInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Garden Area</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Define a new area in your garden
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
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
                    label="Area Name"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={errors.name}
                    placeholder="e.g., Vegetable Garden, Herb Patch"
                  />

                  <Select
                    id="type"
                    label="Area Type"
                    required
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    options={[
                      { value: 'lawn', label: 'Lawn' },
                      { value: 'flower_bed', label: 'Flower Bed' },
                      { value: 'vegetable_patch', label: 'Vegetable Patch' },
                      { value: 'herb_garden', label: 'Herb Garden' },
                      { value: 'hedge', label: 'Hedge' },
                      { value: 'tree_area', label: 'Tree Area' },
                      { value: 'patio', label: 'Patio' },
                      { value: 'pathway', label: 'Pathway' },
                      { value: 'pond', label: 'Pond' },
                      { value: 'greenhouse', label: 'Greenhouse' },
                      { value: 'compost', label: 'Compost' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />

                  <Input
                    id="location"
                    label="Location"
                    required
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    error={errors.location}
                    placeholder="e.g., Backyard, Front Yard"
                  />

                  <Input
                    id="sizeSquareMeters"
                    label="Size (m²)"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.sizeSquareMeters || ''}
                    onChange={(e) => handleChange('sizeSquareMeters', parseFloat(e.target.value))}
                    placeholder="Optional"
                  />
                </div>

                <div className="mt-4">
                  <Textarea
                    id="description"
                    label="Description"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe this garden area..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Garden Details */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Garden Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="soilType"
                    label="Soil Type"
                    value={formData.soilType || ''}
                    onChange={(e) => handleChange('soilType', e.target.value)}
                    placeholder="e.g., Clay, Sandy, Loamy"
                  />

                  <Input
                    id="sunExposureHours"
                    label="Sun Exposure (hours/day)"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.sunExposureHours || ''}
                    onChange={(e) => handleChange('sunExposureHours', parseFloat(e.target.value))}
                    placeholder="Optional"
                  />

                  <Input
                    id="irrigationSystem"
                    label="Irrigation System"
                    value={formData.irrigationSystem || ''}
                    onChange={(e) => handleChange('irrigationSystem', e.target.value)}
                    placeholder="e.g., Drip, Sprinkler, Manual"
                  />

                  <Input
                    id="maintenanceFrequencyDays"
                    label="Maintenance Frequency (days)"
                    type="number"
                    min="1"
                    required
                    value={formData.maintenanceFrequencyDays}
                    onChange={(e) => handleChange('maintenanceFrequencyDays', parseInt(e.target.value))}
                    error={errors.maintenanceFrequencyDays}
                    helperText="How often this area needs maintenance"
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
                  placeholder="Add any additional notes about this area..."
                  rows={4}
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  Add Garden Area
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/garden')}
                  disabled={createMutation.isPending}
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
