/**
 * Provision a new client instance.
 *
 *   pnpm new-client <slug> [name]
 *
 * One client = one database. This creates the client's Postgres database, runs
 * the migrations against it, seeds the Client row plus an admin user, and prints
 * the env block to deploy that instance with. Never spans clients.
 */
import { execSync } from "node:child_process";
import os from "node:os";

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const slug = process.argv[2];
const name = process.argv[3] ?? slug;

if (!slug) fail("Usage: pnpm new-client <slug> [name]");
if (!/^[a-z0-9-]+$/.test(slug)) {
  fail("Slug must be lowercase letters, digits, and hyphens only.");
}

const dbName = `qa_${slug.replace(/-/g, "_")}`;
const pgUser = process.env.PGUSER ?? os.userInfo().username;
const pgHost = process.env.PGHOST ?? "localhost";
const pgPort = process.env.PGPORT ?? "5432";
const databaseUrl = `postgresql://${pgUser}@${pgHost}:${pgPort}/${dbName}`;
const basePath = `/app-${slug}`;

console.log(`\n▸ Provisioning client "${slug}" (db: ${dbName})`);

// 1. Create the database (ignore "already exists").
try {
  execSync(`createdb -h ${pgHost} -p ${pgPort} -U ${pgUser} ${dbName}`, {
    stdio: "pipe",
  });
  console.log(`  ✓ created database ${dbName}`);
} catch (err) {
  const out = String((err as { stderr?: Buffer }).stderr ?? err);
  if (out.includes("already exists")) {
    console.log(`  • database ${dbName} already exists — reusing`);
  } else {
    fail(`Failed to create database:\n${out}`);
  }
}

// 2. Apply migrations to that database.
console.log("  ▸ applying migrations…");
execSync("pnpm prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

// 3. Seed the client + an admin user.
async function seed() {
  process.env.DATABASE_URL = databaseUrl;
  const { prisma } = await import("@qa/store");

  const client = await prisma.client.upsert({
    where: { slug },
    update: { name: name! },
    create: { slug, name: name! },
  });

  await prisma.user.upsert({
    where: { email: `admin@${slug}.example` },
    update: {},
    create: {
      email: `admin@${slug}.example`,
      role: "admin",
      clientId: client.id,
    },
  });

  await prisma.$disconnect();
  console.log(`  ✓ seeded Client "${name}" + admin user`);
}

seed()
  .then(() => {
    console.log(`\n✓ Client "${slug}" is ready. Deploy this instance with:\n`);
    console.log(`  CLIENT_SLUG=${slug}`);
    console.log(`  DATABASE_URL=${databaseUrl}`);
    console.log(`  APP_BASE_PATH=${basePath}\n`);
  })
  .catch((err) => fail(String(err)));
