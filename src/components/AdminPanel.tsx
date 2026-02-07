import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Shield,
  Cloud,
  Landmark,
  Mountain,
  Palette,
  Package,
} from 'lucide-react';
import type { Country, ProvinceRecord, Trait } from '../types';

type AdminTab =
  | 'provinces'
  | 'climates'
  | 'religions'
  | 'landscapes'
  | 'cultures'
  | 'resources';

type AdminPanelProps = {
  open: boolean;
  selectedProvinceId?: string;
  provinces: ProvinceRecord;
  countries: Country[];
  climates: Trait[];
  religions: Trait[];
  landscapes: Trait[];
  cultures: Trait[];
  resources: Trait[];
  onClose: () => void;
  onAssignOwner: (provinceId: string, ownerId?: string) => void;
  onAssignClimate: (provinceId: string, climateId?: string) => void;
  onAssignReligion: (provinceId: string, religionId?: string) => void;
  onAssignLandscape: (provinceId: string, landscapeId?: string) => void;
  onAssignCulture: (provinceId: string, cultureId?: string) => void;
  onSetProvinceResourceAmount: (
    provinceId: string,
    resourceId: string,
    amount: number,
  ) => void;
  onSetColonizationCost: (provinceId: string, cost: number) => void;
  onSetColonizationDisabled: (provinceId: string, disabled: boolean) => void;
  onAddClimate: (name: string, color: string) => void;
  onAddReligion: (name: string, color: string) => void;
  onAddLandscape: (name: string, color: string) => void;
  onAddCulture: (name: string, color: string) => void;
  onAddResource: (name: string, color: string) => void;
  onDeleteClimate: (id: string) => void;
  onDeleteReligion: (id: string) => void;
  onDeleteLandscape: (id: string) => void;
  onDeleteCulture: (id: string) => void;
  onDeleteResource: (id: string) => void;
};

const emptyColor = '#4ade80';

export default function AdminPanel({
  open,
  selectedProvinceId,
  provinces,
  countries,
  climates,
  religions,
  landscapes,
  cultures,
  resources,
  onClose,
  onAssignOwner,
  onAssignClimate,
  onAssignReligion,
  onAssignLandscape,
  onAssignCulture,
  onSetProvinceResourceAmount,
  onSetColonizationCost,
  onSetColonizationDisabled,
  onAddClimate,
  onAddReligion,
  onAddLandscape,
  onAddCulture,
  onAddResource,
  onDeleteClimate,
  onDeleteReligion,
  onDeleteLandscape,
  onDeleteCulture,
  onDeleteResource,
}: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('provinces');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [climateName, setClimateName] = useState('');
  const [climateColor, setClimateColor] = useState(emptyColor);
  const [religionName, setReligionName] = useState('');
  const [religionColor, setReligionColor] = useState('#facc15');
  const [landscapeName, setLandscapeName] = useState('');
  const [landscapeColor, setLandscapeColor] = useState('#22c55e');
  const [cultureName, setCultureName] = useState('');
  const [cultureColor, setCultureColor] = useState('#fb7185');
  const [resourceName, setResourceName] = useState('');
  const [resourceColor, setResourceColor] = useState('#22c55e');

  const provinceIds = useMemo(() => Object.keys(provinces).sort(), [provinces]);
  const activeProvince = selectedProvince ? provinces[selectedProvince] : undefined;

  useEffect(() => {
    if (!open || !selectedProvinceId) return;
    setTab('provinces');
    setSelectedProvince(selectedProvinceId);
  }, [open, selectedProvinceId]);

  if (!open) return null;

  const handleAddClimate = () => {
    const name = climateName.trim();
    if (!name) return;
    onAddClimate(name, climateColor);
    setClimateName('');
  };

  const handleAddReligion = () => {
    const name = religionName.trim();
    if (!name) return;
    onAddReligion(name, religionColor);
    setReligionName('');
  };

  const handleAddLandscape = () => {
    const name = landscapeName.trim();
    if (!name) return;
    onAddLandscape(name, landscapeColor);
    setLandscapeName('');
  };

  const handleAddCulture = () => {
    const name = cultureName.trim();
    if (!name) return;
    onAddCulture(name, cultureColor);
    setCultureName('');
  };

  const handleAddResource = () => {
    const name = resourceName.trim();
    if (!name) return;
    onAddResource(name, resourceColor);
    setResourceName('');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[980px] max-w-[96vw] h-[620px] max-h-[92vh] bg-[#0b111b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex">
        <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-2">
          <div className="text-white text-lg font-semibold mb-2">Панель администратора</div>
          <button
            onClick={() => setTab('provinces')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'provinces'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Shield className="w-4 h-4" />
            Провинции
          </button>
          <button
            onClick={() => setTab('climates')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'climates'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Климат
          </button>
          <button
            onClick={() => setTab('religions')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'religions'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Религии
          </button>
          <button
            onClick={() => setTab('landscapes')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'landscapes'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Mountain className="w-4 h-4" />
            Ландшафт
          </button>
          <button
            onClick={() => setTab('cultures')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'cultures'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Palette className="w-4 h-4" />
            Культуры
          </button>
          <button
            onClick={() => setTab('resources')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'resources'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Package className="w-4 h-4" />
            Ресурсы
          </button>
          <button
            onClick={onClose}
            className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30"
          >
            <X className="w-4 h-4" />
            Закрыть
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {tab === 'provinces' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Данные провинций</h2>
                <p className="text-white/60 text-sm">
                  Выберите провинцию и назначьте параметры.
                </p>
              </div>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Провинция
                <select
                  value={selectedProvince}
                  onChange={(event) => setSelectedProvince(event.target.value)}
                  className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                >
                  <option value="">Выберите провинцию</option>
                  {provinceIds.map((id) => (
                    <option key={id} value={id} className="text-black">
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              {activeProvince && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Владелец
                    <select
                      value={activeProvince.ownerCountryId ?? ''}
                      onChange={(event) =>
                        onAssignOwner(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="">Без владельца</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id} className="text-black">
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Климат
                    <select
                      value={activeProvince.climateId ?? ''}
                      onChange={(event) =>
                        onAssignClimate(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="">Не назначен</option>
                      {climates.map((climate) => (
                        <option key={climate.id} value={climate.id} className="text-black">
                          {climate.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Религия
                    <select
                      value={activeProvince.religionId ?? ''}
                      onChange={(event) =>
                        onAssignReligion(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="">Не назначена</option>
                      {religions.map((religion) => (
                        <option key={religion.id} value={religion.id} className="text-black">
                          {religion.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Ландшафт
                    <select
                      value={activeProvince.landscapeId ?? ''}
                      onChange={(event) =>
                        onAssignLandscape(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="">Не назначен</option>
                      {landscapes.map((landscape) => (
                        <option
                          key={landscape.id}
                          value={landscape.id}
                          className="text-black"
                        >
                          {landscape.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Культура
                    <select
                      value={activeProvince.cultureId ?? ''}
                      onChange={(event) =>
                        onAssignCulture(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="">Не назначена</option>
                      {cultures.map((culture) => (
                        <option key={culture.id} value={culture.id} className="text-black">
                          {culture.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="md:col-span-2">
                    <div className="text-white/70 text-sm mb-2">Ресурсы</div>
                    {resources.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resources.map((resource) => (
                          <label
                            key={resource.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                          >
                            <span className="flex-1">{resource.name}</span>
                            <input
                              type="number"
                              min={0}
                              value={activeProvince.resourceAmounts?.[resource.id] ?? 0}
                              onChange={(event) =>
                                onSetProvinceResourceAmount(
                                  activeProvince.id,
                                  resource.id,
                                  Math.max(0, Number(event.target.value) || 0),
                                )
                              }
                              className="w-20 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white focus:outline-none focus:border-emerald-400/60"
                            />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-white/50 text-sm">Нет ресурсов</div>
                    )}
                  </div>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Стоимость колонизации
                    <input
                      type="number"
                      min={1}
                      value={activeProvince.colonizationCost ?? 100}
                      onChange={(event) =>
                        onSetColonizationCost(
                          activeProvince.id,
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>

                  <label className="flex items-center gap-3 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      checked={activeProvince.colonizationDisabled ?? false}
                      onChange={(event) =>
                        onSetColonizationDisabled(
                          activeProvince.id,
                          event.target.checked,
                        )
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    Запретить колонизацию
                  </label>
                </div>
              )}
            </div>
          )}

          {tab === 'climates' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Климат</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте типы климата.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={climateName}
                    onChange={(event) => setClimateName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={climateColor}
                    onChange={(event) => setClimateColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddClimate}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {climates.map((climate) => (
                  <div
                    key={climate.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: climate.color }}
                      />
                      <span className="text-white/80 text-sm">{climate.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteClimate(climate.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'religions' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Религии</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте религии.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={religionName}
                    onChange={(event) => setReligionName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={religionColor}
                    onChange={(event) => setReligionColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddReligion}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {religions.map((religion) => (
                  <div
                    key={religion.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: religion.color }}
                      />
                      <span className="text-white/80 text-sm">{religion.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteReligion(religion.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'landscapes' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Ландшафт</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте ландшафты.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={landscapeName}
                    onChange={(event) => setLandscapeName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={landscapeColor}
                    onChange={(event) => setLandscapeColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddLandscape}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {landscapes.map((landscape) => (
                  <div
                    key={landscape.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: landscape.color }}
                      />
                      <span className="text-white/80 text-sm">{landscape.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteLandscape(landscape.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'cultures' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Культуры</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте культуры.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={cultureName}
                    onChange={(event) => setCultureName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={cultureColor}
                    onChange={(event) => setCultureColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddCulture}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {cultures.map((culture) => (
                  <div
                    key={culture.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: culture.color }}
                      />
                      <span className="text-white/80 text-sm">{culture.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteCulture(culture.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'resources' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Ресурсы</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте ресурсы.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={resourceName}
                    onChange={(event) => setResourceName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={resourceColor}
                    onChange={(event) => setResourceColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddResource}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: resource.color }}
                      />
                      <span className="text-white/80 text-sm">{resource.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteResource(resource.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
