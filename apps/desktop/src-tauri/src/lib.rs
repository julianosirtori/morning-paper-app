//! Morning Paper — lado nativo.
//!
//! - Ícone na barra de menus (tray) com o mesmo menu do protótipo.
//! - Fechar a janela sem encerrar o app ("Continuar rodando ao fechar a janela").
//! - Com a janela fechada, o app sai do Dock e fica só na barra de menus.
//! - Ocultar do Dock sempre, abrir ao iniciar o Mac (plugin autostart).
//! - Impressoras reais via CUPS (`lpstat`) e diálogo de impressão nativo.
//! - Detecção dos assistentes de IA de linha de comando no PATH do usuário.

mod ai;
mod feeds;
mod pdf;
mod scheduler;
mod storage;
mod system;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, RunEvent, WindowEvent, Wry,
};

const TRAY_ID: &str = "main-tray";

#[derive(Default)]
struct AppState {
    keep_running: AtomicBool,
    /// Ícone na barra de menus visível.
    show_tray: AtomicBool,
    /// "Ocultar do Dock" mesmo com a janela aberta.
    hide_dock: AtomicBool,
    tray_items: Mutex<Option<TrayItems>>,
}

struct TrayItems {
    title: MenuItem<Wry>,
    detail: MenuItem<Wry>,
    open: MenuItem<Wry>,
    print: MenuItem<Wry>,
    generate: MenuItem<Wry>,
    pause: MenuItem<Wry>,
    prefs: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

/// Textos do menu da barra de menus, já traduzidos pelo React.
#[derive(serde::Deserialize)]
struct TrayTexts {
    title: String,
    detail: String,
    open: String,
    print: String,
    generate: String,
    pause: String,
    prefs: String,
    quit: String,
}

/// O ícone do Dock aparece só com a janela aberta. Com ela fechada (ou com "Ocultar do Dock"),
/// o app fica só na barra de menus — a não ser que o ícone de lá esteja desligado, para não sumir de vez.
fn update_dock(app: &AppHandle, window_visible: bool) {
    #[cfg(target_os = "macos")]
    {
        let state = app.state::<AppState>();
        let tray = state.show_tray.load(Ordering::Relaxed);
        let hide = tray && (state.hide_dock.load(Ordering::Relaxed) || !window_visible);
        let _ = app.set_activation_policy(if hide {
            tauri::ActivationPolicy::Accessory
        } else {
            tauri::ActivationPolicy::Regular
        });
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, window_visible);
}

fn show_main(app: &AppHandle) {
    update_dock(app, true);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/* ---------- Comandos chamados pelo React ---------- */

#[tauri::command]
async fn detect_agents() -> std::collections::HashMap<String, Option<String>> {
    tauri::async_runtime::spawn_blocking(system::detect_agents)
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn list_printers() -> Vec<system::Printer> {
    tauri::async_runtime::spawn_blocking(system::list_printers)
        .await
        .unwrap_or_default()
}

/// Abre o diálogo de impressão do macOS para a página atual (o CSS de impressão mostra só o jornal).
#[tauri::command]
async fn print_window(
    window: tauri::WebviewWindow,
    printer: Option<String>,
    printer_name: Option<String>,
) -> Result<(), String> {
    // Preto e branco + rascunho já marcados no diálogo, se a impressora tiver essas opções.
    let options = match printer.as_deref() {
        Some(id) => {
            let id = id.to_string();
            tauri::async_runtime::spawn_blocking(move || system::bw_draft_options(&id))
                .await
                .unwrap_or_default()
        }
        None => Vec::new(),
    };
    // O NSPrinter procura pelo nome de exibição; a fila do CUPS (id) fica de reserva.
    pdf::print_dialog(window, [printer_name, printer].into_iter().flatten().collect(), options)
}

#[tauri::command]
fn set_background(
    app: AppHandle,
    keep_running: bool,
    show_tray: bool,
    hide_dock: bool,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    state.keep_running.store(keep_running, Ordering::Relaxed);
    state.show_tray.store(show_tray, Ordering::Relaxed);
    state.hide_dock.store(hide_dock, Ordering::Relaxed);
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_visible(show_tray).map_err(|e| e.to_string())?;
    }
    let visible = app
        .get_webview_window("main")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    update_dock(&app, visible);
    Ok(())
}

/// Exporta a página atual para PDF (sem diálogo) — usado pela entrega automática.
#[tauri::command]
async fn export_pdf(window: tauri::WebviewWindow, path: String) -> Result<(), String> {
    pdf::export_pdf(window, path).await
}

/// Imprime um PDF já gerado na impressora indicada, sem diálogo.
#[tauri::command]
async fn print_pdf(path: String, printer: String, copies: u32) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || pdf::print_file(&path, &printer, copies))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn fetch_feeds(feeds: Vec<feeds::FeedRequest>) -> Vec<feeds::FeedResult> {
    feeds::fetch_all(feeds).await
}

#[tauri::command]
async fn run_agent(agent: String, path: String, prompt: String) -> Result<String, String> {
    ai::run(&agent, &path, &prompt).await
}

#[tauri::command]
fn save_edition(app: AppHandle, n: u32, json: String) -> Result<(), String> {
    storage::save_edition(&app, n, &json)
}

#[tauri::command]
fn list_editions(app: AppHandle) -> Result<Vec<String>, String> {
    storage::list_editions(&app)
}

#[tauri::command]
fn pdf_path(app: AppHandle, file_name: String) -> Result<String, String> {
    storage::pdf_path(&app, &file_name)
}

#[tauri::command]
fn set_schedule(app: AppHandle, schedule: scheduler::Schedule) {
    *app.state::<scheduler::SchedulerState>().0.lock().unwrap() = Some(schedule);
}

#[tauri::command]
async fn set_wake(enabled: bool, time: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || system::set_wake(enabled, &time))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
fn system_locale() -> String {
    system::system_locale()
}

#[tauri::command]
fn set_tray_texts(app: AppHandle, texts: TrayTexts) -> Result<(), String> {
    let state = app.state::<AppState>();
    let guard = state.tray_items.lock().map_err(|e| e.to_string())?;
    if let Some(items) = guard.as_ref() {
        let pairs = [
            (&items.title, texts.title),
            (&items.detail, texts.detail),
            (&items.open, texts.open),
            (&items.print, texts.print),
            (&items.generate, texts.generate),
            (&items.pause, texts.pause),
            (&items.prefs, texts.prefs),
            (&items.quit, texts.quit),
        ];
        for (item, text) in pairs {
            item.set_text(text).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/* ---------- Barra de menus ---------- */

/// Rótulos iniciais (antes de o React mandar os textos traduzidos), no idioma do Mac.
fn initial_tray_labels() -> [&'static str; 7] {
    if system::system_locale().to_lowercase().starts_with("pt") {
        [
            "Morning Paper",
            "Abrir Morning Paper",
            "Imprimir edição de hoje",
            "Gerar nova edição agora",
            "Pausar até amanhã",
            "Preferências…",
            "Sair do Morning Paper",
        ]
    } else {
        [
            "Morning Paper",
            "Open Morning Paper",
            "Print today's edition",
            "Generate a new edition now",
            "Pause until tomorrow",
            "Preferences…",
            "Quit Morning Paper",
        ]
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let [l_title, l_open, l_print, l_generate, l_pause, l_prefs, l_quit] = initial_tray_labels();
    let item = |id: &str, text: &str, enabled: bool, accel: Option<&str>| {
        MenuItem::with_id(app, id, text, enabled, accel)
    };
    let title = item("title", l_title, false, None)?;
    let detail = item("detail", "", false, None)?;
    let open = item("open", l_open, true, Some("CmdOrCtrl+O"))?;
    let print = item("print", l_print, true, Some("CmdOrCtrl+P"))?;
    let generate = item("generate", l_generate, true, None)?;
    let pause = item("pause", l_pause, true, None)?;
    let prefs = item("prefs", l_prefs, true, Some("CmdOrCtrl+,"))?;
    let quit = item("quit", l_quit, true, Some("CmdOrCtrl+Q"))?;
    let sep = || PredefinedMenuItem::separator(app);

    let menu = Menu::with_items(
        app,
        &[
            &title,
            &detail,
            &sep()?,
            &open,
            &print,
            &generate,
            &sep()?,
            &pause,
            &prefs,
            &sep()?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("Morning Paper")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "quit" => app.exit(0),
                "open" | "print" | "prefs" => {
                    show_main(app);
                    let _ = app.emit("tray-action", id);
                }
                "generate" | "pause" => {
                    let _ = app.emit("tray-action", id);
                }
                _ => {}
            }
        })
        .build(app)?;

    *app.state::<AppState>().tray_items.lock().unwrap() = Some(TrayItems {
        title,
        detail,
        open,
        print,
        generate,
        pause,
        prefs,
        quit,
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .manage(scheduler::SchedulerState::default())
        .manage(AppState {
            keep_running: AtomicBool::new(true),
            show_tray: AtomicBool::new(true),
            ..Default::default()
        })
        .invoke_handler(tauri::generate_handler![
            detect_agents,
            list_printers,
            print_window,
            set_background,
            set_tray_texts,
            system_locale,
            export_pdf,
            print_pdf,
            fetch_feeds,
            run_agent,
            save_edition,
            list_editions,
            pdf_path,
            set_schedule,
            set_wake,
            show_main_window
        ])
        .setup(|app| {
            build_tray(app.handle())?;
            pdf::debug_on_start(app.handle());
            scheduler::start(app.handle().clone());
            // Iniciado pelo login do Mac: começa discretamente, sem abrir a janela.
            if std::env::args().any(|a| a == "--hidden") {
                update_dock(app.handle(), false);
            } else {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let keep = window
                    .app_handle()
                    .state::<AppState>()
                    .keep_running
                    .load(Ordering::Relaxed);
                if keep {
                    api.prevent_close();
                    let _ = window.hide();
                    update_dock(window.app_handle(), false);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("erro ao iniciar o Morning Paper");

    app.run(|_app, _event| {
        // Clique no ícone do Dock com a janela escondida: mostra de novo.
        #[cfg(target_os = "macos")]
        if let RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = _event
        {
            show_main(_app);
        }
    });
}
