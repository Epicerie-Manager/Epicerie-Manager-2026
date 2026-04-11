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
  const users: Array<{ id: string; email?: string | null; created_at?: string }> = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const batch = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    }));

    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function run() {
  const projectHost = new URL(supabaseUrl as string).host;
  console.log("Projet Supabase cible:", projectHost);

  const users = await listAllUsers();
  console.log("Nombre total d'utilisateurs Auth:", users.length);

  const sampleEmails = users
    .map((user) => user.email)
    .filter(Boolean)
    .slice(0, 20);

  console.log("Premiers emails remontés:", sampleEmails);

  const epUsers = users.filter((user) => user.email?.toLowerCase().endsWith("@ep.fr"));
  console.log("Nombre d'utilisateurs @ep.fr:", epUsers.length);

  if (epUsers.length) {
    console.log(
      "Emails @ep.fr trouvés:",
      epUsers.map((user) => user.email),
    );
  }

  const abdou = users.find((user) => user.email?.toLowerCase() === "abdou@ep.fr");
  console.log("Recherche ciblée abdou@ep.fr:", abdou ?? "INTROUVABLE");
}

run().catch((error) => {
  console.error("Echec du diagnostic Auth collaborateur:", error);
  process.exit(1);
});
