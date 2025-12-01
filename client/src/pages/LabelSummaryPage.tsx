import React, { useState, useEffect } from 'react';

interface LabelSummary {
  todayReport: string;
  nextDayReport: string;
  error?: string;
}

const LabelSummaryPage: React.FC = () => {
  const [summary, setSummary] = useState<LabelSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLabelSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/label-summary');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data: LabelSummary = await response.json();
        setSummary(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLabelSummary();
  }, []);

  if (loading) {
    return <div>Loading label summary...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!summary || summary.error) {
    return <div>Error fetching label summary: {summary?.error || 'Unknown error'}</div>;
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
  };

  return (
    <div>
      <h1>Label Summary</h1>
      <div style={containerStyle}>
        <div>
          <h2>Today</h2>
          <pre>{summary.todayReport}</pre>
        </div>
        <div>
          <h2>Next Working Day</h2>
          <pre>{summary.nextDayReport}</pre>
        </div>
      </div>
    </div>
  );
};

export default LabelSummaryPage;
