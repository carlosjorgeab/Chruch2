import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">404 - Página Não Encontrada</h1>
        <Link href="/" className="inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-xl">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
