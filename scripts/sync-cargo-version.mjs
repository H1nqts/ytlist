import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = join(root, "src-tauri", "Cargo.toml")
const lockfile = join(root, "src-tauri", "Cargo.lock")

const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
)

const before = readFileSync(manifest, "utf8")
const after = before.replace(/^(version = ")[^"]*(")/m, `$1${version}$2`)

if (after === before) {
  console.log(`Cargo.toml is already ${version}`)
  process.exit(0)
}

writeFileSync(manifest, after)

execFileSync(
  "cargo",
  ["metadata", "--manifest-path", manifest, "--format-version", "1"],
  { stdio: ["ignore", "ignore", "inherit"] }
)

execFileSync("git", ["add", manifest, lockfile], { stdio: "inherit" })

console.log(`Synced the Rust crate version to ${version}`)
