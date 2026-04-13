"use client";

import { ALL_MODULES, type ModuleAccessKey } from "@/lib/modules-config";

type ModuleSelectorProps = {
  selectedModules: ModuleAccessKey[];
  onChange: (modules: ModuleAccessKey[]) => void;
  disabled?: boolean;
};

const MODULE_COLORS: Record<ModuleAccessKey, string> = {
  planning: "#1d5fa0",
  ruptures: "#D40511",
  absences: "#16a34a",
  infos: "#2563eb",
  rh: "#0f766e",
  balisage: "#0f9f6e",
  plateau: "#c05a0c",
  plan_tg: "#b91c1c",
  exports: "#475569",
};

export function ModuleSelector({ selectedModules, onChange, disabled = false }: ModuleSelectorProps) {
  const toggleModule = (moduleKey: ModuleAccessKey) => {
    if (disabled) return;

    if (selectedModules.includes(moduleKey)) {
      onChange(selectedModules.filter((item) => item !== moduleKey));
      return;
    }

    onChange([...selectedModules, moduleKey]);
  };

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontWeight: 600,
          display: "block",
          marginBottom: 8,
        }}
      >
        Modules autorisés
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {ALL_MODULES.map((moduleItem) => {
          const active = selectedModules.includes(moduleItem.key);
          const color = MODULE_COLORS[moduleItem.key];

          return (
            <label
              key={moduleItem.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${active ? color : "#dbe3eb"}`,
                background: active ? `${color}12` : "#fafafa",
                cursor: disabled ? "default" : "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleModule(moduleItem.key)}
                disabled={disabled}
                style={{ accentColor: color }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{moduleItem.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
