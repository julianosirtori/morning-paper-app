//! Exporta a página atual do WebView para PDF (A4, usando o CSS @media print) sem abrir diálogo,
//! e envia arquivos PDF para a impressora com `lp`. Usado pela entrega automática das 06:00.
//!
//! macOS: usa `-[WKWebView printOperationWithPrintInfo:]` com `NSPrintSaveJob` (salva em arquivo),
//! sem painel de impressão nem de progresso. O `runOperation` síncrono gera páginas em branco no
//! WKWebView, então usamos `runOperationModalForWindow:delegate:didRunSelector:contextInfo:` e
//! esperamos o callback do delegate (com timeout). Como os painéis estão desligados, nada aparece
//! na tela — e funciona também com a janela oculta (`window.hide()`).

use tauri::{AppHandle, Manager, WebviewWindow};

/// Tempo máximo de espera pela geração do PDF.
const EXPORT_TIMEOUT_SECS: u64 = 30;

/// Gera um PDF paginado (A4, sem margens) do conteúdo atual do WebView em `path`.
pub async fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        macos::export_pdf(window, path).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, path);
        Err("export_pdf só é suportado no macOS".into())
    }
}

/// Abre o diálogo de impressão do macOS para as folhas da edição: A4 sem margens, já em preto e branco
/// e rascunho (`options`, do PPD). A pessoa ainda pode mudar tudo no diálogo.
pub fn print_dialog(window: WebviewWindow, printer_names: Vec<String>, options: Vec<(String, String)>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        window
            .with_webview(move |wv| {
                // SAFETY: with_webview roda na main thread com o WKWebView e o NSWindow desta janela.
                if let Err(e) = unsafe { macos::start_dialog(wv.inner(), wv.ns_window(), &printer_names, &options) } {
                    eprintln!("[print] {e}");
                }
            })
            .map_err(|e| format!("with_webview falhou: {e}"))
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (printer_names, options);
        window.print().map_err(|e| e.to_string())
    }
}

/// Envia um PDF para a fila do CUPS (`lp -d <printer> -n <copies>`), em preto e branco e rascunho
/// (como o preset "Black and White – Draft" do macOS) quando a impressora tem essas opções.
pub fn print_file(path: &str, printer: &str, copies: u32) -> Result<(), String> {
    let mut cmd = std::process::Command::new("/usr/bin/lp");
    cmd.arg("-d").arg(printer).arg("-n").arg(copies.max(1).to_string());
    for (key, value) in crate::system::bw_draft_options(printer) {
        cmd.arg("-o").arg(format!("{key}={value}"));
    }
    // Equivalentes IPP, para impressoras sem PPD (AirPrint/IPP Everywhere); as outras ignoram.
    cmd.arg("-o").arg("print-color-mode=monochrome").arg("-o").arg("print-quality=3");
    let output = cmd
        .arg(path)
        .output()
        .map_err(|e| format!("falha ao executar lp: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            format!("lp falhou ({})", output.status)
        } else {
            stderr
        })
    }
}

/// Só para desenvolvimento: com MP_PDF_TEST=/caminho/arquivo.pdf, exporta o PDF alguns segundos após abrir.
/// Com MP_PDF_TEST_HIDE=1, oculta a janela antes de exportar (testa a entrega em segundo plano).
pub fn debug_on_start(app: &AppHandle) {
    let Ok(path) = std::env::var("MP_PDF_TEST") else {
        return;
    };
    if path.trim().is_empty() {
        return;
    }
    let hide = std::env::var("MP_PDF_TEST_HIDE").is_ok_and(|v| !v.is_empty() && v != "0");
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(6)).await;
        let Some(window) = app.get_webview_window("main") else {
            eprintln!("[pdf-test] janela 'main' não encontrada");
            return;
        };
        if let Ok(height) = std::env::var("MP_PDF_TEST_SAMPLE") {
            // Substitui a página por 3 folhas de teste conhecidas (só para validar o mecanismo).
            let height = if height.trim().is_empty() {
                "297mm".to_string()
            } else {
                height
            };
            let js = format!(
                "document.head.innerHTML='<style>@page{{size:A4;margin:0}}html,body{{margin:0;padding:0}}\
                 .p{{width:210mm;height:{height};box-sizing:border-box;padding:20mm;font:24pt serif;\
                 break-after:page;background:#eee;overflow:hidden}}.p:last-child{{break-after:auto}}</style>';\
                 document.body.innerHTML=[1,2,3].map(i=>'<div class=p>Página de teste '+i+'</div>').join('');"
            );
            let _ = window.eval(js);
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
        if hide {
            if let Err(e) = window.hide() {
                eprintln!("[pdf-test] falha ao ocultar janela: {e}");
            }
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
        let started = std::time::Instant::now();
        match export_pdf(window, path.clone()).await {
            Ok(()) => eprintln!(
                "[pdf-test] PDF exportado em {path} ({} ms, janela oculta: {hide})",
                started.elapsed().as_millis()
            ),
            Err(e) => eprintln!("[pdf-test] falha ao exportar PDF: {e}"),
        }
    });
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::c_void;
    use std::time::Duration;

    use objc2::rc::Retained;
    use objc2::runtime::{AnyObject, Bool, NSObject};
    use objc2::{define_class, msg_send, sel, ClassType, MainThreadMarker};
    use objc2_app_kit::{
        NSPrintAllPages, NSPrintFirstPage, NSPrintInfo, NSPrintJobSavingURL, NSPrintLastPage,
        NSPrintOperation, NSPrintSaveJob, NSPrinter, NSPrintingPaginationMode, NSWindow,
    };
    use objc2_foundation::{NSNumber, NSSize, NSString, NSURL};
    use objc2_web_kit::WKWebView;
    use tauri::WebviewWindow;
    use tokio::sync::oneshot;

    use super::EXPORT_TIMEOUT_SECS;

    /// A4 em pontos.
    const A4_WIDTH: f64 = 595.0;
    const A4_HEIGHT: f64 = 842.0;
    /// Máximo de folhas por PDF.
    const MAX_PAGES: isize = 64;

    type DoneSender = oneshot::Sender<bool>;

    define_class!(
        // SAFETY: NSObject não tem requisitos de subclasse; não sobrescrevemos `dealloc`.
        #[unsafe(super(NSObject))]
        #[name = "MorningPaperPdfPrintDelegate"]
        struct PrintDelegate;

        impl PrintDelegate {
            /// `- (void)printOperationDidRun:(NSPrintOperation *)op success:(BOOL)ok contextInfo:(void *)ctx`
            #[unsafe(method(printOperationDidRun:success:contextInfo:))]
            fn print_operation_did_run(
                &self,
                _op: &NSPrintOperation,
                success: Bool,
                context_info: *mut c_void,
            ) {
                if context_info.is_null() {
                    return;
                }
                // SAFETY: `context_info` é o `Box<DoneSender>` criado em `start_print`,
                // consumido exatamente uma vez aqui.
                let tx = unsafe { Box::from_raw(context_info as *mut DoneSender) };
                let _ = tx.send(success.as_bool());
            }
        }
    );

    thread_local! {
        /// Delegate sem estado, mantido vivo na main thread (NSPrintOperation não o retém).
        static DELEGATE: Retained<PrintDelegate> =
            unsafe { msg_send![PrintDelegate::class(), new] };
    }

    pub async fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
        let path_buf = std::path::PathBuf::from(&path);
        let path_buf = if path_buf.is_absolute() {
            path_buf
        } else {
            std::env::current_dir()
                .map_err(|e| e.to_string())?
                .join(path_buf)
        };
        if let Some(parent) = path_buf.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("não foi possível criar {}: {e}", parent.display()))?;
        }
        if path_buf.exists() {
            std::fs::remove_file(&path_buf).map_err(|e| {
                format!("não foi possível sobrescrever {}: {e}", path_buf.display())
            })?;
        }
        let abs = path_buf.to_string_lossy().into_owned();

        let (done_tx, done_rx) = oneshot::channel::<bool>();
        let (start_tx, start_rx) = oneshot::channel::<Result<(), String>>();

        window
            .with_webview(move |wv| {
                // Executa na main thread.
                let res = unsafe { start_print(wv.inner(), wv.ns_window(), &abs, done_tx) };
                let _ = start_tx.send(res);
            })
            .map_err(|e| format!("with_webview falhou: {e}"))?;

        // Timeout cobre tudo: se o WKWebView travar a main thread ou paginar sem fim, desistimos.
        let job = async {
            start_rx
                .await
                .map_err(|_| "a main thread não iniciou a impressão".to_string())??;
            let success = done_rx
                .await
                .map_err(|_| "operação de impressão cancelada".to_string())?;
            if !success {
                return Err("a operação de impressão do WebView falhou".to_string());
            }
            wait_for_file(&path_buf).await
        };
        let result = tokio::time::timeout(Duration::from_secs(EXPORT_TIMEOUT_SECS), job)
            .await
            .unwrap_or_else(|_| Err(format!("timeout ({EXPORT_TIMEOUT_SECS}s) ao gerar o PDF")));
        if result.is_err() {
            let _ = std::fs::remove_file(&path_buf);
        }
        result
    }

    /// Espera o arquivo existir com tamanho estável e terminar em `%%EOF`.
    async fn wait_for_file(path: &std::path::Path) -> Result<(), String> {
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        let mut last_len = 0u64;
        loop {
            if let Ok(meta) = std::fs::metadata(path) {
                let len = meta.len();
                if len > 0 && len == last_len && pdf_complete(path) {
                    return Ok(());
                }
                last_len = len;
            }
            if std::time::Instant::now() > deadline {
                return Err(format!("PDF não foi gravado em {}", path.display()));
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    fn pdf_complete(path: &std::path::Path) -> bool {
        use std::io::{Read, Seek, SeekFrom};
        let Ok(mut f) = std::fs::File::open(path) else {
            return false;
        };
        let len = f.metadata().map(|m| m.len()).unwrap_or(0);
        let tail = len.min(1024);
        if f.seek(SeekFrom::End(-(tail as i64))).is_err() {
            return false;
        }
        let mut buf = Vec::with_capacity(tail as usize);
        if f.read_to_end(&mut buf).is_err() {
            return false;
        }
        buf.windows(5).any(|w| w == b"%%EOF")
    }

    /// Configura e inicia a operação de impressão. Deve rodar na main thread.
    ///
    /// Folha A4 sem margens: as páginas do jornal já trazem as próprias margens.
    fn a4_info() -> Retained<NSPrintInfo> {
        let info = NSPrintInfo::new();
        info.setPaperSize(NSSize::new(A4_WIDTH, A4_HEIGHT));
        info.setTopMargin(0.0);
        info.setBottomMargin(0.0);
        info.setLeftMargin(0.0);
        info.setRightMargin(0.0);
        info.setHorizontallyCentered(false);
        info.setVerticallyCentered(false);
        info.setHorizontalPagination(NSPrintingPaginationMode::Fit);
        info.setVerticalPagination(NSPrintingPaginationMode::Automatic);
        info
    }

    /// # Safety
    /// `webview` deve apontar para um `WKWebView` e `ns_window` para um `NSWindow` válidos.
    pub unsafe fn start_dialog(
        webview: *mut c_void,
        ns_window: *mut c_void,
        printer_names: &[String],
        options: &[(String, String)],
    ) -> Result<(), String> {
        let _mtm = MainThreadMarker::new().ok_or("start_dialog fora da main thread")?;
        if webview.is_null() || ns_window.is_null() {
            return Err("WebView/NSWindow indisponível".into());
        }
        let webview: &WKWebView = &*(webview as *const WKWebView);
        let window: &NSWindow = &*(ns_window as *const NSWindow);

        let info = a4_info();
        if let Some(p) = printer_names.iter().find_map(|name| NSPrinter::printerWithName(&NSString::from_str(name))) {
            info.setPrinter(&p);
        }
        // Opções do PPD (ex.: ColorModel=Gray, cupsPrintQuality=Draft): o diálogo já abre com elas.
        let settings = info.printSettings();
        for (key, value) in options {
            let value: &AnyObject = &NSString::from_str(value);
            settings.insert(&*NSString::from_str(key), value);
        }

        let op = webview.printOperationWithPrintInfo(&info);
        op.setShowsPrintPanel(true);
        op.setShowsProgressPanel(true);
        // Igual ao PDF: o WKPrintingView só pagina certo com a impressão numa thread secundária.
        op.setCanSpawnSeparateThread(true);
        if let Some(view) = op.view() {
            let bounds: objc2_foundation::NSRect = msg_send![webview, bounds];
            view.setFrame(bounds);
        }
        // Folha (sheet) sobre a janela; não bloqueia o app.
        op.runOperationModalForWindow_delegate_didRunSelector_contextInfo(window, None, None, std::ptr::null_mut());
        Ok(())
    }

    /// # Safety
    /// `webview` deve apontar para um `WKWebView` e `ns_window` para um `NSWindow` válidos.
    unsafe fn start_print(
        webview: *mut c_void,
        ns_window: *mut c_void,
        path: &str,
        done: DoneSender,
    ) -> Result<(), String> {
        let _mtm = MainThreadMarker::new().ok_or("start_print fora da main thread")?;
        if webview.is_null() || ns_window.is_null() {
            return Err("WebView/NSWindow indisponível".into());
        }
        let webview: &WKWebView = &*(webview as *const WKWebView);
        let window: &NSWindow = &*(ns_window as *const NSWindow);

        let info = a4_info();
        info.setJobDisposition(NSPrintSaveJob);

        let dict = info.dictionary();
        // Limita o número de páginas: proteção contra paginação sem fim do WKWebView.
        let no: &AnyObject = &NSNumber::numberWithBool(false);
        let first: &AnyObject = &NSNumber::numberWithInteger(1);
        let last: &AnyObject = &NSNumber::numberWithInteger(MAX_PAGES);
        dict.insert(NSPrintAllPages, no);
        dict.insert(NSPrintFirstPage, first);
        dict.insert(NSPrintLastPage, last);

        let url = NSURL::fileURLWithPath(&NSString::from_str(path));
        let url_obj: &AnyObject = &url;
        dict.insert(NSPrintJobSavingURL, url_obj);

        let op = webview.printOperationWithPrintInfo(&info);
        op.setShowsPrintPanel(false);
        op.setShowsProgressPanel(false);
        // Essencial: o WKPrintingView só calcula as páginas corretamente quando a impressão roda
        // numa thread secundária (a main thread fica livre para o IPC com o processo web).
        // Com `false`, o PDF sai com páginas em branco infinitas.
        op.setCanSpawnSeparateThread(true);
        // Dá ao view de impressão o tamanho do WebView (recomendado para WKWebView).
        if let Some(view) = op.view() {
            let bounds: objc2_foundation::NSRect = msg_send![webview, bounds];
            view.setFrame(bounds);
        }

        let ctx = Box::into_raw(Box::new(done)) as *mut c_void;
        DELEGATE.with(|delegate| {
            let delegate_obj: &AnyObject = delegate;
            op.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
                window,
                Some(delegate_obj),
                Some(sel!(printOperationDidRun:success:contextInfo:)),
                ctx,
            );
        });
        Ok(())
    }
}
