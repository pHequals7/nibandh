use base64::{engine::general_purpose::STANDARD, Engine};
use image::{codecs::webp::WebPEncoder, ColorType, DynamicImage};
use regex::Regex;
use reqwest::header::CONTENT_TYPE;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::State;

mod database;
use database::{Database, Draft, DraftStatus, DraftSummary};

// ============================================================================
// Settings Types and Commands
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub repo_path: String,
    pub theme: String,
    #[serde(default = "default_editor_width")]
    pub editor_width: String,
}

fn default_editor_width() -> String {
    "medium".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            repo_path: String::new(),
            theme: "dark".to_string(),
            editor_width: default_editor_width(),
        }
    }
}

/// Get the app data directory for storing settings
fn get_settings_path() -> Result<std::path::PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("com.pranavhari.nibandh");

    // Create directory if it doesn't exist
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create settings directory: {}", e))?;

    Ok(data_dir.join("settings.json"))
}

/// Get settings from disk
#[tauri::command]
fn get_settings() -> Result<Settings, String> {
    let settings_path = get_settings_path()?;

    if !settings_path.exists() {
        return Ok(Settings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))
}

/// Save settings to disk
#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    let settings_path = get_settings_path()?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoValidation {
    pub is_valid: bool,
    pub is_git_repo: bool,
    pub has_content_dir: bool,
    pub error: Option<String>,
}

/// Validate a repository path
#[tauri::command]
fn validate_repo_path(path: String) -> RepoValidation {
    let repo_path = Path::new(&path);

    // Check if path exists
    if !repo_path.exists() {
        return RepoValidation {
            is_valid: false,
            is_git_repo: false,
            has_content_dir: false,
            error: Some("Path does not exist".to_string()),
        };
    }

    // Check if it's a git repo
    let git_dir = repo_path.join(".git");
    let is_git_repo = git_dir.exists();

    // Check if content directory exists or can be created
    let content_dir = repo_path.join("content");
    let has_content_dir = content_dir.exists();

    let is_valid = is_git_repo; // At minimum, must be a git repo

    RepoValidation {
        is_valid,
        is_git_repo,
        has_content_dir,
        error: if !is_git_repo {
            Some("Not a git repository (no .git directory)".to_string())
        } else {
            None
        },
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishDraftArgs {
    slug: String,
    title: String,
    date: String,
    tags: Vec<String>,
    description: String,
    cover: String,         // base64 data URL or empty
    cover_position: Option<f64>,
    updated_at: Option<String>,
    content: String,       // markdown content
    commit_message: String,
    repo_path: String,
}

#[derive(Debug, Serialize)]
struct PublishResult {
    success: bool,
    message: String,
    file_path: Option<String>,
}

#[tauri::command]
async fn publish_draft(args: PublishDraftArgs) -> Result<PublishResult, String> {
    let repo_path = Path::new(&args.repo_path);

    // Verify repo exists
    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {}", args.repo_path));
    }

    let mut stashed = false;

    let status_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["status", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;

    if !status_result.status.success() {
        return Err(format!(
            "git status failed: {}",
            String::from_utf8_lossy(&status_result.stderr)
        ));
    }

    if !String::from_utf8_lossy(&status_result.stdout).trim().is_empty() {
        let stash_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["stash", "push", "-u", "-m", "Nibandh auto-stash"])
            .output()
            .map_err(|e| format!("Failed to stash changes: {}", e))?;

        if !stash_result.status.success() {
            return Err(format!(
                "git stash failed: {}",
                String::from_utf8_lossy(&stash_result.stderr)
            ));
        }
        stashed = true;
    }

    let branch_name = format!("drafts/{}", args.slug);

    let current_branch = Command::new("git")
        .current_dir(&repo_path)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to get current branch: {}", e))?;

    let original_branch = String::from_utf8_lossy(&current_branch.stdout).trim().to_string();

    let _ = Command::new("git")
        .current_dir(&repo_path)
        .args(["fetch", "origin", "main"])
        .output();

    let branch_check = Command::new("git")
        .current_dir(&repo_path)
        .args(["show-ref", "--verify", "--quiet", &format!("refs/heads/{}", branch_name)])
        .output()
        .map_err(|e| format!("Failed to check branch: {}", e))?;

    if branch_check.status.success() {
        let checkout_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &branch_name])
            .output()
            .map_err(|e| format!("Failed to checkout publish branch: {}", e))?;

        if !checkout_result.status.success() {
            if stashed {
                let _ = Command::new("git")
                    .current_dir(&repo_path)
                    .args(["stash", "pop"])
                    .output();
            }
            return Err(format!(
                "Failed to checkout publish branch: {}",
                String::from_utf8_lossy(&checkout_result.stderr)
            ));
        }
    } else {
        let create_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", "-b", &branch_name, "origin/main"])
            .output()
            .map_err(|e| format!("Failed to create publish branch: {}", e))?;

        if !create_result.status.success() {
            let fallback_result = Command::new("git")
                .current_dir(&repo_path)
                .args(["checkout", "-b", &branch_name, "main"])
                .output()
                .map_err(|e| format!("Failed to create publish branch from main: {}", e))?;

            if !fallback_result.status.success() {
                if stashed {
                    let _ = Command::new("git")
                        .current_dir(&repo_path)
                        .args(["stash", "pop"])
                        .output();
                }
                return Err(format!(
                    "Failed to create publish branch: {}",
                    String::from_utf8_lossy(&fallback_result.stderr)
                ));
            }
        }
    }

    let content_dir = repo_path.join("content");
    let articles_dir = content_dir.join("articles");
    let images_dir = content_dir.join("images");
    let public_images_dir = repo_path.join("public").join("images");

    // Create directories if they don't exist
    fs::create_dir_all(&articles_dir).map_err(|e| format!("Failed to create articles dir: {}", e))?;
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images dir: {}", e))?;
    fs::create_dir_all(&public_images_dir)
        .map_err(|e| format!("Failed to create public images dir: {}", e))?;

    // Handle cover image if present (base64 data URL)
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let cover_path = if !args.cover.is_empty() && args.cover.starts_with("data:image") {
        match save_base64_image(&args.cover, &images_dir, &args.slug) {
            Ok(filename) => {
                let _ = copy_to_public_images(&public_images_dir, &images_dir, &filename);
                format!("/images/{}", filename)
            }
            Err(e) => {
                eprintln!("Failed to save cover image: {}", e);
                String::new()
            }
        }
    } else if !args.cover.is_empty() && args.cover.starts_with("http") {
        match save_remote_image(
            &client,
            &args.cover,
            &images_dir,
            &args.slug,
            None,
            "cover",
        )
        .await
        {
            Ok(filename) => {
                let _ = copy_to_public_images(&public_images_dir, &images_dir, &filename);
                format!("/images/{}", filename)
            }
            Err(e) => {
                eprintln!("Failed to download cover image: {}", e);
                args.cover.clone()
            }
        }
    } else if !args.cover.is_empty() && args.cover.starts_with("/drafts/images/") {
        let filename = args.cover.trim_start_matches("/drafts/images/").to_string();
        let drafts_images_dir = repo_path.join("drafts").join("images");
        let source_path = drafts_images_dir.join(&filename);
        let target_path = images_dir.join(&filename);
        if source_path.exists() {
            let _ = fs::copy(&source_path, &target_path);
            let _ = copy_to_public_images(&public_images_dir, &images_dir, &filename);
            format!("/images/{}", filename)
        } else {
            args.cover.clone()
        }
    } else if !args.cover.is_empty() {
        // Already a path, keep it
        args.cover.clone()
    } else {
        String::new()
    };

    let content = replace_inline_images(
        &args.content,
        &images_dir,
        Some(&public_images_dir),
        Some(&client),
        &args.slug,
        "/images",
    )
    .await?;

    // Generate YAML frontmatter
    let tags_yaml = args
        .tags
        .iter()
        .map(|t| format!("\"{}\"", t.replace('"', "\\\"")))
        .collect::<Vec<_>>()
        .join(", ");

    let cover_position = args.cover_position.unwrap_or(50.0);
    let updated_at = args.updated_at.unwrap_or_else(|| args.date.clone());
    let frontmatter = format!(
        r#"---
title: "{}"
date: "{}"
tags: [{}]
description: "{}"
cover: "{}"
cover_position: {}
last_updated: "{}"
---

"#,
        args.title.replace('"', "\\\""),
        args.date,
        tags_yaml,
        args.description.replace('"', "\\\""),
        cover_path,
        cover_position,
        updated_at
    );

    // Write markdown file
    let article_path = articles_dir.join(format!("{}.md", args.slug));
    let full_content = format!("{}{}", frontmatter, content);

    fs::write(&article_path, &full_content)
        .map_err(|e| format!("Failed to write article: {}", e))?;

    // Git operations
    // 1. git add
    let add_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["add", "content/", "public/images/"])
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_result.status.success() {
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &original_branch])
            .output();
        if stashed {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["stash", "pop"])
                .output();
        }
        return Err(format!(
            "git add failed: {}",
            String::from_utf8_lossy(&add_result.stderr)
        ));
    }

    // 2. git commit
    let commit_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["commit", "-m", &args.commit_message])
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_result.status.success() {
        let stderr = String::from_utf8_lossy(&commit_result.stderr);
        // "nothing to commit" is not really an error
        if !stderr.contains("nothing to commit") {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["checkout", &original_branch])
                .output();
            if stashed {
                let _ = Command::new("git")
                    .current_dir(&repo_path)
                    .args(["stash", "pop"])
                    .output();
            }
            return Err(format!("git commit failed: {}", stderr));
        }
    }

    // 3. git push branch
    let push_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["push", "-u", "origin", &branch_name])
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if !push_result.status.success() {
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &original_branch])
            .output();
        if stashed {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["stash", "pop"])
                .output();
        }
        return Err(format!(
            "git push failed: {}",
            String::from_utf8_lossy(&push_result.stderr)
        ));
    }

    // 4. Create PR (if needed)
    let pr_number_output = Command::new("gh")
        .current_dir(&repo_path)
        .args([
            "pr",
            "list",
            "--head",
            &branch_name,
            "--json",
            "number",
            "--jq",
            ".[0].number",
        ])
        .output()
        .map_err(|e| format!("Failed to list PRs: {}", e))?;

    let mut pr_number = String::from_utf8_lossy(&pr_number_output.stdout).trim().to_string();

    if pr_number.is_empty() {
        let pr_create = Command::new("gh")
            .current_dir(&repo_path)
            .args([
                "pr",
                "create",
                "--title",
                &format!("Publish: {}", args.title),
                "--body",
                "Published via Nibandh",
                "--head",
                &branch_name,
                "--base",
                "main",
            ])
            .output()
            .map_err(|e| format!("Failed to create PR: {}", e))?;

        if !pr_create.status.success() {
            return Err(format!(
                "Failed to create PR: {}",
                String::from_utf8_lossy(&pr_create.stderr)
            ));
        }

        let pr_number_output = Command::new("gh")
            .current_dir(&repo_path)
            .args([
                "pr",
                "list",
                "--head",
                &branch_name,
                "--json",
                "number",
                "--jq",
                ".[0].number",
            ])
            .output()
            .map_err(|e| format!("Failed to list PRs: {}", e))?;

        pr_number = String::from_utf8_lossy(&pr_number_output.stdout).trim().to_string();
    }

    if pr_number.is_empty() {
        return Err("Failed to resolve PR number".to_string());
    }

    // 5. Merge PR if possible
    let merge_result = Command::new("gh")
        .current_dir(&repo_path)
        .args(["pr", "merge", &pr_number, "--merge", "--delete-branch"])
        .output()
        .map_err(|e| format!("Failed to merge PR: {}", e))?;

    let mut message = "PR created and merged successfully.".to_string();
    if !merge_result.status.success() {
        let stderr = String::from_utf8_lossy(&merge_result.stderr);
        message = format!(
            "PR created for '{}' but could not be merged automatically: {}",
            args.title, stderr
        );
    }

    // Switch back to original branch
    let _ = Command::new("git")
        .current_dir(&repo_path)
        .args(["checkout", &original_branch])
        .output();

    if stashed {
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["stash", "pop"])
            .output();
    }

    Ok(PublishResult {
        success: true,
        message,
        file_path: Some(article_path.to_string_lossy().to_string()),
    })
}

/// Save a base64 data URL image to the filesystem
fn save_base64_image(data_url: &str, images_dir: &Path, slug: &str) -> Result<String, String> {
    // Parse data URL: data:image/jpeg;base64,/9j/4AAQ...
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format".to_string());
    }

    let header = parts[0];
    let base64_data = parts[1];

    // Decode base64 and write to file
    let image_data = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if let Ok(image) = image::load_from_memory(&image_data) {
        let webp_data = encode_webp(&image)?;
        let filename = format!("cover_{}.webp", slug);
        let file_path = images_dir.join(&filename);
        fs::write(&file_path, webp_data).map_err(|e| format!("Failed to write image: {}", e))?;
        return Ok(filename);
    }

    // Fallback to original format if decoding fails
    let extension = if header.contains("image/png") {
        "png"
    } else if header.contains("image/gif") {
        "gif"
    } else if header.contains("image/webp") {
        "webp"
    } else if header.contains("image/heic") || header.contains("image/heif") {
        "heic"
    } else {
        "jpg"
    };

    let filename = format!("cover_{}.{}", slug, extension);
    let file_path = images_dir.join(&filename);
    fs::write(&file_path, image_data).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(filename)
}

fn encode_webp(image: &DynamicImage) -> Result<Vec<u8>, String> {
    let rgba = image.to_rgba8();
    let (width, height) = rgba.dimensions();
    let mut buffer = Vec::new();
    let encoder = WebPEncoder::new_lossless(&mut buffer);
    encoder
        .encode(&rgba, width, height, ColorType::Rgba8.into())
        .map_err(|e| format!("Failed to encode webp: {}", e))?;

    Ok(buffer)
}

fn save_inline_base64_image(
    data_url: &str,
    images_dir: &Path,
    slug: &str,
    index: usize,
) -> Result<String, String> {
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format".to_string());
    }

    let header = parts[0];
    let base64_data = parts[1];

    let image_data = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if let Ok(image) = image::load_from_memory(&image_data) {
        let webp_data = encode_webp(&image)?;
        let filename = format!("img_{}_{}.webp", slug, index);
        let file_path = images_dir.join(&filename);
        fs::write(&file_path, webp_data).map_err(|e| format!("Failed to write image: {}", e))?;
        return Ok(filename);
    }

    let extension = if header.contains("image/png") {
        "png"
    } else if header.contains("image/gif") {
        "gif"
    } else if header.contains("image/webp") {
        "webp"
    } else if header.contains("image/heic") || header.contains("image/heif") {
        "heic"
    } else {
        "jpg"
    };

    let filename = format!("img_{}_{}.{}", slug, index, extension);
    let file_path = images_dir.join(&filename);
    fs::write(&file_path, image_data).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(filename)
}

fn copy_to_public_images(
    public_images_dir: &Path,
    images_dir: &Path,
    filename: &str,
) -> Result<(), String> {
    let source_path = images_dir.join(filename);
    let target_path = public_images_dir.join(filename);
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create public images dir: {}", e))?;
    }
    fs::copy(&source_path, &target_path)
        .map_err(|e| format!("Failed to copy image to public: {}", e))?;
    Ok(())
}

fn guess_extension_from_url(url: &str) -> Option<String> {
    let trimmed = url.split('?').next().unwrap_or(url);
    let filename = trimmed.rsplit('/').next().unwrap_or(trimmed);
    let extension = filename.rsplit('.').next().unwrap_or("");
    match extension.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "tiff" | "avif" => {
            Some(extension.to_lowercase())
        }
        _ => None,
    }
}

async fn save_remote_image(
    client: &Client,
    url: &str,
    images_dir: &Path,
    slug: &str,
    index: Option<usize>,
    prefix: &str,
) -> Result<String, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download image: HTTP {}",
            response.status()
        ));
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    let filename = if let Ok(image) = image::load_from_memory(&bytes) {
        let webp_data = encode_webp(&image)?;
        let name = if let Some(index) = index {
            format!("img_{}_{}.webp", slug, index)
        } else {
            format!("{}_{}.webp", prefix, slug)
        };
        let file_path = images_dir.join(&name);
        fs::write(&file_path, webp_data).map_err(|e| format!("Failed to write image: {}", e))?;
        name
    } else {
        let extension = if content_type.contains("image/png") {
            "png".to_string()
        } else if content_type.contains("image/webp") {
            "webp".to_string()
        } else if content_type.contains("image/gif") {
            "gif".to_string()
        } else if content_type.contains("image/jpeg") {
            "jpg".to_string()
        } else {
            guess_extension_from_url(url).unwrap_or_else(|| "jpg".to_string())
        };
        let name = if let Some(index) = index {
            format!("img_{}_{}.{}", slug, index, extension)
        } else {
            format!("{}_{}.{}", prefix, slug, extension)
        };
        let file_path = images_dir.join(&name);
        fs::write(&file_path, bytes).map_err(|e| format!("Failed to write image: {}", e))?;
        name
    };

    Ok(filename)
}

async fn replace_inline_images(
    content: &str,
    images_dir: &Path,
    public_images_dir: Option<&Path>,
    client: Option<&Client>,
    slug: &str,
    path_prefix: &str,
) -> Result<String, String> {
    let re = Regex::new(
        r#"!\[([^\]]*)\]\((data:image[^)]+|https?://[^)]+)\)|<img([^>]*?)src="(data:image[^"]+|https?://[^"]+)"([^>]*)>"#,
    )
    .map_err(|e| format!("Failed to build image regex: {}", e))?;
    let mut output = String::with_capacity(content.len());
    let mut last_index = 0;
    let mut image_index = 1;
    let prefix = path_prefix.trim_end_matches('/');

    for caps in re.captures_iter(content) {
        let full = caps.get(0).unwrap();
        let alt = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let data_url = caps.get(2).map(|m| m.as_str());
        let img_before = caps.get(3).map(|m| m.as_str());
        let img_data_url = caps.get(4).map(|m| m.as_str());
        let img_after = caps.get(5).map(|m| m.as_str());

        output.push_str(&content[last_index..full.start()]);

        if let Some(data_url) = data_url {
            let save_result = if data_url.starts_with("http") {
                if let Some(client) = client {
                    save_remote_image(client, data_url, images_dir, slug, Some(image_index), "img")
                        .await
                } else {
                    Err("No HTTP client available for remote image".to_string())
                }
            } else {
                save_inline_base64_image(data_url, images_dir, slug, image_index)
            };

            match save_result {
                Ok(filename) => {
                    if let Some(public_dir) = public_images_dir {
                        let _ = copy_to_public_images(public_dir, images_dir, &filename);
                    }
                    let image_path = format!("{}/{}", prefix, filename);
                    output.push_str(&format!("![{}]({})", alt, image_path));
                    image_index += 1;
                }
                Err(err) => {
                    eprintln!("Failed to save inline image: {}", err);
                    output.push_str(full.as_str());
                }
            }
        } else if let (Some(data_url), Some(before), Some(after)) =
            (img_data_url, img_before, img_after)
        {
            let save_result = if data_url.starts_with("http") {
                if let Some(client) = client {
                    save_remote_image(client, data_url, images_dir, slug, Some(image_index), "img")
                        .await
                } else {
                    Err("No HTTP client available for remote image".to_string())
                }
            } else {
                save_inline_base64_image(data_url, images_dir, slug, image_index)
            };

            match save_result {
                Ok(filename) => {
                    if let Some(public_dir) = public_images_dir {
                        let _ = copy_to_public_images(public_dir, images_dir, &filename);
                    }
                    let image_path = format!("{}/{}", prefix, filename);
                    output.push_str(&format!(
                        "<img{}src=\"{}\"{}>",
                        before, image_path, after
                    ));
                    image_index += 1;
                }
                Err(err) => {
                    eprintln!("Failed to save inline image: {}", err);
                    output.push_str(full.as_str());
                }
            }
        } else {
            output.push_str(full.as_str());
        }

        last_index = full.end();
    }

    output.push_str(&content[last_index..]);

    Ok(output)
}

/// Get the current git status of the repository
#[tauri::command]
async fn get_repo_status(repo_path: String) -> Result<String, String> {
    let path = Path::new(&repo_path);
    if !path.exists() {
        return Err("Repository path does not exist".to_string());
    }

    let output = Command::new("git")
        .current_dir(&path)
        .args(["status", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// One-time sync: copy content/images -> public/images
#[tauri::command]
async fn sync_public_images(repo_path: String) -> Result<String, String> {
    let repo_path = Path::new(&repo_path);
    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {}", repo_path.display()));
    }

    let source_dir = repo_path.join("content").join("images");
    let target_dir = repo_path.join("public").join("images");

    if !source_dir.exists() {
        return Err("content/images does not exist".to_string());
    }

    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create public/images: {}", e))?;

    let mut copied = 0usize;
    for entry in fs::read_dir(&source_dir)
        .map_err(|e| format!("Failed to read content/images: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(filename) = path.file_name() {
                let target_path = target_dir.join(filename);
                fs::copy(&path, &target_path)
                    .map_err(|e| format!("Failed to copy {:?}: {}", path, e))?;
                copied += 1;
            }
        }
    }

    Ok(format!(
        "Synced {} images from content/images to public/images",
        copied
    ))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncDraftArgs {
    slug: String,
    title: String,
    date: String,
    tags: Vec<String>,
    description: String,
    cover: String,
    cover_position: Option<f64>,
    updated_at: Option<String>,
    content: String,
    repo_path: String,
    draft_id: String,
}

#[derive(Debug, Serialize)]
struct SyncResult {
    success: bool,
    message: String,
    branch: String,
}

/// Sync a draft to the drafts branch (creates branch if it doesn't exist)
#[tauri::command]
async fn sync_to_drafts(args: SyncDraftArgs) -> Result<SyncResult, String> {
    let repo_path = Path::new(&args.repo_path);

    // Verify repo exists
    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {}", args.repo_path));
    }

    let drafts_branch = format!("drafts/{}", args.slug);
    let mut stashed = false;

    let status_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["status", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;

    if !status_result.status.success() {
        return Err(format!(
            "git status failed: {}",
            String::from_utf8_lossy(&status_result.stderr)
        ));
    }

    if !String::from_utf8_lossy(&status_result.stdout).trim().is_empty() {
        let stash_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["stash", "push", "-u", "-m", "Nibandh auto-stash"])
            .output()
            .map_err(|e| format!("Failed to stash changes: {}", e))?;

        if !stash_result.status.success() {
            return Err(format!(
                "git stash failed: {}",
                String::from_utf8_lossy(&stash_result.stderr)
            ));
        }
        stashed = true;
    }

    // Get current branch name
    let current_branch = Command::new("git")
        .current_dir(&repo_path)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to get current branch: {}", e))?;

    let original_branch = String::from_utf8_lossy(&current_branch.stdout).trim().to_string();

    // Check if drafts branch exists locally
    let branch_check = Command::new("git")
        .current_dir(&repo_path)
        .args(["show-ref", "--verify", "--quiet", &format!("refs/heads/{}", drafts_branch)])
        .output()
        .map_err(|e| format!("Failed to check branch: {}", e))?;

    let drafts_branch_exists = branch_check.status.success();

    // If drafts branch doesn't exist, create it
    if !drafts_branch_exists {
        // Try to create from origin/drafts first, otherwise from main
        let fetch_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["fetch", "origin", &drafts_branch])
            .output();

        let create_from = if fetch_result.is_ok() && fetch_result.unwrap().status.success() {
            format!("origin/{}", drafts_branch)
        } else {
            "main".to_string()
        };

        let create_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", "-b", &drafts_branch, &create_from])
            .output()
            .map_err(|e| format!("Failed to create drafts branch: {}", e))?;

        if !create_result.status.success() {
            // If that fails, try creating from HEAD
            let create_from_head = Command::new("git")
                .current_dir(&repo_path)
                .args(["checkout", "-b", &drafts_branch])
                .output()
                .map_err(|e| format!("Failed to create drafts branch: {}", e))?;

            if !create_from_head.status.success() {
                if stashed {
                    let _ = Command::new("git")
                        .current_dir(&repo_path)
                        .args(["stash", "pop"])
                        .output();
                }
                return Err(format!(
                    "Failed to create drafts branch: {}",
                    String::from_utf8_lossy(&create_from_head.stderr)
                ));
            }
        }
    } else {
        // Switch to drafts branch
        let checkout_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &drafts_branch])
            .output()
            .map_err(|e| format!("Failed to checkout drafts branch: {}", e))?;

        if !checkout_result.status.success() {
            if stashed {
                let _ = Command::new("git")
                    .current_dir(&repo_path)
                    .args(["stash", "pop"])
                    .output();
            }
            return Err(format!(
                "Failed to checkout drafts branch: {}",
                String::from_utf8_lossy(&checkout_result.stderr)
            ));
        }

        // Pull latest changes
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["pull", "origin", &drafts_branch])
            .output();
    }

    // Create drafts directory structure
    let drafts_dir = repo_path.join("drafts");
    let images_dir = repo_path.join("drafts").join("images");
    fs::create_dir_all(&drafts_dir).map_err(|e| format!("Failed to create drafts dir: {}", e))?;
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images dir: {}", e))?;

    // Handle cover image if present
    let cover_path = if !args.cover.is_empty() && args.cover.starts_with("data:image") {
        match save_base64_image(&args.cover, &images_dir, &args.slug) {
            Ok(filename) => format!("/drafts/images/{}", filename),
            Err(e) => {
                eprintln!("Failed to save cover image: {}", e);
                String::new()
            }
        }
    } else if !args.cover.is_empty() {
        args.cover.clone()
    } else {
        String::new()
    };

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let content = replace_inline_images(
        &args.content,
        &images_dir,
        None,
        Some(&client),
        &args.slug,
        "/drafts/images",
    )
    .await?;

    // Generate frontmatter
    let tags_yaml = args
        .tags
        .iter()
        .map(|t| format!("\"{}\"", t.replace('"', "\\\"")))
        .collect::<Vec<_>>()
        .join(", ");

    let cover_position = args.cover_position.unwrap_or(50.0);
    let updated_at = args.updated_at.unwrap_or_else(|| args.date.clone());
    let frontmatter = format!(
        r#"---
title: "{}"
date: "{}"
tags: [{}]
description: "{}"
cover: "{}"
cover_position: {}
last_updated: "{}"
draft_id: "{}"
---

"#,
        args.title.replace('"', "\\\""),
        args.date,
        tags_yaml,
        args.description.replace('"', "\\\""),
        cover_path,
        cover_position,
        updated_at,
        args.draft_id
    );

    // Write draft file
    let draft_path = drafts_dir.join(format!("{}.md", args.slug));
    let full_content = format!("{}{}", frontmatter, content);

    fs::write(&draft_path, &full_content)
        .map_err(|e| format!("Failed to write draft: {}", e))?;

    // Git add
    let add_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["add", "drafts/"])
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_result.status.success() {
        // Switch back to original branch before returning error
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &original_branch])
            .output();
        if stashed {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["stash", "pop"])
                .output();
        }
        return Err(format!(
            "git add failed: {}",
            String::from_utf8_lossy(&add_result.stderr)
        ));
    }

    // Git commit
    let commit_msg = format!("Sync draft: {}", args.title);
    let commit_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["commit", "-m", &commit_msg])
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_result.status.success() {
        let stderr = String::from_utf8_lossy(&commit_result.stderr);
        if !stderr.contains("nothing to commit") {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["checkout", &original_branch])
                .output();
            if stashed {
                let _ = Command::new("git")
                    .current_dir(&repo_path)
                    .args(["stash", "pop"])
                    .output();
            }
            return Err(format!("git commit failed: {}", stderr));
        }
    }

    // Git push (with -u to set upstream if needed)
    let push_result = Command::new("git")
        .current_dir(&repo_path)
        .args(["push", "-u", "origin", &drafts_branch])
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if !push_result.status.success() {
        let _ = Command::new("git")
            .current_dir(&repo_path)
            .args(["checkout", &original_branch])
            .output();
        if stashed {
            let _ = Command::new("git")
                .current_dir(&repo_path)
                .args(["stash", "pop"])
                .output();
        }
        return Err(format!(
            "git push failed: {}",
            String::from_utf8_lossy(&push_result.stderr)
        ));
    }

    // Switch back to original branch
    let _ = Command::new("git")
        .current_dir(&repo_path)
        .args(["checkout", &original_branch])
        .output();

    if stashed {
        let pop_result = Command::new("git")
            .current_dir(&repo_path)
            .args(["stash", "pop"])
            .output()
            .map_err(|e| format!("Failed to pop stash: {}", e))?;
        if !pop_result.status.success() {
            return Err(format!(
                "git stash pop failed: {}",
                String::from_utf8_lossy(&pop_result.stderr)
            ));
        }
    }

    Ok(SyncResult {
        success: true,
        message: format!("Draft '{}' synced to drafts branch", args.title),
        branch: drafts_branch.to_string(),
    })
}

// ============================================================================
// Draft CRUD Commands
// ============================================================================

/// Save a draft to SQLite (create or update)
#[tauri::command]
fn save_draft_to_db(db: State<Database>, draft: Draft) -> Result<Draft, String> {
    db.save_draft(draft)
}

/// Get a single draft by ID
#[tauri::command]
fn get_draft_from_db(db: State<Database>, id: String) -> Result<Option<Draft>, String> {
    db.get_draft(&id)
}

/// List all drafts (summary only)
#[tauri::command]
fn list_drafts(db: State<Database>) -> Result<Vec<DraftSummary>, String> {
    db.list_drafts()
}

/// Delete a draft by ID
#[tauri::command]
fn delete_draft(db: State<Database>, id: String) -> Result<bool, String> {
    db.delete_draft(&id)
}

/// Get the most recently updated draft
#[tauri::command]
fn get_latest_draft(db: State<Database>) -> Result<Option<Draft>, String> {
    db.get_latest_draft()
}

/// Update draft status (for sync/publish tracking)
#[tauri::command]
fn update_draft_status(db: State<Database>, id: String, status: String) -> Result<(), String> {
    let draft_status = DraftStatus::from(status);
    db.update_status(&id, draft_status)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            // Publish commands
            publish_draft,
            sync_to_drafts,
            get_repo_status,
            sync_public_images,
            // Settings commands
            get_settings,
            save_settings,
            validate_repo_path,
            // Draft CRUD commands
            save_draft_to_db,
            get_draft_from_db,
            list_drafts,
            delete_draft,
            get_latest_draft,
            update_draft_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
