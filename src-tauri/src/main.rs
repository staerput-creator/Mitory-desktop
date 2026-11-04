#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::Write;

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let mut targets = Vec::new();

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                targets.push(parent.join("mitory_crash.log"));
            }
        }
        if let Ok(temp_dir) = std::env::var("TEMP") {
            targets.push(std::path::PathBuf::from(temp_dir).join("mitory_crash.log"));
        }
        targets.push(std::path::PathBuf::from("mitory_crash.log"));

        for target in targets {
            if let Ok(mut file) = File::create(target) {
                let _ = writeln!(file, "=== MITORY CRASH REPORT ===");
                let _ = writeln!(file, "TIMESTAMP: {:?}", std::time::SystemTime::now());
                let _ = writeln!(file, "PANIC INFO: {:?}", info);
                break;
            }
        }
    }));

    mitory_lib::run();
}
