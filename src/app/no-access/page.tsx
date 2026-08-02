'use client';

export default function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">No Access Granted Yet</h1>
        <p className="text-sm text-gray-500">
          Your account doesn&apos;t have any permissions assigned yet. Please contact your school admin.
        </p>
      </div>
    </div>
  );
}
