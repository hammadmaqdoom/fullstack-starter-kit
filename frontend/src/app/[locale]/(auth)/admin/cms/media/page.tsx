'use client';

import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Media {
  id: string;
  filename: string;
  url: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
}

export default function MediaPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/media`)
      .then(res => res.json())
      .then(data => {
        setMedia(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Upload Media
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {media.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4">
            {item.mimeType?.startsWith('image/') ? (
              <img
                src={item.url}
                alt={item.filename}
                className="w-full h-32 object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center">
                <span className="text-gray-400 text-sm">File</span>
              </div>
            )}
            <p className="text-xs text-gray-600 truncate">{item.filename}</p>
            <div className="mt-2 flex gap-2">
              <button className="text-blue-600 hover:text-blue-900 text-xs">Edit</button>
              <button className="text-red-600 hover:text-red-900 text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

