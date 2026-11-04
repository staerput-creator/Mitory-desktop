mod commands;
use std::path::Path;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    Emitter, Manager,
};

fn extract_story_arg<I, S>(args: I) -> Option<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    for raw in args {
        let candidate = raw.as_ref().trim();
        if candidate.is_empty() || candidate.starts_with('-') {
            continue;
        }
        if commands::has_supported_story_extension(candidate) && Path::new(candidate).exists() {
            let resolved = std::fs::canonicalize(candidate)
                .map(|path| path.to_string_lossy().into_owned())
                .unwrap_or_else(|_| candidate.to_owned());
            return Some(resolved);
        }
    }
    None
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            if let Some(file_path) = extract_story_arg(argv.iter().skip(1)) {
                commands::set_startup_file(Some(file_path.clone()));
                let _ = app.emit("open-file", file_path);
            }
        }))
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let updater = tauri_plugin_updater::Builder::new().build();
                if let Err(err) = app.handle().plugin(updater) {
                    eprintln!("Warning: Failed to initialize tauri-plugin-updater: {err}");
                }
            }

            if let Some(arg_path) = std::env::args()
                .nth(1)
                .and_then(|arg| extract_story_arg([arg]))
                .or_else(|| extract_story_arg(std::env::args().skip(1)))
            {
                commands::set_startup_file(Some(arg_path.clone()));
                let _ = app.handle().emit("open-file", arg_path);
            }

            let file = Submenu::with_items(
                app,
                "Файл",
                true,
                &[
                    &MenuItem::with_id(app, "new", "Создать", true, Some("CmdOrCtrl+N"))?,
                    &MenuItem::with_id(app, "open", "Открыть…", true, Some("CmdOrCtrl+O"))?,
                    &MenuItem::with_id(app, "save", "Сохранить", true, Some("CmdOrCtrl+S"))?,
                    &MenuItem::with_id(
                        app,
                        "save-as",
                        "Сохранить как…",
                        true,
                        Some("CmdOrCtrl+Shift+S"),
                    )?,
                    &MenuItem::with_id(app, "export", "Экспорт HTML…", true, None::<&str>)?,
                ],
            )?;
            let edit = Submenu::with_items(
                app,
                "Правка",
                true,
                &[
                    &MenuItem::with_id(app, "undo", "Отмена", true, Some("CmdOrCtrl+Z"))?,
                    &MenuItem::with_id(app, "redo", "Повтор", true, Some("CmdOrCtrl+Shift+Z"))?,
                ],
            )?;
            let view = Submenu::with_items(
                app,
                "Вид",
                true,
                &[
                    &MenuItem::with_id(app, "dark", "Тёмная", true, None::<&str>)?,
                    &MenuItem::with_id(app, "light", "Светлая", true, None::<&str>)?,
                    &MenuItem::with_id(app, "soft", "Мягкая", true, None::<&str>)?,
                    &MenuItem::with_id(app, "zoom-in", "Приблизить", true, Some("CmdOrCtrl+Plus"))?,
                    &MenuItem::with_id(app, "zoom-out", "Отдалить", true, Some("CmdOrCtrl+-"))?,
                ],
            )?;
            app.set_menu(Menu::with_items(app, &[&file, &edit, &view])?)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("desktop-menu", event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_startup_file,
            commands::open_story_file,
            commands::save_story_file,
            commands::save_story_file_as,
            commands::export_html_game,
            commands::get_recent_projects,
            commands::add_recent_project
        ])
        .run(tauri::generate_context!())
        .expect("Mitory runtime failed");
}
