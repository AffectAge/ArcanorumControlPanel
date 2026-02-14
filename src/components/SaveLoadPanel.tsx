import { useMemo, useState } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
} from 'lucide-react';
import type { SaveGame } from '../types';

type SaveLoadMode = 'save' | 'load';

type SaveLoadPanelProps = {
  open: boolean;
  mode: SaveLoadMode;
  saves: SaveGame[];
  activeSaveId?: string;
  onClose: () => void;
  onCreateSave: (name: string, overwriteId?: string) => void;
  onLoadSave: (id: string) => void;
  onDeleteSave: (id: string) => void;
  onExportSave: (id?: string) => void;
  onImportSave: (file: File) => Promise<void>;
};

export default function SaveLoadPanel({
  open,
  mode,
  saves,
  activeSaveId,
  onClose,
  onCreateSave,
  onLoadSave,
  onDeleteSave,
  onExportSave,
  onImportSave,
}: SaveLoadPanelProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(activeSaveId);
  const [saveName, setSaveName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sortedSaves = useMemo(
    () =>
      [...saves].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [saves],
  );

  if (!open) return null;

  const selectedSave = sortedSaves.find((save) => save.id === selectedId);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await onImportSave(file);
      event.target.value = '';
    } catch (err) {
      setError((err as Error).message || 'Не удалось импортировать файл.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name && !selectedId) {
      setError('Введите название сохранения.');
      return;
    }
    setError('');
    onCreateSave(name || selectedSave?.name || 'Сохранение', selectedId);
    setSaveName('');
  };

  const handleLoad = () => {
    if (!selectedId) {
      setError('Выберите сохранение.');
      return;
    }
    setError('');
    onLoadSave(selectedId);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[920px] max-w-[96vw] h-[560px] max-h-[90vh] bg-[#0b111b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex">
        <div className="flex-1 p-6 border-r border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-semibold">
                {mode === 'save' ? 'Сохранение игры' : 'Загрузка игры'}
              </h2>
              <p className="text-white/60 text-sm">
                {mode === 'save'
                  ? 'Создайте новое сохранение или перезапишите слот.'
                  : 'Выберите сохранение для загрузки.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="flex-1 overflow-auto pr-2 space-y-3">
            {sortedSaves.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет сохранений. Создайте новое или импортируйте файл.
              </div>
            )}

            {sortedSaves.map((save) => {
              const isActive = save.id === selectedId;
              return (
                <button
                  key={save.id}
                  onClick={() => setSelectedId(save.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : 'bg-white/5 border-white/10 hover:border-emerald-400/40 hover:bg-emerald-400/5'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
                    {mode === 'save' ? (
                      <Save className="w-4 h-4 text-white/70" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-white/70" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{save.name}</div>
                    <div className="text-white/50 text-xs">
                      Ход: {save.data.turn} • Стран: {save.data.countries.length} •{' '}
                      {new Date(save.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-200 text-sm bg-red-500/10 border border-red-400/30 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="w-[360px] p-6 flex flex-col gap-4">
          {mode === 'save' && (
            <>
              <div>
                <h3 className="text-white text-lg font-semibold">Новый слот</h3>
                <p className="text-white/60 text-sm">
                  Введите имя или выберите слот для перезаписи.
                </p>
              </div>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Название сохранения
                <input
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                  placeholder={`Сохранение ${saves.length + 1}`}
                  className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                />
              </label>

              <button
                onClick={handleSave}
                disabled={busy}
                className="h-11 rounded-lg flex items-center justify-center gap-2 font-semibold bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 transition-all"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </>
          )}

          {mode === 'load' && (
            <>
              <div>
                <h3 className="text-white text-lg font-semibold">Загрузка</h3>
                <p className="text-white/60 text-sm">
                  Выберите слот и загрузите игру.
                </p>
              </div>
              <button
                onClick={handleLoad}
                disabled={!selectedId || busy}
                className={`h-11 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                  selectedId
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Загрузить
              </button>
            </>
          )}

          <div className="mt-2 border-t border-white/10 pt-4">
            <h4 className="text-white/70 text-sm mb-3">Импорт / экспорт</h4>
            <div className="flex flex-col gap-2">
              <label className="h-10 rounded-lg flex items-center justify-center gap-2 bg-black/40 border border-white/10 text-white/70 hover:border-emerald-400/60 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Импортировать
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => onExportSave(selectedId)}
                disabled={saves.length === 0 || busy}
                className="h-10 rounded-lg flex items-center justify-center gap-2 bg-black/40 border border-white/10 text-white/70 hover:border-emerald-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Экспорт выбранного
              </button>

              <button
                onClick={() => onExportSave()}
                disabled={saves.length === 0 || busy}
                className="h-10 rounded-lg flex items-center justify-center gap-2 bg-black/40 border border-white/10 text-white/70 hover:border-emerald-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Экспорт всех
              </button>

              <button
                onClick={() => selectedId && onDeleteSave(selectedId)}
                disabled={!selectedId || busy}
                className="h-10 rounded-lg flex items-center justify-center gap-2 bg-red-500/10 border border-red-400/30 text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Удалить слот
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
