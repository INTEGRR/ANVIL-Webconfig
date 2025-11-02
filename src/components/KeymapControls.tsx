import { Keyboard } from 'lucide-react';

interface KeymapControlsProps {
  keymapMode: boolean;
  onToggleMode: (enabled: boolean) => void;
}

export default function KeymapControls({ keymapMode, onToggleMode }: KeymapControlsProps) {
  return (
    <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Keyboard className="w-5 h-5 text-brand-beige" />
        Key Mapping
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-blue font-medium">Keymap Edit Mode</p>
            <p className="text-brand-sage text-sm">Click keys to change their function</p>
          </div>
          <button
            onClick={() => onToggleMode(!keymapMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              keymapMode ? 'bg-brand-beige' : 'bg-brand-teal/60'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                keymapMode ? 'translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        {keymapMode && (
          <div className="bg-brand-teal/60 rounded-lg p-4 border border-brand-sage/30">
            <p className="text-brand-blue text-sm">
              <span className="font-semibold">Active:</span> Click any key on the keyboard to change its keycode
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
