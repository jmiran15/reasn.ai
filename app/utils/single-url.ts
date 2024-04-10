import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapingBeeClient } from "scrapingbee";

import { extractMetadata } from "./metadata";
import { Document } from "./types";

export async function attemptScrapWithRequests(
  urlToScrap: string,
): Promise<string | null> {
  try {
    const response = await axios.get(urlToScrap);

    if (!response.data) {
      console.log("Failed normal requests as well");
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(`Error in attemptScrapWithRequests: ${error}`);
    return null;
  }
}

export function sanitizeText(text: string): string {
  return text.replace("\u0000", "");
}

async function scrapWithScrapingBee(url: string): Promise<string | null> {
  try {
    if (!process.env.SCRAPING_BEE_API_KEY) {
      throw new Error("Scraping Bee API key not found");
    }

    const client = new ScrapingBeeClient(process.env.SCRAPING_BEE_API_KEY);
    const response = await client.get({
      url: url,
      params: { timeout: 15000 },
      headers: { "ScrapingService-Request": "TRUE" },
    });

    if (response.status !== 200 && response.status !== 404) {
      console.error(
        `Scraping bee error in ${url} with status code ${response.status}`,
      );
      return null;
    }
    const decoder = new TextDecoder();
    const text = decoder.decode(response.data);
    return text;
  } catch (error) {
    console.error(`Error scraping with Scraping Bee: ${error}`);
    return null;
  }
}

export async function scrapSingleUrl(urlToScrap: string): Promise<Document> {
  urlToScrap = urlToScrap.trim();

  try {
    let content = await scrapWithScrapingBee(urlToScrap);

    if (!content) {
      const res = await attemptScrapWithRequests(urlToScrap);
      if (!res) {
        return null;
      }
      content = res;
    }

    const soup = cheerio.load(content);
    soup("script, style, iframe, noscript").remove();
    let formattedText = "";
    soup("body")
      .children()
      .each(function () {
        const tagName = this.tagName.toLowerCase();
        if (["p", "br", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          formattedText += `${soup(this).text()}\n`;
        } else if (
          tagName === "pre" ||
          tagName === "code" ||
          tagName === "span"
        ) {
          formattedText += `${soup(this).text()}`;
        } else {
          let text = soup(this).text();
          text = text
            .split("\n")
            .map((line) => line.replace(/\s+/g, " ").trim())
            .join("\n")
            .replace(/\n{3,}/g, "\n\n");
          formattedText += `${text} `;
        }
      });

    const text = sanitizeText(formattedText.trim());
    const metadata = extractMetadata(soup, urlToScrap);

    if (metadata) {
      return {
        content: text,
        provider: "web-scraper",
        metadata: { ...metadata, sourceURL: urlToScrap },
      } as Document;
    }
    return {
      content: text,
      provider: "web-scraper",
      metadata: { sourceURL: urlToScrap },
    } as Document;
  } catch (error) {
    console.error(`Error: ${error} - Failed to fetch URL: ${urlToScrap}`);
    return {
      content: "",
      provider: "web-scraper",
      metadata: { sourceURL: urlToScrap },
    } as Document;
  }
}

async function getLinks(url: string): Promise<Document[]> {
  return await getDocuments([url], "crawl", 100, true);
}

async function scrapeLinks(links: Document[]): Promise<Document[]> {
  if (links.length === 0 || links === undefined) {
    return [];
  }

  return await getDocuments(
    links.map((link) => link.metadata!.sourceURL!),
    "single_urls",
    100,
    false,
  );
}
