'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'VENDEDOR':
          router.push('/pos');
          break;
        case 'COCINA':
          router.push('/cocina');
          break;
        default:
          router.push('/login');
      }
    } else {
      const token = localStorage.getItem('token');
      if (!token) router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
    </div>
  );
}
