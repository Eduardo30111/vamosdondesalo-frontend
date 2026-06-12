import { Suspense } from 'react';
import SeguirPedidoClient from './SeguirPedidoClient';

export const dynamic = 'force-dynamic';

export default function SeguirPedidoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
        </div>
      }
    >
      <SeguirPedidoClient />
    </Suspense>
  );
}
