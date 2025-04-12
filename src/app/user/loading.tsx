export default function UserLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600 mx-auto"></div>
        <h2 className="mt-6 text-xl font-semibold text-gray-800">Memuat Halaman User</h2>
        <p className="mt-2 text-gray-600">Mohon tunggu sebentar...</p>
      </div>
    </div>
  );
} 