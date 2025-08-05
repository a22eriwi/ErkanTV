// src/AdminDashboard.js
import { useAuth } from '../authContext';
import React, { useEffect, useState } from 'react';
import Header from '../Components/Header';
import api from '../Api';


function RenderAdminDashboard() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <>
      {isLoggedIn && <AdminDashboard title="AdminDashboard" />}
    </>
  );
}

function AdminDashboard() {
  const [streamLogs, setStreamLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/api/admin/all-users');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Error fetching all users:', err);
      setAllUsers([]);
    }
  };

  const fetchStreamLogs = async () => {
    try {
      const res = await api.get('/api/admin/stream-logs');
      const data = res.data;

      if (Array.isArray(data)) {
        setStreamLogs(data);
      } else {
        console.error('Expected an array of logs, got:', data);
        setStreamLogs([]);
      }
    } catch (err) {
      console.error('Error fetching stream logs:', err);
      setStreamLogs([]);
    }
  };

  useEffect(() => {
    fetchAllUsers();
    fetchStreamLogs();
  }, []);

  const approveUser = async (userId) => {
    try {
      await api.post(`/api/admin/approve/${userId}`);
      await fetchAllUsers();
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await api.delete(`/api/admin/delete/${userId}`);
      console.log(res.data.message);
      await fetchAllUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const approvedUsers = Array.isArray(allUsers) ? allUsers.filter(user => user.approved) : [];
  const pendingUsers = Array.isArray(allUsers) ? allUsers.filter(user => !user.approved) : [];

  return (
    <>
      <Header />
      <div className='mainDiv'>
        <div className="adminGrid">
          <div className='pending'>
            <h2 className='adminTitle'>Pending User Approvals</h2>
            {pendingUsers.length === 0 ? (
              <p>No pending users</p>
            ) : (
              <div className='centreraCards'>
                <div className='adminTableDiv'>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <button
                              className="approveKnapp"
                              onClick={() => approveUser(user._id)}
                            >
                              Approve
                            </button>
                            <button
                              className="deleteKnapp"
                              onClick={() => handleDelete(user._id)}
                            >
                              Disapprove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className='approved'>
              <h2 className='adminTitle'>Approved Users</h2>
              {approvedUsers.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <div className='centreraCards'>
                  <div className='adminTableDiv'>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedUsers.map((user) => (
                          <tr key={user._id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role === 'admin' ? 'Admin' : 'User'}</td>
                            <td>
                              {user.role !== 'admin' ? (
                                <button className="deleteKnapp" onClick={() => handleDelete(user._id)}>Delete</button>
                              ) : (
                                <button className="deleteKnappOsynlig">Delete</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='streamingLogs'>
            <h2 className='adminTitle'>Stream Logs</h2>
            {streamLogs.length === 0 ? (
              <p>No streaming activity yet</p>
            ) : (
              <div className='adminTableDiv'>
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Movies/Series</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{log.userName}</td>
                        <td>
                          {log.type === 'series'
                            ? `${log.seriesName} - ${log.fileName}`
                            : log.fileName}
                        </td>
                        <td>{new Date(log.createdAt).toLocaleString([], {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default RenderAdminDashboard;
