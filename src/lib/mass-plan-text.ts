import type { MassElement, TextModuleStyle } from "@/components/plan-rayon/mass-plan/mass-plan-types";

const TEXT_MODULE_PREFIX = "__mass_text__:";

export const DEFAULT_TEXT_MODULE_STYLE: TextModuleStyle = {
  fontFamily: "dm-sans",
  fontSize: 18,
  fontWeight: 700,
  textAlign: "center",
  bulletMode: false,
  textColor: "#1f2b4d",
  borderColor: "#cbd5e1",
  backgroundColor: "#ffffff",
  borderStyle: "dashed",
  lineHeight: 1.35,
  padding: 14,
};

type EncodedTextModule = {
  content?: string;
  style?: Partial<TextModuleStyle>;
};

export function getDefaultTextModuleStyle(overrides?: Partial<TextModuleStyle>): TextModuleStyle {
  return {
    ...DEFAULT_TEXT_MODULE_STYLE,
    ...overrides,
  };
}

export function parseTextModule(label: string | null, fallbackColor?: string | null) {
  const fallbackTextColor = fallbackColor ?? DEFAULT_TEXT_MODULE_STYLE.textColor;
  if (!label) {
    return {
      content: "Texte",
      style: getDefaultTextModuleStyle({ textColor: fallbackTextColor }),
    };
  }

  if (!label.startsWith(TEXT_MODULE_PREFIX)) {
    return {
      content: label,
      style: getDefaultTextModuleStyle({
        textColor: fallbackTextColor,
        borderColor: fallbackTextColor,
      }),
    };
  }

  try {
    const parsed = JSON.parse(label.slice(TEXT_MODULE_PREFIX.length)) as EncodedTextModule;
    return {
      content: typeof parsed.content === "string" && parsed.content.trim() ? parsed.content : "Texte",
      style: getDefaultTextModuleStyle(parsed.style),
    };
  } catch {
    return {
      content: "Texte",
      style: getDefaultTextModuleStyle({ textColor: fallbackTextColor }),
    };
  }
}

export function encodeTextModule(content: string | null, style?: Partial<TextModuleStyle> | null) {
  return `${TEXT_MODULE_PREFIX}${JSON.stringify({
    content: content ?? "Texte",
    style: getDefaultTextModuleStyle(style ?? undefined),
  })}`;
}

export function getTextModuleStyle(element: Pick<MassElement, "element_type" | "text_style" | "color">) {
  if (element.element_type !== "text") return null;
  return getDefaultTextModuleStyle({
    textColor: element.color ?? DEFAULT_TEXT_MODULE_STYLE.textColor,
    ...(element.text_style ?? {}),
  });
}

export function getTextModuleFontFamily(fontFamily: TextModuleStyle["fontFamily"]) {
  if (fontFamily === "fraunces") return "var(--font-fraunces), serif";
  if (fontFamily === "geist-sans") return "var(--font-geist-sans), sans-serif";
  if (fontFamily === "geist-mono") return "var(--font-geist-mono), monospace";
  return "var(--font-dm-sans), sans-serif";
}
