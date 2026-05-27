'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import LandingPage from './landing/page';

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
    }
  }, [user, router]);

  // Si no hay usuario logueado, mostrar landing page
  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
    </div>
  );
}
