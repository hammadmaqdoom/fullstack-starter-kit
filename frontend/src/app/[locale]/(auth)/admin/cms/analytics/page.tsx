'use client';

import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface AnalyticsConfig {
  id: string;
  platform: string;
  name: string;
  trackingId: string;
  isActive: boolean;
  environment: string;
}

interface SiteVerification {
  id: string;
  platform: string;
  verificationCode: string;
  isVerified: boolean;
}

export default function AnalyticsPage() {
  const [configs, setConfigs] = useState<AnalyticsConfig[]>([]);
  const [verifications, setVerifications] = useState<SiteVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND_URL}/api/v1/analytics/configs`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/v1/analytics/verification`).then(r => r.json()),
    ])
      .then(([configsData, verificationsData]) => {
        setConfigs(configsData || []);
        setVerifications(verificationsData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Configuration</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Analytics Config
        </button>
      </div>

      {/* Analytics Configs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Analytics Platforms</h3>
        <div className="space-y-4">
          {configs.map(config => (
            <div key={config.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{config.name}</h4>
                  <p className="text-sm text-gray-600">Platform: {config.platform}</p>
                  <p className="text-sm text-gray-600">ID: {config.trackingId}</p>
                  <p className="text-sm text-gray-600">Environment: {config.environment}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      config.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Site Verifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Site Verifications</h3>
        <div className="space-y-4">
          {verifications.map(verification => (
            <div key={verification.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{verification.platform}</h4>
                  <p className="text-sm text-gray-600">
                    Code: {verification.verificationCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      verification.isVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {verification.isVerified ? 'Verified' : 'Pending'}
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

