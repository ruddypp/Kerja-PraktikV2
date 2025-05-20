export default function ManagerLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
        <h2 className="mt-6 text-xl font-semibold text-gray-800">Loading ManagerPage</h2>
        <p className="mt-2 text-gray-600">Please wait a moment...</p>
      </div>
    </div>
  );
} 