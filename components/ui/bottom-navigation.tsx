'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Camera, Box, BarChart3, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Record',
    href: '/camera',
    icon: Camera,
  },
  {
    name: '3D Space',
    href: '/space',
    icon: Box,
  },
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Account',
    href: '/account',
    icon: User,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 transition-colors',
                isActive 
                  ? 'text-blue-400 bg-gray-800' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}