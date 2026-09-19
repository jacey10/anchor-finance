import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Profile({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you absolutely sure? This will permanently delete your account and ALL your financial data. This action cannot be undone."
    );
    
    if (confirmed) {
      setLoading(true);
      try {
        // Call the secure function we created in Step 1
        const { error } = await supabase.rpc('delete_user');
        if (error) throw error;
        
        await supabase.auth.signOut();
        onLogout();
      } catch (err) {
        alert("Error deleting account: " + err.message);
        setLoading(false);
      }
    }
  };

  if (!user) return <div className="loading">Loading profile...</div>;

  return (
    <div className="screen">
      <h1 className="screen-title">Profile</h1>
      <p className="screen-sub">Manage your account details.</p>

      <div className="profile-card">
        <div className="profile-avatar-large">
          {user.email.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <label className="form-label">Email Address</label>
          <p className="profile-email">{user.email}</p>
          
          <label className="form-label" style={{ marginTop: 16 }}>Member Since</label>
          <p className="profile-email">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="danger-zone">
        <h3 className="danger-title">Danger Zone</h3>
        <p className="danger-sub">Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          className="btn btn-danger" 
          onClick={handleDeleteAccount} 
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}