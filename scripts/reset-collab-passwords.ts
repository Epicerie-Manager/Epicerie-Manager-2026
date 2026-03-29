import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllUsers() {
  const users: Array<{ id: string; email?: string | null }> = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data.users.map((user) => ({
      id: user.id,
      email: user.email,
    }));

    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function resetAllCollabPasswords() {
  console.log("Recherche des comptes collaborateurs @ep.fr...");

  const users = await listAllUsers();
  const collabs = users.filter((user) => user.email?.toLowerCase().endsWith("@ep.fr"));

  if (!collabs.length) {
    console.log("Aucun compte collaborateur @ep.fr trouvé.");
    return;
  }

  console.log(`${collabs.length} compte(s) collaborateur(s) trouvé(s).`);

  for (const user of collabs) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: "0000",
    });

    if (error) {
      console.error(`Erreur reset ${user.email ?? user.id}:`, error.message);
      continue;
    }

    console.log(`Reset OK: ${user.email ?? user.id}`);
  }
}

resetAllCollabPasswords().catch((error) => {
  console.error("Echec du reset des mots de passe collaborateurs:", error);
  process.exit(1);
});
