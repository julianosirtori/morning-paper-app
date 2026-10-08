//! Coleta de notícias: baixa e interpreta feeds RSS/Atom (feed-rs), em paralelo.
//! Se o endereço for de um site (HTML), procura o feed anunciado em <link rel="alternate">.

use std::time::Duration;

use futures::{stream, StreamExt};
use serde::{Deserialize, Serialize};

const USER_AGENT: &str = "MorningPaper/0.8 (+https://github.com/; desktop RSS reader)";
const MAX_ITEMS_PER_FEED: usize = 40;
const PARALLEL_FETCHES: usize = 6;

#[derive(Deserialize, Clone)]
pub struct FeedRequest {
    /// Identificador da fonte no app (devolvido no resultado).
    pub id: String,
    pub url: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FeedItem {
    pub id: String,
    pub title: String,
    /// HTML ou texto do resumo/conteúdo; o React converte para texto.
    pub summary: String,
    pub url: Option<String>,
    /// RFC 3339
    pub published: Option<String>,
    pub image: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FeedResult {
    pub id: String,
    pub ok: bool,
    pub error: Option<String>,
    /// Endereço final do feed (pode ser diferente do pedido, se veio de um site).
    pub resolved_url: Option<String>,
    pub title: Option<String>,
    pub site: Option<String>,
    pub items: Vec<FeedItem>,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(20))
        .connect_timeout(Duration::from_secs(8))
        .build()
        .expect("cliente HTTP")
}

/// Baixa vários feeds em paralelo; cada resultado diz se deu certo.
pub async fn fetch_all(requests: Vec<FeedRequest>) -> Vec<FeedResult> {
    let client = client();
    stream::iter(requests)
        .map(|r| {
            let client = client.clone();
            async move { fetch_one(&client, r).await }
        })
        .buffer_unordered(PARALLEL_FETCHES)
        .collect()
        .await
}

async fn fetch_one(client: &reqwest::Client, req: FeedRequest) -> FeedResult {
    match fetch_and_parse(client, &req.url).await {
        Ok((resolved, feed)) => FeedResult {
            id: req.id,
            ok: true,
            error: None,
            resolved_url: Some(resolved),
            title: feed.title.as_ref().map(|t| t.content.trim().to_string()),
            site: feed
                .links
                .iter()
                .find(|l| l.rel.as_deref().unwrap_or("alternate") == "alternate")
                .map(|l| l.href.clone()),
            items: feed
                .entries
                .into_iter()
                .take(MAX_ITEMS_PER_FEED)
                .map(to_item)
                .collect(),
        },
        Err(e) => FeedResult {
            id: req.id,
            ok: false,
            error: Some(e),
            resolved_url: None,
            title: None,
            site: None,
            items: vec![],
        },
    }
}

async fn download(
    client: &reqwest::Client,
    url: &str,
) -> Result<(String, String, Vec<u8>), String> {
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("HTTP {}", res.status().as_u16()));
    }
    let final_url = res.url().to_string();
    let ctype = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();
    let body = res.bytes().await.map_err(|e| e.to_string())?.to_vec();
    Ok((final_url, ctype, body))
}

async fn fetch_and_parse(
    client: &reqwest::Client,
    url: &str,
) -> Result<(String, feed_rs::model::Feed), String> {
    let (final_url, ctype, body) = download(client, url).await?;
    match feed_rs::parser::parse(&body[..]) {
        Ok(feed) => Ok((final_url, feed)),
        Err(parse_err) => {
            // Talvez seja a página do site: procura o feed anunciado no HTML.
            let looks_html = ctype.contains("html")
                || body
                    .windows(5)
                    .take(2048)
                    .any(|w| w.eq_ignore_ascii_case(b"<html"));
            if !looks_html {
                return Err(format!("not a feed: {parse_err}"));
            }
            let html = String::from_utf8_lossy(&body);
            let href = discover_feed(&html)
                .ok_or_else(|| "no RSS/Atom feed found on this page".to_string())?;
            let feed_url = reqwest::Url::parse(&final_url)
                .and_then(|base| base.join(&href))
                .map_err(|e| e.to_string())?
                .to_string();
            let (final_feed_url, _, body) = download(client, &feed_url).await?;
            let feed = feed_rs::parser::parse(&body[..]).map_err(|e| format!("not a feed: {e}"))?;
            Ok((final_feed_url, feed))
        }
    }
}

/// Procura `<link rel="alternate" type="application/rss+xml|atom+xml" href="...">` no HTML.
pub fn discover_feed(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let mut from = 0;
    while let Some(pos) = lower[from..].find("<link") {
        let start = from + pos;
        let end = lower[start..]
            .find('>')
            .map(|e| start + e)
            .unwrap_or(lower.len());
        let tag = &lower[start..end];
        if tag.contains("alternate")
            && (tag.contains("application/rss+xml") || tag.contains("application/atom+xml"))
        {
            if let Some(h) = attr(&html[start..end], "href") {
                return Some(h);
            }
        }
        from = end;
    }
    None
}

fn attr(tag: &str, name: &str) -> Option<String> {
    let lower = tag.to_lowercase();
    let i = lower.find(&format!("{name}="))? + name.len() + 1;
    let rest = &tag[i..];
    let quote = rest.chars().next()?;
    if quote == '"' || quote == '\'' {
        rest[1..].find(quote).map(|e| rest[1..1 + e].to_string())
    } else {
        Some(
            rest.split(|c: char| c.is_whitespace() || c == '>')
                .next()?
                .to_string(),
        )
    }
}

fn to_item(e: feed_rs::model::Entry) -> FeedItem {
    let url = e
        .links
        .iter()
        .find(|l| l.rel.as_deref().unwrap_or("alternate") == "alternate")
        .or_else(|| e.links.first())
        .map(|l| l.href.clone());
    // Muitos feeds (WordPress) trazem um resumo curto em <description> e a matéria inteira em
    // <content:encoded>: fica com o mais longo, para a edição não sair com o resumo do resumo.
    let summary = [
        e.summary.as_ref().map(|t| t.content.clone()),
        e.content.as_ref().and_then(|c| c.body.clone()),
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.trim().is_empty())
    .max_by_key(|s| s.len())
    .unwrap_or_default();
    let image = e.media.iter().find_map(|m| {
        m.content
            .iter()
            .find(|c| {
                c.content_type
                    .as_ref()
                    .map(|t| t.ty() == "image")
                    .unwrap_or(true)
                    && c.url.is_some()
            })
            .and_then(|c| c.url.as_ref().map(|u| u.to_string()))
            .or_else(|| m.thumbnails.first().map(|t| t.image.uri.clone()))
    });
    FeedItem {
        id: url.clone().unwrap_or_else(|| e.id.clone()),
        title: e
            .title
            .map(|t| t.content.trim().to_string())
            .unwrap_or_default(),
        summary,
        url,
        published: e.published.or(e.updated).map(|d| d.to_rfc3339()),
        image,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_feed_link_in_html() {
        let html = r#"<html><head><link rel="stylesheet" href="a.css"><LINK rel="alternate" type="application/rss+xml" title="RSS" href="/feed/"></head></html>"#;
        assert_eq!(discover_feed(html).as_deref(), Some("/feed/"));
        assert_eq!(discover_feed("<html><head></head></html>"), None);
    }

    #[test]
    fn parses_rss_items_with_enclosure_image() {
        let xml = r#"<?xml version="1.0"?><rss version="2.0"><channel><title>Teste</title><link>https://ex.com</link>
          <item><title> Manchete </title><link>https://ex.com/a</link><description>&lt;p&gt;Resumo&lt;/p&gt;</description>
          <pubDate>Tue, 07 Oct 2026 05:00:00 GMT</pubDate><enclosure url="https://ex.com/a.jpg" type="image/jpeg" length="1"/></item>
          </channel></rss>"#;
        let feed = feed_rs::parser::parse(xml.as_bytes()).unwrap();
        let item = to_item(feed.entries.into_iter().next().unwrap());
        assert_eq!(item.title, "Manchete");
        assert_eq!(item.url.as_deref(), Some("https://ex.com/a"));
        assert_eq!(item.image.as_deref(), Some("https://ex.com/a.jpg"));
        assert!(item.summary.contains("Resumo"));
        assert!(item.published.unwrap().starts_with("2026-10-07T05:00:00"));
    }

    #[test]
    fn prefers_full_content_over_short_description() {
        let xml = r#"<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Teste</title>
          <item><title>Manchete</title><link>https://ex.com/a</link><description>Resumo curto.</description>
          <content:encoded><![CDATA[<p>Primeiro parágrafo da matéria completa.</p><p>Segundo parágrafo.</p>]]></content:encoded></item>
          </channel></rss>"#;
        let feed = feed_rs::parser::parse(xml.as_bytes()).unwrap();
        let item = to_item(feed.entries.into_iter().next().unwrap());
        assert!(item.summary.contains("Segundo parágrafo"));
    }

    /// Acessa a rede: `cargo test -- --ignored network`
    #[test]
    #[ignore]
    fn network_fetches_real_feeds_and_discovers_from_site() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let res = rt.block_on(fetch_all(vec![
            FeedRequest {
                id: "g1".into(),
                url: "https://g1.globo.com/rss/g1/".into(),
            },
            FeedRequest {
                id: "bbc".into(),
                url: "https://feeds.bbci.co.uk/news/rss.xml".into(),
            },
            FeedRequest {
                id: "site".into(),
                url: "https://tecnoblog.net/".into(),
            },
            FeedRequest {
                id: "bad".into(),
                url: "https://example.com/".into(),
            },
        ]));
        for r in &res {
            eprintln!(
                "{} ok={} items={} title={:?} resolved={:?} err={:?} img={:?}",
                r.id,
                r.ok,
                r.items.len(),
                r.title,
                r.resolved_url,
                r.error,
                r.items.iter().filter(|i| i.image.is_some()).count()
            );
        }
        let get = |id: &str| res.iter().find(|r| r.id == id).unwrap();
        assert!(get("g1").ok && !get("g1").items.is_empty());
        assert!(get("bbc").ok && !get("bbc").items.is_empty());
        assert!(get("site").ok, "deveria achar o feed anunciado no HTML");
        assert!(!get("bad").ok);
    }
}
