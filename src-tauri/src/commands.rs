use std::path::PathBuf;

use sysinfo::System;
use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

/// Reads Steam's install root from the registry. No official Tauri plugin can do this — it's
/// the one Steam-location primitive `plugin-fs` can't reach on its own.
#[tauri::command]
pub fn read_steam_path() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        use winreg::RegKey;

        // HKCU\...\SteamPath is only populated after a user has logged into the client at least
        // once; HKLM\...\InstallPath is the installer-set value and is the more universal
        // fallback (this is what most third-party Steam-detection tools check first, in fact —
        // kept second here only because SteamPath already reflects the actual active install
        // when both exist and could differ on a multi-user machine).
        let hkcu_result = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey("Software\\Valve\\Steam")
            .and_then(|key| key.get_value::<String, _>("SteamPath"));
        if let Ok(path) = hkcu_result {
            return Ok(path);
        }

        let hklm_result = RegKey::predef(HKEY_LOCAL_MACHINE)
            .open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam")
            .or_else(|_| RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey("SOFTWARE\\Valve\\Steam"))
            .and_then(|key| key.get_value::<String, _>("InstallPath"));
        hklm_result.map_err(|e| {
            format!("Steam install path not found in registry (checked HKCU SteamPath and HKLM InstallPath): {e}")
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("read_steam_path is only implemented for Windows".into())
    }
}

/// Checks whether a process with the given executable name (e.g. "Cairn.exe") is currently
/// running. `plugin-process` only covers this app's own lifecycle, not external processes.
#[tauri::command]
pub fn is_process_running(process_name: String) -> bool {
    let mut system = System::new();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let needle = process_name.to_lowercase();
    system.processes().values().any(|p| {
        p.name()
            .to_string_lossy()
            .to_lowercase()
            == needle
    })
}

/// Grows the fs plugin's runtime scope to include a user-picked game directory. Static
/// capability scope can't enumerate a path the user hasn't chosen yet; `plugin-persisted-scope`
/// then makes this grant survive app restarts so the user isn't re-prompted every launch.
#[tauri::command]
pub fn grant_game_dir(app: AppHandle, path: String) -> Result<(), String> {
    let scope = app.fs_scope();
    scope
        .allow_directory(PathBuf::from(path), true)
        .map_err(|e| e.to_string())
}
