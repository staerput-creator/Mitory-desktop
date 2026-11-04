use serde_json::{json, Value};
use std::{fs, io::Write, path::Path, sync::Mutex};
use tauri::Manager;

static RECENTS_LOCK: Mutex<()> = Mutex::new(());
static STARTUP_FILE_LOCK: Mutex<Option<String>> = Mutex::new(None);

const MAX_BYTES: u64 = 256 * 1024 * 1024;
pub const STORY_FILTER_NAME: &str = "Mitory Story (*.mtrsb)";
pub const STORY_EXTENSIONS: &[&str] = &["mtrsb", "mitory.json", "story.json", "json"];

pub fn has_supported_story_extension(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".mtrsb")
        || lower.ends_with(".mitory.json")
        || lower.ends_with(".story.json")
        || lower.ends_with(".json")
}

pub fn set_startup_file(path: Option<String>) {
    if let Ok(mut guard) = STARTUP_FILE_LOCK.lock() {
        *guard = path;
    }
}

pub fn validate_story(content: &str) -> Result<Value, String> {
    if content.len() as u64 > MAX_BYTES {
        return Err("Project exceeds 256 MiB".into());
    }
    let value: Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
    let has_mtrsb_graph = value.get("graph").is_some_and(|graph| {
        graph.get("nodes").is_some_and(Value::is_array)
            && graph.get("edges").is_some_and(Value::is_array)
    });
    let has_legacy_root = value.get("nodes").is_some_and(Value::is_array)
        && value.get("edges").is_some_and(Value::is_array);
    if !has_mtrsb_graph && !has_legacy_root {
        return Err("Invalid story: graph.nodes/edges or nodes/edges arrays required".into());
    }
    Ok(value)
}

fn format_pretty_json(value: &Value) -> Result<String, String> {
    serde_json::to_string_pretty(value).map_err(|e| e.to_string())
}

fn read_story_from_disk(path: &Path) -> Result<Value, String> {
    if !has_supported_story_extension(&path.to_string_lossy()) {
        return Err("Expected .mtrsb, .mitory.json, .story.json or .json file".into());
    }
    if fs::metadata(path).map_err(|e| e.to_string())?.len() > MAX_BYTES {
        return Err("Project too large".into());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    validate_story(&content)
}
fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or("Absolute file path required")?;
    let mut temp = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temp.write_all(content).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    fs::File::open(parent)
        .and_then(|f| f.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub async fn get_startup_file() -> Result<Option<String>, String> {
    let mut guard = STARTUP_FILE_LOCK.lock().map_err(|e| e.to_string())?;
    Ok(guard.take())
}

#[tauri::command]
pub async fn open_story_file(
    app: tauri::AppHandle,
    file_path: Option<String>,
) -> Result<Option<Value>, String> {
    let path = if let Some(explicit_path) = file_path.filter(|path| !path.trim().is_empty()) {
        std::path::PathBuf::from(explicit_path)
    } else {
        let file = rfd::AsyncFileDialog::new()
            .add_filter(STORY_FILTER_NAME, STORY_EXTENSIONS)
            .pick_file()
            .await;
        let Some(file) = file else { return Ok(None) };
        file.path().to_path_buf()
    };
    let project = read_story_from_disk(&path)?;
    let file_path = path.to_string_lossy().into_owned();
    let _ = add_recent_project(app, file_path.clone()).await;
    Ok(Some(json!({"filePath": file_path, "project": project})))
}

#[tauri::command]
pub async fn save_story_file(
    app: tauri::AppHandle,
    file_path: String,
    json_content: String,
) -> Result<(), String> {
    let parsed = validate_story(&json_content)?;
    let pretty = format_pretty_json(&parsed)?;
    let path = Path::new(&file_path);
    if !path.is_absolute() || !has_supported_story_extension(&file_path) {
        return Err("Absolute .mtrsb, .mitory.json, .story.json or .json path required".into());
    }
    atomic_write(path, pretty.as_bytes())?;
    let _ = add_recent_project(app, file_path).await;
    Ok(())
}

#[tauri::command]
pub async fn save_story_file_as(
    app: tauri::AppHandle,
    default_name: Option<String>,
    json_content: String,
) -> Result<Option<String>, String> {
    let parsed = validate_story(&json_content)?;
    let fallback_title = parsed
        .pointer("/project/title")
        .and_then(Value::as_str)
        .or_else(|| parsed.pointer("/projectMeta/title").and_then(Value::as_str))
        .unwrap_or("project");
    let raw_name = default_name
        .as_deref()
        .and_then(|name| Path::new(name).file_name())
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(fallback_title);
    let mut name = raw_name.trim().to_owned();
    for extension in [".mitory.json", ".story.json", ".json", ".mtrsb"] {
        if name.to_lowercase().ends_with(extension) {
            name.truncate(name.len() - extension.len());
            break;
        }
    }
    if name.trim().is_empty() {
        name = "project".to_owned();
    }
    name.push_str(".mtrsb");

    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&name)
        .add_filter(STORY_FILTER_NAME, STORY_EXTENSIONS)
        .save_file()
        .await;
    let Some(file) = file else { return Ok(None) };
    let mut path = file.path().to_string_lossy().into_owned();
    if !has_supported_story_extension(&path) {
        path.push_str(".mtrsb");
    }
    save_story_file(app, path.clone(), json_content).await?;
    Ok(Some(path))
}
#[tauri::command]
pub async fn export_html_game(
    file_path: String,
    html_content: String,
) -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(
            Path::new(&file_path)
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("story.html"),
        )
        .add_filter("HTML game", &["html"])
        .save_file()
        .await;
    let Some(file) = file else { return Ok(None) };
    atomic_write(file.path(), html_content.as_bytes())?;
    Ok(Some(file.path().to_string_lossy().into_owned()))
}
fn recent_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("recent-projects.json"))
}
#[tauri::command]
pub async fn get_recent_projects(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let _guard = RECENTS_LOCK.lock().map_err(|e| e.to_string())?;
    let path = recent_path(&app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}
#[tauri::command]
pub async fn add_recent_project(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let canonical = match fs::canonicalize(&path) {
        Ok(p) => p.to_string_lossy().into_owned(),
        Err(_) => path,
    };
    let _guard = RECENTS_LOCK.lock().map_err(|e| e.to_string())?;
    let config = recent_path(&app)?;
    let mut paths: Vec<String> = if config.exists() {
        fs::read_to_string(&config)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        vec![]
    };
    paths.retain(|p| p != &canonical);
    paths.insert(0, canonical);
    paths.truncate(20);
    if let Ok(data) = serde_json::to_vec(&paths) {
        let _ = atomic_write(&config, &data);
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_overwrite_and_validation() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.mitory.json");
        atomic_write(&path, b"old").unwrap();
        atomic_write(&path, b"new").unwrap();
        assert_eq!(fs::read_to_string(path).unwrap(), "new");
        assert!(validate_story("{\"nodes\":[],\"edges\":[]}").is_ok());
        assert!(
            validate_story("{\"format\":\"mtrsb\",\"graph\":{\"nodes\":[],\"edges\":[]}}").is_ok()
        );
        assert!(validate_story("{}").is_err());
        assert!(has_supported_story_extension("story.mtrsb"));
        assert!(has_supported_story_extension("STORY.MITORY.JSON"));
    }
}
