import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { X, Plus, Image as ImageIcon, Check, Trash2, Save } from 'lucide-react';
import type { Country } from '../types';

type CountryDraft = {
  name: string;
  color: string;
  flagDataUrl?: string;
  coatDataUrl?: string;
};

type HotseatPanelProps = {
  open: boolean;
  countries: Country[];
  activeCountryId?: string;
  onClose: () => void;
  onSelectCountry: (id: string) => void;
  onCreateCountry: (country: CountryDraft) => void;
  onUpdateCountry: (id: string, update: CountryDraft) => void;
  onDeleteCountry: (id: string) => void;
};

const emptyForm: CountryDraft = {
  name: '',
  color: '#3dd68c',
  flagDataUrl: undefined,
  coatDataUrl: undefined,
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function HotseatPanel({
  open,
  countries,
  activeCountryId,
  onClose,
  onSelectCountry,
  onCreateCountry,
  onUpdateCountry,
  onDeleteCountry,
}: HotseatPanelProps) {
  const [form, setForm] = useState<CountryDraft>(emptyForm);
  const [editForm, setEditForm] = useState<CountryDraft>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasCountries = countries.length > 0;
  const isValid = form.name.trim().length > 0;

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === activeCountryId),
    [countries, activeCountryId],
  );

  useEffect(() => {
    if (selectedCountry) {
      setEditForm({
        name: selectedCountry.name,
        color: selectedCountry.color,
        flagDataUrl: selectedCountry.flagDataUrl,
        coatDataUrl: selectedCountry.coatDataUrl,
      });
    } else {
      setEditForm(emptyForm);
    }
  }, [selectedCountry]);

  if (!open) {
    return null;
  }

  const handleFile = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'flagDataUrl' | 'coatDataUrl',
    target: 'create' | 'edit',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (target === 'create') {
      setForm((prev) => ({ ...prev, [field]: dataUrl }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: dataUrl }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    onCreateCountry({
      name: form.name.trim(),
      color: form.color,
      flagDataUrl: form.flagDataUrl,
      coatDataUrl: form.coatDataUrl,
    });
    setForm(emptyForm);
    setIsSubmitting(false);
  };

  const handleSaveEdit = () => {
    if (!selectedCountry) return;
    if (!editForm.name.trim()) return;
    onUpdateCountry(selectedCountry.id, {
      name: editForm.name.trim(),
      color: editForm.color,
      flagDataUrl: editForm.flagDataUrl,
      coatDataUrl: editForm.coatDataUrl,
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-[1040px] max-w-[96vw] h-[620px] max-h-[90vh] bg-[#0b111b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex">
        <div className="flex-1 p-6 border-r border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-semibold">Страны</h2>
              <p className="text-white/60 text-sm">
                Выберите страну для хода или создайте новую.
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
            {!hasCountries && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Пока нет созданных стран. Создайте первую, чтобы начать ход.
              </div>
            )}

            {countries.map((country) => {
              const isActive = country.id === activeCountryId;
              return (
                <button
                  key={country.id}
                  onClick={() => onSelectCountry(country.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : 'bg-white/5 border-white/10 hover:border-emerald-400/40 hover:bg-emerald-400/5'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center"
                    style={{ backgroundColor: country.color }}
                  >
                    {country.flagDataUrl ? (
                      <img
                        src={country.flagDataUrl}
                        alt={`${country.name} flag`}
                        className="w-7 h-7 object-contain"
                      />
                    ) : (
                      <span className="text-black/70 font-semibold text-sm">
                        {country.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{country.name}</div>
                    <div className="text-white/50 text-xs">Цвет: {country.color}</div>
                  </div>
                  {isActive && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-[520px] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-white text-lg font-semibold">Создать страну</h3>
                <p className="text-white/60 text-sm">
                  Название, цвет и изображения для флага и герба.
                </p>
              </div>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Название страны
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Например, Аркания"
                  className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                />
              </label>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Цвет страны
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                    className="w-12 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                  <input
                    value={form.color}
                    onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                    className="flex-1 h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Флаг
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 h-10 rounded-lg bg-black/40 border border-white/10 cursor-pointer hover:border-emerald-400/60 transition-colors">
                    <ImageIcon className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">Загрузить</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleFile(event, 'flagDataUrl', 'create')}
                      className="hidden"
                    />
                  </label>
                  {form.flagDataUrl ? (
                    <img
                      src={form.flagDataUrl}
                      alt="Flag preview"
                      className="w-14 h-10 object-contain rounded border border-white/10 bg-black/30"
                    />
                  ) : (
                    <span className="text-white/40 text-xs">Нет изображения</span>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Герб
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 h-10 rounded-lg bg-black/40 border border-white/10 cursor-pointer hover:border-emerald-400/60 transition-colors">
                    <ImageIcon className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">Загрузить</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleFile(event, 'coatDataUrl', 'create')}
                      className="hidden"
                    />
                  </label>
                  {form.coatDataUrl ? (
                    <img
                      src={form.coatDataUrl}
                      alt="Coat preview"
                      className="w-10 h-10 object-contain rounded border border-white/10 bg-black/30"
                    />
                  ) : (
                    <span className="text-white/40 text-xs">Нет изображения</span>
                  )}
                </div>
              </label>

              <button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={`mt-auto h-11 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                  isValid
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                Создать страну
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-white text-lg font-semibold">Редактировать страну</h3>
                <p className="text-white/60 text-sm">
                  Выберите страну слева, чтобы изменить параметры.
                </p>
              </div>

              {!selectedCountry && (
                <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                  Страна не выбрана.
                </div>
              )}

              {selectedCountry && (
                <>
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Название
                    <input
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Цвет
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, color: event.target.value }))
                        }
                        className="w-12 h-10 rounded-lg border border-white/10 bg-transparent"
                      />
                      <input
                        value={editForm.color}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, color: event.target.value }))
                        }
                        className="flex-1 h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Флаг
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 h-10 rounded-lg bg-black/40 border border-white/10 cursor-pointer hover:border-emerald-400/60 transition-colors">
                        <ImageIcon className="w-4 h-4 text-white/70" />
                        <span className="text-white/70 text-sm">Загрузить</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleFile(event, 'flagDataUrl', 'edit')}
                          className="hidden"
                        />
                      </label>
                      {editForm.flagDataUrl ? (
                        <img
                          src={editForm.flagDataUrl}
                          alt="Flag preview"
                          className="w-14 h-10 object-contain rounded border border-white/10 bg-black/30"
                        />
                      ) : (
                        <span className="text-white/40 text-xs">Нет изображения</span>
                      )}
                    </div>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Герб
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 h-10 rounded-lg bg-black/40 border border-white/10 cursor-pointer hover:border-emerald-400/60 transition-colors">
                        <ImageIcon className="w-4 h-4 text-white/70" />
                        <span className="text-white/70 text-sm">Загрузить</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleFile(event, 'coatDataUrl', 'edit')}
                          className="hidden"
                        />
                      </label>
                      {editForm.coatDataUrl ? (
                        <img
                          src={editForm.coatDataUrl}
                          alt="Coat preview"
                          className="w-10 h-10 object-contain rounded border border-white/10 bg-black/30"
                        />
                      ) : (
                        <span className="text-white/40 text-xs">Нет изображения</span>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 h-10 rounded-lg flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Сохранить
                    </button>
                    <button
                      onClick={() => selectedCountry && onDeleteCountry(selectedCountry.id)}
                      className="h-10 px-3 rounded-lg flex items-center justify-center gap-2 bg-red-500/10 border border-red-400/40 text-red-200 hover:bg-red-500/20 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
