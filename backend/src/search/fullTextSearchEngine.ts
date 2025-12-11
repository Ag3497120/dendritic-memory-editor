/**
 * Full-Text Search Engine
 *
 * Implements comprehensive full-text search with:
 * - Tokenization and stemming
 * - Inverted indexing
 * - Phrase search
 * - Wildcard search
 * - Relevance ranking
 */

import { v4 as uuidv4 } from "uuid";

export interface SearchToken {
  original: string;
  stem: string;
  position: number;
  length: number;
}

export interface IndexEntry {
  documentId: string;
  field: string;
  tokens: SearchToken[];
  frequency: Record<string, number>;
}

export interface SearchResult {
  documentId: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  matchedFields: string[];
  highlights: Array<{ field: string; text: string; positions: number[] }>;
}

/**
 * Full-Text Search Engine
 */
export class FullTextSearchEngine {
  private invertedIndex: Map<string, IndexEntry[]> = new Map(); // token -> entries
  private documentIndex: Map<string, any> = new Map(); // documentId -> document
  private fieldWeights: Record<string, number> = {
    title: 3.0,
    content: 1.0,
    tags: 2.0,
    domain: 2.5,
    metadata: 0.5,
  };

  private stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "if",
    "in",
    "into",
    "is",
    "it",
    "no",
    "not",
    "of",
    "on",
    "or",
    "such",
    "that",
    "the",
    "their",
    "then",
    "there",
    "these",
    "they",
    "this",
    "to",
    "was",
    "will",
    "with",
  ]);

  /**
   * Index a document
   */
  indexDocument(documentId: string, document: any): void {
    this.documentIndex.set(documentId, document);

    // Index all searchable fields
    for (const [field, weight] of Object.entries(this.fieldWeights)) {
      if (field in document) {
        const value = document[field];
        const text = typeof value === "string" ? value : JSON.stringify(value);
        this.indexField(documentId, field, text, weight as number);
      }
    }
  }

  /**
   * Index a single field
   */
  private indexField(
    documentId: string,
    field: string,
    text: string,
    weight: number
  ): void {
    const tokens = this.tokenize(text);
    const frequency: Record<string, number> = {};

    for (const token of tokens) {
      const stem = this.stem(token.stem);

      // Skip stop words
      if (this.stopWords.has(stem.toLowerCase())) {
        continue;
      }

      frequency[stem] = (frequency[stem] || 0) + 1;

      // Add to inverted index
      if (!this.invertedIndex.has(stem)) {
        this.invertedIndex.set(stem, []);
      }

      this.invertedIndex.get(stem)!.push({
        documentId,
        field,
        tokens: [token],
        frequency: { [stem]: 1 },
      });
    }
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): SearchToken[] {
    const tokens: SearchToken[] = [];
    const regex = /\b\w+\b/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        original: match[0],
        stem: match[0],
        position: match.index,
        length: match[0].length,
      });
    }

    return tokens;
  }

  /**
   * Simple stemming (Porter-like)
   */
  private stem(word: string): string {
    word = word.toLowerCase();

    // Remove common suffixes
    const suffixes = [
      "ing",
      "ed",
      "es",
      "s",
      "ly",
      "ness",
      "ment",
      "tion",
    ];

    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }

    return word;
  }

  /**
   * Search with various operators
   */
  search(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      fields?: string[];
      fuzzy?: boolean;
    } = {}
  ): SearchResult[] {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const fields = options.fields;
    const fuzzy = options.fuzzy || false;

    // Parse query
    const { positive, negative, phrases } = this.parseQuery(query);

    // Find matching documents
    const matches = this.findMatches(positive, negative, phrases, fuzzy);

    // Filter by fields if specified
    let results = Array.from(matches.entries())
      .map(([documentId, data]) => this.buildSearchResult(documentId, data))
      .filter((result) => {
        if (!fields) return true;
        return result.matchedFields.some((f) => fields.includes(f));
      });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  /**
   * Parse search query
   */
  private parseQuery(query: string): {
    positive: string[];
    negative: string[];
    phrases: string[];
  } {
    const positive: string[] = [];
    const negative: string[] = [];
    const phrases: string[] = [];

    // Match quoted phrases
    const phraseRegex = /"([^"]*)"/g;
    let phraseMatch;

    while ((phraseMatch = phraseRegex.exec(query)) !== null) {
      phrases.push(phraseMatch[1]);
      query = query.replace(phraseMatch[0], "");
    }

    // Split remaining terms
    const terms = query.split(/\s+/).filter((t) => t.length > 0);

    for (const term of terms) {
      if (term.startsWith("-")) {
        negative.push(this.stem(term.slice(1)));
      } else if (term.startsWith("+")) {
        positive.push(this.stem(term.slice(1)));
      } else {
        positive.push(this.stem(term));
      }
    }

    return { positive, negative, phrases };
  }

  /**
   * Find matching documents
   */
  private findMatches(
    positive: string[],
    negative: string[],
    phrases: string[],
    fuzzy: boolean
  ): Map<string, { score: number; fields: Set<string> }> {
    const matches = new Map<string, { score: number; fields: Set<string> }>();

    // Find documents matching positive terms
    for (const term of positive) {
      const docs = this.invertedIndex.get(term) || [];

      for (const entry of docs) {
        const { documentId, field } = entry;
        const score = entry.frequency[term] * (this.fieldWeights[field] || 1);

        if (!matches.has(documentId)) {
          matches.set(documentId, { score: 0, fields: new Set() });
        }

        const match = matches.get(documentId)!;
        match.score += score;
        match.fields.add(field);
      }
    }

    // Exclude documents with negative terms
    for (const term of negative) {
      const docs = this.invertedIndex.get(term) || [];
      const docIds = new Set(docs.map((d) => d.documentId));

      for (const docId of docIds) {
        matches.delete(docId);
      }
    }

    // Filter by phrases
    if (phrases.length > 0) {
      const filteredMatches = new Map<
        string,
        { score: number; fields: Set<string> }
      >();

      for (const [docId, match] of matches) {
        const doc = this.documentIndex.get(docId);
        let hasAllPhrases = true;

        for (const phrase of phrases) {
          let hasPhrase = false;

          for (const field of match.fields) {
            const text = doc[field] || "";
            if (text.toLowerCase().includes(phrase.toLowerCase())) {
              hasPhrase = true;
              break;
            }
          }

          if (!hasPhrase) {
            hasAllPhrases = false;
            break;
          }
        }

        if (hasAllPhrases) {
          filteredMatches.set(docId, match);
        }
      }

      return filteredMatches;
    }

    return matches;
  }

  /**
   * Build search result object
   */
  private buildSearchResult(
    documentId: string,
    matchData: { score: number; fields: Set<string> }
  ): SearchResult {
    const doc = this.documentIndex.get(documentId);

    // Generate snippet
    const snippet = this.generateSnippet(
      doc,
      Array.from(matchData.fields)[0] || "content"
    );

    // Generate highlights
    const highlights = this.generateHighlights(doc, Array.from(matchData.fields));

    return {
      documentId,
      title: doc.title || "Untitled",
      snippet,
      relevanceScore: matchData.score,
      matchedFields: Array.from(matchData.fields),
      highlights,
    };
  }

  /**
   * Generate text snippet
   */
  private generateSnippet(doc: any, field: string, length: number = 150): string {
    const text = doc[field] || "";
    if (typeof text !== "string") return "";

    if (text.length <= length) {
      return text;
    }

    return text.substring(0, length) + "...";
  }

  /**
   * Generate highlights for matched terms
   */
  private generateHighlights(
    doc: any,
    fields: string[]
  ): Array<{ field: string; text: string; positions: number[] }> {
    const highlights: Array<{
      field: string;
      text: string;
      positions: number[];
    }> = [];

    for (const field of fields) {
      const text = doc[field] || "";
      if (typeof text !== "string") continue;

      const positions: number[] = [];

      // Find all matched terms in text
      for (const [term] of this.invertedIndex) {
        let index = 0;
        while ((index = text.toLowerCase().indexOf(term, index)) !== -1) {
          positions.push(index);
          index += term.length;
        }
      }

      if (positions.length > 0) {
        highlights.push({
          field,
          text,
          positions: positions.sort((a, b) => a - b),
        });
      }
    }

    return highlights;
  }

  /**
   * Wildcard search (prefix matching)
   */
  searchWildcard(pattern: string, limit: number = 20): SearchResult[] {
    const results: SearchResult[] = [];
    const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");

    for (const [token, entries] of this.invertedIndex) {
      if (regex.test(token)) {
        const docs = new Map<
          string,
          { score: number; fields: Set<string> }
        >();

        for (const entry of entries) {
          if (!docs.has(entry.documentId)) {
            docs.set(entry.documentId, { score: 0, fields: new Set() });
          }

          const doc = docs.get(entry.documentId)!;
          doc.score += 1;
          doc.fields.add(entry.field);
        }

        for (const [docId, match] of docs) {
          results.push(this.buildSearchResult(docId, match));
        }
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, limit);
  }

  /**
   * Autocomplete suggestions
   */
  getAutocompleteSuggestions(prefix: string, limit: number = 10): string[] {
    const suggestions = new Set<string>();
    const stemmedPrefix = this.stem(prefix.toLowerCase());

    for (const token of this.invertedIndex.keys()) {
      if (token.startsWith(stemmedPrefix)) {
        suggestions.add(token);

        if (suggestions.size >= limit) {
          break;
        }
      }
    }

    return Array.from(suggestions);
  }

  /**
   * Remove document from index
   */
  removeDocument(documentId: string): void {
    this.documentIndex.delete(documentId);

    // Remove from inverted index
    for (const entries of this.invertedIndex.values()) {
      const filtered = entries.filter((e) => e.documentId !== documentId);

      if (filtered.length === 0) {
        this.invertedIndex.delete(
          Array.from(this.invertedIndex.entries()).find(
            ([, v]) => v === entries
          )?.[0] || ""
        );
      }
    }
  }

  /**
   * Update document
   */
  updateDocument(documentId: string, newDocument: any): void {
    this.removeDocument(documentId);
    this.indexDocument(documentId, newDocument);
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.documentIndex.size,
      totalTokens: this.invertedIndex.size,
      averageTokensPerDocument:
        this.invertedIndex.size / Math.max(1, this.documentIndex.size),
      indexSize: JSON.stringify(Array.from(this.invertedIndex.entries())).length,
    };
  }

  /**
   * Clear index
   */
  clear(): void {
    this.invertedIndex.clear();
    this.documentIndex.clear();
  }
}

/**
 * Singleton instance
 */
let searchEngine: FullTextSearchEngine | null = null;

export function getFullTextSearchEngine(): FullTextSearchEngine {
  if (!searchEngine) {
    searchEngine = new FullTextSearchEngine();
  }
  return searchEngine;
}

export function resetFullTextSearchEngine(): void {
  searchEngine = null;
}
