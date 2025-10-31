import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Keyboard, User, LogOut, Settings, BookMarked, Grid3x3, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-brand-teal border-b border-brand-sage/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Keyboard className="w-8 h-8 text-brand-beige" />
              <span className="text-xl font-bold text-white">Anvil Native</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/gallery"
                className="text-brand-blue hover:text-white transition-colors flex items-center gap-2"
              >
                <Grid3x3 className="w-4 h-4" />
                Gallery
              </Link>
              {user && (
                <>
                  <Link
                    to="/my-presets"
                    className="text-brand-blue hover:text-white transition-colors flex items-center gap-2"
                  >
                    <BookMarked className="w-4 h-4" />
                    My Presets
                  </Link>
                  <Link
                    to="/configurator"
                    className="text-brand-blue hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-brand-teal/60 hover:bg-brand-teal/80 px-4 py-2 rounded-lg border border-brand-sage/30 transition-colors"
                >
                  <User className="w-5 h-5 text-brand-beige" />
                  <span className="text-white text-sm font-medium">{profile?.username || 'User'}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-brand-teal border border-brand-sage/30 rounded-lg shadow-xl overflow-hidden">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-3 text-brand-blue hover:bg-brand-teal/60 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-brand-blue hover:bg-brand-teal/60 hover:text-white transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-brand-blue hover:text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-beige hover:bg-brand-beige/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
