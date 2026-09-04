fn main() {
    println!("cargo:rerun-if-changed=../package.json");
    tauri_build::build()
}
