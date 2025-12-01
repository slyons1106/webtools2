import React, { useState, useEffect } from 'react';

interface S3Bucket {
  name: string;
  objectCount: number | string;
}

interface S3Summary {
  buckets: S3Bucket[];
  error?: string;
}

const S3SummaryPage: React.FC = () => {
  const [summary, setSummary] = useState<S3Summary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchS3Summary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/s3-summary');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data: S3Summary = await response.json();
        setSummary(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchS3Summary();
  }, []);

  if (loading) {
    return <div>Loading S3 summary...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!summary || summary.error) {
    return <div>Error fetching S3 summary: {summary?.error || 'Unknown error'}</div>;
  }

  return (
    <div>
      <h1>S3 Bucket Summary</h1>
      {summary.buckets.length === 0 ? (
        <p>No S3 buckets found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Bucket Name</th>
              <th>Object Count</th>
            </tr>
          </thead>
          <tbody>
            {summary.buckets.map((bucket) => (
              <tr key={bucket.name}>
                <td>{bucket.name}</td>
                <td>{bucket.objectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default S3SummaryPage;
