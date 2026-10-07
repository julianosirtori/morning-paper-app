import clsx from "clsx";

type Props = { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void };

/** Linha de preferência com interruptor à direita. */
export function SwitchRow({ label, description, checked, disabled, onChange }: Props) {
  return (
    <label className="flex items-start justify-between gap-4 py-2">
      <span>
        <span className={clsx("block font-semibold", disabled && "text-muted")}>{label}</span>
        <span className="block text-13 text-muted">{description}</span>
      </span>
      <input type="checkbox" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
