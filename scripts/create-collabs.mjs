import { createClient } from "@supabase/supabase-js";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LEGACY;

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY_LEGACY manquante");
}

const supabase = createClient(
  "https://rdngzjonahxqcigufmmf.supabase.co",
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const collabs = [
  { email: "abdou@ep.fr", name: "ABDOU" },
  { email: "achraf@ep.fr", name: "ACHRAF" },
  { email: "cecile@ep.fr", name: "CECILE" },
  { email: "dilaxshan@ep.fr", name: "DILAXSHAN" },
  { email: "el-hassane@ep.fr", name: "EL HASSANE" },
  { email: "florian@ep.fr", name: "FLORIAN" },
  { email: "jamaa@ep.fr", name: "JAMAA" },
  { email: "jeremy@ep.fr", name: "JEREMY" },
  { email: "kamel@ep.fr", name: "KAMEL" },
  { email: "khanh@ep.fr", name: "KHANH" },
  { email: "liyakath@ep.fr", name: "LIYAKATH" },
  { email: "mahin@ep.fr", name: "MAHIN" },
  { email: "massimo@ep.fr", name: "MASSIMO" },
  { email: "mohamed@ep.fr", name: "MOHAMED" },
  { email: "mohcine@ep.fr", name: "MOHCINE" },
  { email: "mounir@ep.fr", name: "MOUNIR" },
  { email: "pascale@ep.fr", name: "PASCALE" },
  { email: "rosalie@ep.fr", name: "ROSALIE" },
  { email: "wasim@ep.fr", name: "WASIM" },
  { email: "yleana@ep.fr", name: "YLEANA" },
];

for (const collab of collabs) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: collab.email,
    password: "0000",
    email_confirm: true,
    user_metadata: { name: collab.name },
  });

  console.log(error ? `ECHEC ${collab.email}: ${error.message}` : `OK ${collab.email}: ${data.user.id}`);
}
