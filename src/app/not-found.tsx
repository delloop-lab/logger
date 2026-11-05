import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#121417] text-gray-100 flex items-center justify-center p-6">
      <div className="bg-[#1e2228] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Page not found</h1>
        <p className="text-xs text-gray-400">
          That workshop page doesn&apos;t exist. Return to the main dashboard.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white"
        >
          Back to Logger
        </Link>
      </div>
    </div>
  );
}
