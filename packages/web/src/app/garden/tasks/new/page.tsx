'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { gardenApi } from '@/lib/api/garden';
import type { CreateTaskInput } from '@/types/garden';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function NewTaskPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: plantsData } = useQuery({
    queryKey: ['plants'],
    queryFn: () => gardenApi.plants.getAll({ limit: 100 }),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: () => gardenApi.areas.getAll({ limit: 100 }),
  });

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    type: 'watering',
    priority: 'medium',
    weatherDependency: 'none',
    isRecurring: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => gardenApi.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    if (!formData.title.trim()) newErrors.title = 'Task title is required';
    if (formData.title.length < 3) newErrors.title = 'Title must be at least 3 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert date strings to ISO format
    const submitData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field: keyof CreateTaskInput, value: any) => {
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
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Garden Task</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a new garden maintenance task
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
                  Task Details
                </h2>
                <div className="space-y-4">
                  <Input
                    id="title"
                    label="Task Title"
                    required
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    error={errors.title}
                    placeholder="e.g., Water tomatoes, Prune roses"
                  />

                  <Textarea
                    id="description"
                    label="Description"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Add details about this task..."
                    rows={3}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      id="type"
                      label="Task Type"
                      required
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      options={[
                        { value: 'watering', label: 'Watering' },
                        { value: 'fertilizing', label: 'Fertilizing' },
                        { value: 'pruning', label: 'Pruning' },
                        { value: 'harvesting', label: 'Harvesting' },
                        { value: 'weeding', label: 'Weeding' },
                        { value: 'pest_control', label: 'Pest Control' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />

                    <Select
                      id="priority"
                      label="Priority"
                      required
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Scheduling
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="dueDate"
                    label="Due Date"
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                  />

                  <Input
                    id="scheduledDate"
                    label="Scheduled Date"
                    type="date"
                    value={formData.scheduledDate || ''}
                    onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  />

                  <Input
                    id="estimatedDurationMinutes"
                    label="Estimated Duration (minutes)"
                    type="number"
                    min="1"
                    value={formData.estimatedDurationMinutes || ''}
                    onChange={(e) => handleChange('estimatedDurationMinutes', parseInt(e.target.value))}
                    placeholder="Optional"
                  />

                  <Select
                    id="weatherDependency"
                    label="Weather Dependency"
                    value={formData.weatherDependency || 'none'}
                    onChange={(e) => handleChange('weatherDependency', e.target.value)}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'dry_weather', label: 'Dry Weather' },
                      { value: 'wet_weather', label: 'Wet Weather' },
                      { value: 'mild_temperature', label: 'Mild Temperature' },
                    ]}
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring || false}
                      onChange={(e) => handleChange('isRecurring', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recurring Task
                    </span>
                  </label>

                  {formData.isRecurring && (
                    <div className="mt-3">
                      <Input
                        id="recurrenceIntervalDays"
                        label="Recurrence Interval (days)"
                        type="number"
                        min="1"
                        required={formData.isRecurring}
                        value={formData.recurrenceIntervalDays || ''}
                        onChange={(e) => handleChange('recurrenceIntervalDays', parseInt(e.target.value))}
                        placeholder="e.g., 7 for weekly"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Associations */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Associations
                </h2>
                <div className="space-y-4">
                  {areasData && areasData.data.length > 0 && (
                    <Select
                      id="areaId"
                      label="Garden Area"
                      value={formData.areaId || ''}
                      onChange={(e) => handleChange('areaId', e.target.value || undefined)}
                      options={[
                        { value: '', label: '-- None --' },
                        ...areasData.data.map((area) => ({
                          value: area.id,
                          label: area.name,
                        })),
                      ]}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tools Required
                    </label>
                    <Input
                      id="tools"
                      placeholder="e.g., Watering can, Pruning shears (comma-separated)"
                      value={formData.tools?.join(', ') || ''}
                      onChange={(e) =>
                        handleChange(
                          'tools',
                          e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Materials Needed
                    </label>
                    <Input
                      id="materials"
                      placeholder="e.g., Fertilizer, Mulch (comma-separated)"
                      value={formData.materials?.join(', ') || ''}
                      onChange={(e) =>
                        handleChange(
                          'materials',
                          e.target.value.split(',').map((m) => m.trim()).filter(Boolean)
                        )
                      }
                    />
                  </div>

                  <Input
                    id="cost"
                    label="Estimated Cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost || ''}
                    onChange={(e) => handleChange('cost', parseFloat(e.target.value))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  Create Task
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
