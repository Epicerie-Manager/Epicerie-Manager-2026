import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rdngzjonahxqcigufmmf.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY_LEGACY,
);

const { error } = await supabase.auth.admin.updateUserById(
  "a1cbec69-17e8-49af-8724-daa88ade5f55",
  { password: "000000" },
);

console.log(error ? `❌ ${error.message}` : "✅ PIN ABDOU réinitialisé à 000000");
