import React, { useState, useEffect } from 'react';
import Header from '../Components/Header';
import api from '../Api';
import { useAuth } from '../authContext';


function Wish() {
  const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return null;
  return (
    <>
      <Header />
      {isLoggedIn && <Wishes title="Wishes" />}
    </>
  );
}


function Wishes() {
  const { user } = useAuth();
  const userEmail = user?.email;
  const userRole = user?.role;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [wishes, setWishes] = useState([]);

  useEffect(() => {
    fetchWishes();
  }, []);

  const fetchWishes = async () => {
    try {
      const res = await api.get('/api/wishes');
      setWishes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching wishes:', err);
      setWishes([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/api/wishes', { title, message });

      if (res.status === 201) {
        setTitle('');
        setMessage('');
        await fetchWishes();
      } else {
        alert(res.data.message || 'Error submitting wish');
      }
    } catch (err) {
      console.error('Wish submit error:', err);
      alert('Something went wrong');
    }
  };

  const handleDelete = async (wishId) => {
    if (!window.confirm('Are you sure you want to delete this Wish?')) return;

    try {
      const res = await api.delete(`/api/wishes/delete/${wishId}`);

      if (!res || !res.data || !res.data.message) {
        alert('Failed to delete the wish.');
        return;
      }

      await fetchWishes();
    } catch (err) {
      console.error('Error deleting Wish:', err);
    }
  };

  return (
      <div className='mainDiv'>
        <div className="form-container">
          <h2 className='wishTitle'>Make a Wish ✨</h2>
          <form onSubmit={handleSubmit}>
            <input
              className='makeWishTitle'
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <button type="submit" className="authKnapp">Submit Wish</button>
          </form>
        </div>
        <div className='wishList'>
          <h3 className='wishTitle'>Wishes</h3>
          {Array.isArray(wishes) && wishes.length === 0 ? (
            <p>No wishes yet</p>
          ) : (
            <div className='wishTableDiv'>
              <table className='wishTable'>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Message</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(wishes) && wishes.map((wish, index) => (
                    <tr className='wishPost' key={index}>
                      <td className='wishName'>{wish.userName}</td>
                      <td>{wish.title}</td>
                      <td>{wish.message || ''}</td>
                      <td>
                        {(wish.userEmail === userEmail || userRole === 'admin') && (
                          <button
                            className="deleteKnapp"
                            onClick={() => handleDelete(wish._id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}

export default Wish;
