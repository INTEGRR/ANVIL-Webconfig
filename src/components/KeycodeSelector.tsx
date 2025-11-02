import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { QMK_KEYCODES, KEYCODE_CATEGORIES, KeyCode } from '../data/qmkKeycodes';

interface KeycodeSelectorProps {
  currentKeyCode: string;
  onSelect: (keyCode: string) => void;
  onClose: () => void;
}

export default function KeycodeSelector({ currentKeyCode, onSelect, onClose }: KeycodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredKeycodes = QMK_KEYCODES.filter((kc) => {
    const matchesSearch =
      kc.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || kc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (keyCode: string) => {
    onSelect(keyCode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-teal rounded-xl border border-brand-sage/20 max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-brand-sage/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Keycode</h2>
              <p className="text-brand-sage text-sm mt-1">Current: <span className="text-brand-beige font-semibold">{currentKeyCode}</span></p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-sage hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-sage w-5 h-5" />
            <input
              type="text"
              placeholder="Search keycodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-teal/60 text-white pl-10 pr-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-brand-beige text-white'
                  : 'bg-brand-teal/60 text-brand-blue hover:bg-brand-teal/80'
              }`}
            >
              All
            </button>
            {KEYCODE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-beige text-white'
                    : 'bg-brand-teal/60 text-brand-blue hover:bg-brand-teal/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredKeycodes.map((kc) => (
              <button
                key={kc.code}
                onClick={() => handleSelect(kc.code)}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  currentKeyCode === kc.code
                    ? 'bg-brand-beige text-white border-brand-beige'
                    : 'bg-brand-teal/60 text-white border-brand-sage/30 hover:bg-brand-teal/80 hover:border-brand-beige'
                }`}
              >
                <div className="font-bold text-sm truncate">{kc.label}</div>
                <div className="text-xs text-brand-sage truncate">{kc.code}</div>
              </button>
            ))}
          </div>

          {filteredKeycodes.length === 0 && (
            <div className="text-center py-12 text-brand-sage">
              <p>No keycodes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
