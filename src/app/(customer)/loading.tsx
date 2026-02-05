// src/app/(customer)/loading.tsx
export default function CustomerLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-primary-500"></div>
        </div>
        <p className="text-sm text-neutral-600 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}