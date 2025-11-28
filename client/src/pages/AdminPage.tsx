import React, { useState, useEffect } from 'react';
import './AdminPage.css'; // Import the CSS file

interface User {
  id: number;
  username: string;
  role: string;
  allowedPages: string[];
}

const ALL_POSSIBLE_PAGES = [
  '/',
  '/page1',
  '/page2',
  '/page3',
  '/page4',
  '/page5',
  '/page6',
];

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editedUsername, setEditedUsername] = useState<string>('');
  const [editedRole, setEditedRole] = useState<string>('');
  const [editedAllowedPages, setEditedAllowedPages] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: User[] = await response.json();
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setEditedUsername(user.username);
    setEditedRole(user.role);
    setEditedAllowedPages(user.allowedPages || []);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (userId: number) => {
    setSaveError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editedUsername,
          role: editedRole,
          allowedPages: editedAllowedPages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setEditingUserId(null);
      fetchUsers(); // Refresh the user list
    } catch (e: any) {
      setSaveError(e.message);
    }
  };

  const handlePageCheckboxChange = (page: string) => {
    setEditedAllowedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="admin-page-container">
      <h1>Welcome to the Admin Page!</h1>
      <h2>User Management</h2>
      {saveError && <p className="error-message">Error saving user: {saveError}</p>}
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Allowed Pages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  {editingUserId === user.id ? (
                    <input
                      type="text"
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value)}
                    />
                  ) : (
                    user.username
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <select
                      value={editedRole}
                      onChange={(e) => setEditedRole(e.target.value)}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <div className="allowed-pages-checkboxes">
                      {ALL_POSSIBLE_PAGES.map((page) => (
                        <label key={page}>
                          <input
                            type="checkbox"
                            value={page}
                            checked={editedAllowedPages.includes(page)}
                            onChange={() => handlePageCheckboxChange(page)}
                          />
                          {page}
                        </label>
                      ))}
                    </div>
                  ) : (
                    user.allowedPages && user.allowedPages.length > 0
                      ? user.allowedPages.join(', ')
                      : 'N/A'
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <>
                      <button className="save-button" onClick={() => handleSaveEdit(user.id)}>Save</button>
                      <button className="cancel-button" onClick={handleCancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <button className="edit-button" onClick={() => handleEditClick(user)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPage;
