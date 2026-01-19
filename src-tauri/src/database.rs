use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

/// Draft status in the workflow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DraftStatus {
    Draft,    // Local only, not synced
    Synced,   // Pushed to drafts branch
    Published, // Published to main branch
}

impl Default for DraftStatus {
    fn default() -> Self {
        DraftStatus::Draft
    }
}

impl From<String> for DraftStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "synced" => DraftStatus::Synced,
            "published" => DraftStatus::Published,
            _ => DraftStatus::Draft,
        }
    }
}

impl From<DraftStatus> for String {
    fn from(status: DraftStatus) -> Self {
        match status {
            DraftStatus::Draft => "draft".to_string(),
            DraftStatus::Synced => "synced".to_string(),
            DraftStatus::Published => "published".to_string(),
        }
    }
}

/// Full draft data for save/load operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Draft {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub date: String,
    pub tags: Vec<String>,
    pub description: String,
    pub cover: String,
    pub cover_position: Option<f64>,
    pub content: String,      // Lexical JSON as string
    pub text_content: String, // Plain text for word count
    pub created_at: String,
    pub updated_at: String,
    pub synced_at: Option<String>,
    pub published_at: Option<String>,
    pub status: DraftStatus,
}

/// Summary for draft list (lighter weight)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftSummary {
    pub id: String,
    pub title: String,
    pub status: DraftStatus,
    pub updated_at: String,
}

/// Thread-safe database wrapper
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Create or open the database at the app data directory
    pub fn new() -> Result<Self, String> {
        let db_path = Self::get_db_path()?;

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create database directory: {}", e))?;
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.init_schema()?;
        Ok(db)
    }

    /// Get the database file path
    fn get_db_path() -> Result<PathBuf, String> {
        let data_dir = dirs::data_dir()
            .ok_or("Could not determine app data directory")?
            .join("com.pranavhari.nibandh");

        Ok(data_dir.join("drafts.db"))
    }

    /// Initialize database schema
    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                slug TEXT,
                title TEXT,
                date TEXT,
                tags TEXT,
                description TEXT,
                cover TEXT,
                cover_position REAL,
                content TEXT,
                text_content TEXT,
                created_at TEXT,
                updated_at TEXT,
                synced_at TEXT,
                published_at TEXT,
                status TEXT DEFAULT 'draft'
            )",
            [],
        )
        .map_err(|e| format!("Failed to create drafts table: {}", e))?;

        Self::add_column_if_missing(&conn, "drafts", "cover_position", "REAL")?;

        // Index for faster listing
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC)",
            [],
        )
        .map_err(|e| format!("Failed to create index: {}", e))?;

        Ok(())
    }

    fn add_column_if_missing(
        conn: &Connection,
        table: &str,
        column: &str,
        column_type: &str,
    ) -> Result<(), String> {
        let mut stmt = conn
            .prepare(&format!("PRAGMA table_info({})", table))
            .map_err(|e| format!("Failed to read table info: {}", e))?;
        let mut rows = stmt
            .query([])
            .map_err(|e| format!("Failed to query table info: {}", e))?;

        while let Some(row) = rows
            .next()
            .map_err(|e| format!("Failed to read table info row: {}", e))?
        {
            let name: String = row.get(1).unwrap_or_default();
            if name == column {
                return Ok(());
            }
        }

        conn.execute(
            &format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, column_type),
            [],
        )
        .map_err(|e| format!("Failed to add column {}: {}", column, e))?;

        Ok(())
    }

    /// Save a draft (create or update)
    pub fn save_draft(&self, mut draft: Draft) -> Result<Draft, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        // Generate ID if new draft
        if draft.id.is_empty() {
            draft.id = Uuid::new_v4().to_string();
            draft.created_at = now.clone();
        }
        draft.updated_at = now;

        let tags_json = serde_json::to_string(&draft.tags)
            .map_err(|e| format!("Failed to serialize tags: {}", e))?;
        let status_str: String = draft.status.clone().into();

        conn.execute(
            "INSERT INTO drafts (
                id, slug, title, date, tags, description, cover,
                cover_position, content, text_content, created_at, updated_at,
                synced_at, published_at, status
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ON CONFLICT(id) DO UPDATE SET
                slug = excluded.slug,
                title = excluded.title,
                date = excluded.date,
                tags = excluded.tags,
                description = excluded.description,
                cover = excluded.cover,
                cover_position = excluded.cover_position,
                content = excluded.content,
                text_content = excluded.text_content,
                updated_at = excluded.updated_at,
                synced_at = excluded.synced_at,
                published_at = excluded.published_at,
                status = excluded.status",
            params![
                draft.id,
                draft.slug,
                draft.title,
                draft.date,
                tags_json,
                draft.description,
                draft.cover,
                draft.cover_position,
                draft.content,
                draft.text_content,
                draft.created_at,
                draft.updated_at,
                draft.synced_at,
                draft.published_at,
                status_str,
            ],
        )
        .map_err(|e| format!("Failed to save draft: {}", e))?;

        Ok(draft)
    }

    /// Get a single draft by ID
    pub fn get_draft(&self, id: &str) -> Result<Option<Draft>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, slug, title, date, tags, description, cover,
                        cover_position, content, text_content, created_at, updated_at,
                        synced_at, published_at, status
                 FROM drafts WHERE id = ?1",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let draft = stmt
            .query_row(params![id], |row| {
                let tags_json: String = row.get(4)?;
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
                let status_str: String = row.get(14)?;

                Ok(Draft {
                    id: row.get(0)?,
                    slug: row.get(1)?,
                    title: row.get(2)?,
                    date: row.get(3)?,
                    tags,
                    description: row.get(5)?,
                    cover: row.get(6)?,
                    cover_position: row.get(7)?,
                    content: row.get(8)?,
                    text_content: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    synced_at: row.get(12)?,
                    published_at: row.get(13)?,
                    status: DraftStatus::from(status_str),
                })
            })
            .optional()
            .map_err(|e| format!("Failed to get draft: {}", e))?;

        Ok(draft)
    }

    /// List all drafts (summary only, sorted by updated_at desc)
    pub fn list_drafts(&self) -> Result<Vec<DraftSummary>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, title, status, updated_at FROM drafts ORDER BY updated_at DESC")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let drafts = stmt
            .query_map([], |row| {
                let status_str: String = row.get(2)?;
                Ok(DraftSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: DraftStatus::from(status_str),
                    updated_at: row.get(3)?,
                })
            })
            .map_err(|e| format!("Failed to query drafts: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(drafts)
    }

    /// Delete a draft by ID
    pub fn delete_draft(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute("DELETE FROM drafts WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete draft: {}", e))?;

        Ok(rows_affected > 0)
    }

    /// Get the most recently updated draft
    pub fn get_latest_draft(&self) -> Result<Option<Draft>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id FROM drafts ORDER BY updated_at DESC LIMIT 1",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let id: Option<String> = stmt
            .query_row([], |row| row.get::<_, String>(0))
            .optional()
            .map_err(|e| format!("Failed to get latest draft: {}", e))?;

        drop(stmt);
        drop(conn);

        match id {
            Some(ref draft_id) => self.get_draft(draft_id),
            None => Ok(None),
        }
    }

    /// Update draft status
    pub fn update_status(&self, id: &str, status: DraftStatus) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let status_str: String = status.into();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE drafts SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status_str, now, id],
        )
        .map_err(|e| format!("Failed to update status: {}", e))?;

        Ok(())
    }
}

// Make Database Send + Sync for Tauri state management
unsafe impl Send for Database {}
unsafe impl Sync for Database {}
