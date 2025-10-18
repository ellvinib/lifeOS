'use client';

import Link from 'next/link';
import { Leaf, Home, Calendar, DollarSign, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const modules = [
    {
      name: 'Garden',
      description: 'Manage plants, tasks, and garden areas',
      icon: Leaf,
      href: '/garden',
      color: 'bg-green-500',
      available: true,
    },
    {
      name: 'House Maintenance',
      description: 'Track home systems and maintenance schedules',
      icon: Home,
      href: '/house',
      color: 'bg-blue-500',
      available: false,
    },
    {
      name: 'Calendar',
      description: 'Unified calendar across all modules',
      icon: Calendar,
      href: '/calendar',
      color: 'bg-purple-500',
      available: false,
    },
    {
      name: 'Finance',
      description: 'Budget tracking and financial goals',
      icon: DollarSign,
      href: '/finance',
      color: 'bg-amber-500',
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            LifeOS
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your comprehensive life management system
          </p>

          {/* Authentication Buttons */}
          {!isLoading && (
            <div className="mt-8 flex items-center justify-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <p className="text-gray-700 dark:text-gray-300">
                    Welcome back, <span className="font-semibold">{user?.name}</span>!
                  </p>
                </div>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Show modules only when authenticated */}
        {isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.name}
                  href={module.available ? module.href : '#'}
                  className={`
                    group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800
                    p-8 shadow-lg transition-all duration-300
                    ${
                      module.available
                        ? 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 ${module.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`}
                  />

                  <div className="relative z-10">
                    <div
                      className={`${module.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                      {module.name}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {module.description}
                    </p>

                    {!module.available && (
                      <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                        Coming Soon
                      </span>
                    )}

                    {module.available && (
                      <span className="inline-block px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-full">
                        Available
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-2xl">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                Welcome to LifeOS
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                A comprehensive life management system with modular architecture for managing your garden, finances, home maintenance, and more.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Sign in or create an account to access all features and start organizing your life.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl text-lg"
                >
                  <LogIn className="w-6 h-6" />
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl text-lg"
                >
                  <UserPlus className="w-6 h-6" />
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with Clean Architecture • Event-Driven • Modular
          </p>
        </div>
      </div>
    </div>
  );
}
