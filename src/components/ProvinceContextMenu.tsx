type ProvinceContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onColonize: () => void;
  onConstruct: () => void;
  onEditProvince: () => void;
  onOpenLogistics: () => void;
};

export default function ProvinceContextMenu({
  open,
  x,
  y,
  onClose,
  onColonize,
  onConstruct,
  onEditProvince,
  onOpenLogistics,
}: ProvinceContextMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div
        className="absolute min-w-[220px] rounded-xl border border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl"
        style={{ left: x, top: y }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => {
            onColonize();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-300 transition-colors"
        >
          Колонизация
        </button>
        <button
          onClick={() => {
            onConstruct();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-300 transition-colors"
        >
          Строительство
        </button>
        <button
          onClick={() => {
            onEditProvince();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-300 transition-colors"
        >
          Редактор провинции
        </button>
        <button
          onClick={() => {
            onOpenLogistics();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white/80 hover:bg-sky-400/10 hover:text-sky-300 transition-colors"
        >
          Логистика
        </button>
      </div>
    </div>
  );
}
