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

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 });

if (error) {
  throw error;
}

const collabs = data.users.filter((user) => user.email?.endsWith("@ep.fr"));

console.log(`${collabs.length} collaborateurs trouvés`);

for (const user of collabs) {
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: "000000",
  });

  console.log(updateError ? `ECHEC ${user.email}: ${updateError.message}` : `OK ${user.email}`);
}
