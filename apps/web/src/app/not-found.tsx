import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-salo-cream to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-salo-orange mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Página no encontrada
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          La página que buscas no existe o fue movida. Vuelve al inicio para continuar.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 bg-salo-orange text-white rounded-xl font-medium hover:bg-primary-700 transition"
        >
          <Home size={18} />
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
