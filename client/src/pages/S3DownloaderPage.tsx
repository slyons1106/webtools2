import React, { useState, useEffect, useCallback } from 'react';
import './S3DownloaderPage.css'; // Assuming you'll create a CSS file for this

interface S3Object {
  name: string;
  type: 'file' | 'folder';
  path: string; // full path for files, prefix for folders
}

const S3DownloaderPage: React.FC = () => {
  const [profile, setProfile] = useState<string>('gateway');
  const [region, setRegion] = useState<string>('eu-west-1');
  const [bucket, setBucket] = useState<string>('pat-labels');
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Not connected');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<{ data: string; key: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (path: string, command: 'list' | 'search', term?: string) => {
    setLoading(true);
    setError(null);
    setStatus('Loading...');
    try {
      const queryParams = new URLSearchParams({
        bucket,
        profile,
        region,
      });

      let url = '';
      if (command === 'list') {
        queryParams.append('prefix', path);
        url = `/api/s3-downloader/list?${queryParams.toString()}`;
      } else { // search
        queryParams.append('prefix', path);
        queryParams.append('term', term || '');
        url = `/api/s3-downloader/search?${queryParams.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch S3 data');
      }

      return data;
    } catch (err) {
      console.error('API call failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [bucket, profile, region]);

  const listS3Objects = useCallback(async (prefixToList: string) => {
    const result = await fetchData(prefixToList, 'list');
    if (result) {
      const newObjects: S3Object[] = [];
      result.folders.forEach((folder: string) => newObjects.push({ name: folder.replace('/', ''), type: 'folder', path: prefixToList + folder }));
      result.files.forEach((file: string) => newObjects.push({ name: file.split('/').pop() || '', type: 'file', path: file }));
      setObjects(newObjects);
      setCurrentPrefix(prefixToList);
      setStatus('Ready');
    } else {
      setObjects([]);
    }
  }, [fetchData]);

  const connectS3 = useCallback(async () => {
    setCurrentPrefix('');
    await listS3Objects('');
    setStatus('Connected');
  }, [listS3Objects]);

  const handleObjectClick = async (obj: S3Object) => {
    if (obj.type === 'folder') {
      await listS3Objects(obj.path);
    } else if (obj.type === 'file' && obj.name.toLowerCase().endsWith('.png')) {
      await loadImage(obj.path);
    }
  };

  const goUpDirectory = async () => {
    if (!currentPrefix) return;
    const pathParts = currentPrefix.split('/').filter(Boolean); // Remove empty strings
    pathParts.pop(); // Remove the last part
    const newPrefix = pathParts.length > 0 ? `${pathParts.join('/')}/` : '';
    await listS3Objects(newPrefix);
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      alert('Please enter a search term.');
      return;
    }
    const result = await fetchData(currentPrefix, 'search', searchTerm);
    if (result && result.image_data) {
      await loadImage(result.key);
    } else {
      alert('No matching PNG found.');
      setSelectedImage(null);
    }
  };

  const loadImage = async (key: string) => {
    setLoading(true);
    setError(null);
    setStatus('Loading image...');
    try {
      const queryParams = new URLSearchParams({
        bucket,
        key,
        profile,
        region,
      });
      const response = await fetch(`/api/s3-downloader/image?${queryParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch image data');
      }
      setSelectedImage({ data: data.image_data, key, width: data.width, height: data.height });
      setStatus('Image loaded');
    } catch (err) {
      console.error('Image fetch failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setSelectedImage(null);
      setStatus('Error loading image');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (selectedImage) {
      const link = document.createElement('a');
      link.href = selectedImage.data;
      link.download = selectedImage.key.split('/').pop() || 'download.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    // Initial connection attempt
    connectS3();
  }, [connectS3]);

  return (
    <div className="s3-downloader-page">
      <h1>S3 Label Downloader</h1>

      <div className="controls">
        <input
          type="text"
          placeholder="AWS Profile (e.g., gateway)"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
        />
        <input
          type="text"
          placeholder="AWS Region (e.g., us-east-1)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <input
          type="text"
          placeholder="S3 Bucket (e.g., pat-labels)"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
        />
        <button onClick={connectS3} disabled={loading}>Connect</button>
        <button onClick={goUpDirectory} disabled={loading || !currentPrefix}>Up</button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for PNGs (e.g., my_label_123)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>Search</button>
      </div>

      <p className="status-message">Status: {status}</p>
      {error && <p className="error-message">Error: {error}</p>}

      <div className="content-area">
        <div className="browser-pane">
          <h2>Bucket Contents: s3://{bucket}/{currentPrefix}</h2>
          {loading && <p>Loading contents...</p>}
          {!loading && objects.length === 0 && <p>No objects found or connected.</p>}
          <ul>
            {objects.map((obj) => (
              <li key={obj.path} onClick={() => handleObjectClick(obj)} className={obj.type}>
                {obj.type === 'folder' ? '📁' : '📄'} {obj.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="viewer-pane">
          <h2>Image Preview</h2>
          {loading && selectedImage === null && <p>Loading image...</p>}
          {selectedImage ? (
            <>
              <img src={selectedImage.data} alt={selectedImage.key} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
              <p>{selectedImage.key} | {selectedImage.width}x{selectedImage.height}</p>
              <button onClick={downloadImage}>Download PNG</button>
            </>
          ) : (
            !loading && <p>Select a PNG file to preview</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default S3DownloaderPage;
