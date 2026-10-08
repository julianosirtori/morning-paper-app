use super::*;
use std::fs;
use std::path::PathBuf;
use std::process;

fn temp_dir(test_name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "morning-paper-test-{}-{}",
        process::id(),
        test_name
    ));
    let _ = fs::remove_dir_all(&dir);
    dir
}

fn cleanup(path: &PathBuf) {
    let _ = fs::remove_dir_all(path);
}

#[test]
fn line_formats_timestamp_and_message() {
    let dt = chrono::NaiveDate::from_ymd_opt(2026, 10, 8)
        .unwrap()
        .and_hms_opt(6, 0, 1)
        .unwrap();
    let result = line(dt, "oi");
    assert_eq!(result, "2026-10-08 06:00:01 oi\n");
}

#[test]
fn append_creates_missing_parent_dirs() {
    let base = temp_dir("append_creates_dirs");
    let log_path = base.join("logs").join("subdir").join("activity.log");

    assert!(!log_path.parent().unwrap().exists());

    append(&log_path, "primeira\n");
    assert!(log_path.exists());

    let content = fs::read_to_string(&log_path).unwrap();
    assert_eq!(content, "primeira\n");

    cleanup(&base);
}

#[test]
fn append_appends_multiple_lines_in_order() {
    let base = temp_dir("append_multiple_lines");
    let log_path = base.join("activity.log");

    fs::create_dir_all(&base).unwrap();

    append(&log_path, "linha 1\n");
    append(&log_path, "linha 2\n");

    let content = fs::read_to_string(&log_path).unwrap();
    assert_eq!(content, "linha 1\nlinha 2\n");

    cleanup(&base);
}

#[test]
fn rotation_moves_large_file_to_dot_1() {
    let base = temp_dir("rotation_basic");
    let log_path = base.join("activity.log");

    fs::create_dir_all(&base).unwrap();

    // Criar arquivo grande (> MAX_BYTES)
    let large_content = "x".repeat((MAX_BYTES + 1000) as usize);
    fs::write(&log_path, &large_content).unwrap();

    assert!(log_path.exists());
    assert!(fs::metadata(&log_path).unwrap().len() > MAX_BYTES);

    // Append deve rotacionar: mover para .1 e criar novo
    append(&log_path, "new line\n");

    let rotated_path = base.join("activity.log.1");
    assert!(rotated_path.exists(), "activity.log.1 deve existir após rotação");
    assert!(log_path.exists(), "activity.log deve existir após rotação");

    let rotated_content = fs::read_to_string(&rotated_path).unwrap();
    assert_eq!(rotated_content, large_content);

    let new_content = fs::read_to_string(&log_path).unwrap();
    assert_eq!(new_content, "new line\n");

    cleanup(&base);
}

#[test]
fn second_rotation_overwrites_dot_1() {
    let base = temp_dir("rotation_second");
    let log_path = base.join("activity.log");

    fs::create_dir_all(&base).unwrap();

    // Primeira rotação
    let first_large = "a".repeat((MAX_BYTES + 1000) as usize);
    fs::write(&log_path, &first_large).unwrap();
    append(&log_path, "first rotation\n");

    let rotated_path = base.join("activity.log.1");
    let first_rotated = fs::read_to_string(&rotated_path).unwrap();
    assert_eq!(first_rotated, first_large);

    // Segunda rotação
    let second_large = "b".repeat((MAX_BYTES + 2000) as usize);
    fs::write(&log_path, &second_large).unwrap();
    append(&log_path, "second rotation\n");

    let second_rotated = fs::read_to_string(&rotated_path).unwrap();
    assert_eq!(second_rotated, second_large);

    let new_content = fs::read_to_string(&log_path).unwrap();
    assert_eq!(new_content, "second rotation\n");

    cleanup(&base);
}
