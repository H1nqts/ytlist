import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = join(root, "src-tauri", "Cargo.toml")
const lockfile = join(root, "src-tauri", "Cargo.lock")
const pkgbuild = join(root, "packaging", "arch", "PKGBUILD")

const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
)

function sync(path, pattern, replacement) {
  const before = readFileSync(path, "utf8")
  const after = before.replace(pattern, replacement)

  if (after === before) return false

  writeFileSync(path, after)
  return true
}

const staged = []

if (sync(manifest, /^(version = ")[^"]*(")/m, `$1${version}$2`)) {
  execFileSync(
    "cargo",
    ["metadata", "--manifest-path", manifest, "--format-version", "1"],
    { stdio: ["ignore", "ignore", "inherit"] }
  )
  staged.push(manifest, lockfile)
}

if (sync(pkgbuild, /^(pkgver=).*$/m, `$1${version}`)) {
  staged.push(pkgbuild)
}

if (staged.length === 0) {
  console.log(`Everything is already ${version}`)
  process.exit(0)
}

execFileSync("git", ["add", ...staged], { stdio: "inherit" })

console.log(`Synced the version to ${version}`)
