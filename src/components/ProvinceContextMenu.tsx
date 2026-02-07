type ProvinceContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onColonize: () => void;
  onEditProvince: () => void;
};

export default function ProvinceContextMenu({
  open,
  x,
  y,
  onClose,
  onColonize,
  onEditProvince,
}: ProvinceContextMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div
        className="absolute min-w-[180px] rounded-xl border border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl"
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
            onEditProvince();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-300 transition-colors"
        >
          Редактор провинции
        </button>
      </div>
    </div>
  );
}
