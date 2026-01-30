import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Assuming an AuthContext for user info
import { BACKEND_URL } from '../config';

const DEVELOPER_EMAIL = "jackt1263@gmail.com";

function UpdateSubmissionBox({ notify }) {
  const { user } = useAuth(); // Get user from AuthContext
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDeveloper = user && user.email === DEVELOPER_EMAIL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDeveloper || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/updates/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        notify({ message: 'Update sent successfully!', type: 'success' });
        setMessage('');
      } else {
        const errorData = await res.json();
        notify({ message: errorData.error || 'Failed to send update', type: 'error' });
      }
    } catch (error) {
      console.error('Error submitting update:', error);
      notify({ message: 'Failed to send update due to network error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isDeveloper) {
    return null; // Only render for developers
  }

  return (
    <div className="fixed bottom-4 left-4 w-80 p-4 bg-gray-800 rounded-lg shadow-lg z-50">
      <h3 className="text-white text-lg font-semibold mb-2">Send Update</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-2 mb-2 bg-gray-700 text-white rounded-md resize-none"
          rows="3"
          placeholder="Type your update message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
        ></textarea>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
          disabled={!message.trim() || isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Update'}
        </button>
      </form>
    </div>
  );
}

export default UpdateSubmissionBox;
