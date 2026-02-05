// src/app/admin/loading.tsx
export default function AdminLoading() {
  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-neutral-200 border-t-primary-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-primary-500/20 animate-pulse"></div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-800">Loading Admin Panel</p>
          <p className="text-xs text-neutral-500 mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
}