mod commands;

use tauri::Manager;
#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::{AppHandleExt as _, StateFlags};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // single-instance must be registered first: on Windows/Linux the OS spawns a *new* process
    // for a warm nxm:// click, and this plugin's `deep-link` feature is what redirects that
    // process's argv into the already-running instance's deep-link event instead of opening a
    // second window.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Restores window size/position/maximized/monitor on the next launch and saves on
        // move/resize/close, keyed by window label — no app-side code needed.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| {
            // The `tauri.conf.json` scheme declaration only reaches the OS via the bundled
            // installer (NSIS/MSI). A `tauri dev` build, or an app run without going through
            // that installer, never gets `nxm://` associated with this exe otherwise — so
            // nxm:// links silently do nothing, the app is never even launched. Register it
            // ourselves at startup instead; writing the same registry keys/desktop file again
            // on every launch is a harmless no-op.
            #[cfg(any(windows, target_os = "linux"))]
            {
                _app.deep_link().register_all()?;
            }

            // tauri-plugin-window-state only flushes its in-memory cache to disk on a graceful
            // `RunEvent::Exit` — a `tauri dev` rebuild or any hard process kill skips that, so
            // the saved geometry silently never updates. Persist immediately on close-request
            // too, so the file on disk is current the moment the user (or dev tooling) closes
            // the window, not just on a clean shutdown.
            if let Some(window) = _app.get_webview_window("main") {
                let handle = _app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        let _ = handle.save_window_state(StateFlags::all());
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_steam_path,
            commands::is_process_running,
            commands::grant_game_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
