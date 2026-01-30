import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../config';

function UpdateLogDisplay() {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/updates/all`);
        if (res.ok) {
          const data = await res.json();
          setUpdates(data);
        } else {
          const errorData = await res.json();
          setError(errorData.error || 'Failed to fetch updates');
        }
      } catch (err) {
        console.error('Error fetching updates:', err);
        setError('Network error: Could not fetch updates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed top-1/2 left-4 transform -translate-y-1/2 w-80 p-4 bg-gray-800 rounded-lg shadow-lg z-40 text-white">
        Loading updates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-1/2 left-4 transform -translate-y-1/2 w-80 p-4 bg-red-800 rounded-lg shadow-lg z-40 text-white">
        Error: {error}
      </div>
    );
  }

  if (updates.length === 0) {
    return null; // Don't show if no updates
  }

  return (
    <div className="fixed top-1/2 left-4 transform -translate-y-1/2 w-80 max-h-[80vh] overflow-y-auto p-4 bg-gray-800 rounded-lg shadow-lg z-40">
      <h3 className="text-white text-lg font-semibold mb-2">Latest Updates</h3>
      <div className="space-y-3">
        {updates.map((update) => (
          <div key={update.id} className="bg-gray-700 p-3 rounded-md">
            <p className="text-white text-sm">{update.message}</p>
            <p className="text-gray-400 text-xs mt-1">
              {new Date(update.createdAt._seconds * 1000).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpdateLogDisplay;
