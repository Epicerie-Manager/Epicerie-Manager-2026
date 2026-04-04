export type AppVariant = "office" | "manager";

export function getAppVariant(): AppVariant {
  return process.env.NEXT_PUBLIC_APP_VARIANT === "manager" ? "manager" : "office";
}

export function isManagerProject() {
  return getAppVariant() === "manager";
}
