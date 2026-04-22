"use client";

import {
  ALL_MODULES,
  type ModuleAccessKey,
  type ModulePermissionLevel,
  type ModulePermissions,
} from "@/lib/modules-config";

type ModuleSelectorProps = {
  value: ModulePermissions;
  onChange: (modules: ModulePermissions) => void;
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
  plan_rayon: "#0a4f98",
  exports: "#475569",
};

const PERMISSION_OPTIONS: Array<{ value: ModulePermissionLevel; label: string }> = [
  { value: "read", label: "Lecture" },
  { value: "write", label: "Ecriture" },
];

export function ModuleSelector({ value, onChange, disabled = false }: ModuleSelectorProps) {
  const updatePermission = (moduleKey: ModuleAccessKey, nextValue: ModulePermissionLevel | null) => {
    if (disabled) return;
    if (nextValue === null) {
      const nextPermissions = { ...value };
      delete nextPermissions[moduleKey];
      onChange(nextPermissions);
      return;
    }
    onChange({
      ...value,
      [moduleKey]: nextValue,
    });
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
          const permission = value[moduleItem.key] ?? null;
          const active = permission !== null;
          const color = MODULE_COLORS[moduleItem.key];

          return (
            <div
              key={moduleItem.key}
              style={{
                display: "grid",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${active ? color : "#dbe3eb"}`,
                background: active ? `${color}12` : "#fafafa",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{moduleItem.label}</span>
                <button
                  type="button"
                  onClick={() => updatePermission(moduleItem.key, null)}
                  disabled={disabled || !active}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: active ? "#64748b" : "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: disabled || !active ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  Aucun
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PERMISSION_OPTIONS.map((option) => {
                  const selected = permission === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePermission(moduleItem.key, option.value)}
                      disabled={disabled}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: `1px solid ${selected ? color : "#dbe3eb"}`,
                        background: selected ? `${color}18` : "#ffffff",
                        color: selected ? color : "#475569",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: disabled ? "default" : "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
