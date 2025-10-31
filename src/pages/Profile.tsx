import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Lock, Trash2, X } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setUsername(data.username);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;
      alert('Username updated successfully!');
    } catch (error: any) {
      console.error('Error updating username:', error);
      alert(error.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      alert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !deletePassword) return;

    setDeleting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });

      if (signInError) {
        alert('Incorrect password');
        setDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase.rpc('delete_user_account');

      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Profile Settings</h1>

        <div className="space-y-6">
          <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-brand-beige" />
              <h2 className="text-2xl font-bold text-white">Username</h2>
            </div>

            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-brand-blue mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Username'}
              </button>
            </form>
          </div>

          <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-brand-beige" />
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-brand-blue mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-blue mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="bg-brand-teal rounded-xl border border-red-500/30 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Danger Zone</h2>
            </div>

            <p className="text-brand-sage mb-4">
              Once you delete your account, there is no going back. This will permanently delete all your presets, comments, ratings, and profile data.
            </p>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-brand-teal rounded-xl border border-red-500/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Confirm Account Deletion</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                className="text-brand-sage hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-brand-sage mb-6">
              This action cannot be undone. Please enter your password to confirm deletion of your account and all associated data.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label htmlFor="deletePassword" className="block text-sm font-medium text-brand-blue mb-2">
                  Password
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                  }}
                  className="flex-1 bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
