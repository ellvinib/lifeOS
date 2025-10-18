'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gardenApi } from '@/lib/api/garden';
import type { GardenTask } from '@/types/garden';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import clsx from 'clsx';

interface TaskListProps {
  tasks: GardenTask[];
  isLoading: boolean;
}

export function TaskList({ tasks, isLoading }: TaskListProps) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => gardenApi.tasks.complete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-white dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Pending Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Pending ({pendingTasks.length})
        </h3>
        <div className="space-y-2">
          {pendingTasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">All caught up!</p>
            </div>
          ) : (
            pendingTasks.map((task) => {
              const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
              return (
                <div
                  key={task.id}
                  className={clsx(
                    'bg-white dark:bg-gray-800 rounded-lg p-4 border transition-colors',
                    isOverdue
                      ? 'border-red-200 dark:border-red-800'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={completeMutation.isPending}
                      className="mt-0.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            task.priority === 'urgent'
                              ? 'text-red-600 dark:text-red-400'
                              : task.priority === 'high'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {task.priority === 'urgent' && <AlertCircle className="w-3 h-3" />}
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 text-xs',
                              isOverdue
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400'
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 opacity-60"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm line-through">
                      {task.title}
                    </h4>
                    {task.completedDate && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Completed {format(new Date(task.completedDate), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
