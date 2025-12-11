/**
 * Faceted Search & Filtering
 *
 * Implements faceted navigation and advanced filtering:
 * - Dynamic facet generation
 * - Multi-select filtering
 * - Range filtering
 * - Facet hierarchy
 * - Filter aggregation
 */

export interface Facet {
  name: string;
  field: string;
  values: FacetValue[];
  type: "terms" | "range" | "hierarchy";
}

export interface FacetValue {
  value: string | number;
  label: string;
  count: number;
  selected?: boolean;
}

export interface FilterCriteria {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "range";
  value: any;
}

export interface FilterResult {
  documents: any[];
  facets: Facet[];
  totalCount: number;
  appliedFilters: FilterCriteria[];
}

/**
 * Faceted Search Engine
 */
export class FacetedSearchEngine {
  private documents: Map<string, any> = new Map();
  private facets: Map<string, Facet> = new Map();
  private fieldMetadata: Map<
    string,
    { type: string; uniqueValues: Set<any> }
  > = new Map();

  /**
   * Add document
   */
  addDocument(documentId: string, document: any): void {
    this.documents.set(documentId, document);

    // Update field metadata
    for (const [field, value] of Object.entries(document)) {
      if (!this.fieldMetadata.has(field)) {
        this.fieldMetadata.set(field, {
          type: typeof value,
          uniqueValues: new Set(),
        });
      }

      const metadata = this.fieldMetadata.get(field)!;
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => metadata.uniqueValues.add(v));
        } else {
          metadata.uniqueValues.add(value);
        }
      }
    }
  }

  /**
   * Generate facets for a field
   */
  generateFacet(field: string, type: "terms" | "range" = "terms"): Facet {
    const metadata = this.fieldMetadata.get(field);
    if (!metadata) {
      return {
        name: field,
        field,
        values: [],
        type,
      };
    }

    const facetValues: FacetValue[] = [];

    if (type === "terms") {
      // Count occurrences
      const counts = new Map<string, number>();

      for (const doc of this.documents.values()) {
        const value = doc[field];

        if (Array.isArray(value)) {
          for (const v of value) {
            counts.set(String(v), (counts.get(String(v)) || 0) + 1);
          }
        } else if (value !== null && value !== undefined) {
          counts.set(String(value), (counts.get(String(value)) || 0) + 1);
        }
      }

      // Sort by count
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

      for (const [value, count] of sorted) {
        facetValues.push({
          value,
          label: value,
          count,
          selected: false,
        });
      }
    } else if (type === "range") {
      // Generate range buckets
      const numbers = Array.from(metadata.uniqueValues)
        .filter((v) => typeof v === "number")
        .sort((a, b) => a - b);

      if (numbers.length > 0) {
        const min = numbers[0];
        const max = numbers[numbers.length - 1];
        const range = max - min;
        const bucketSize = Math.ceil(range / 5); // 5 buckets

        for (let i = 0; i < 5; i++) {
          const start = min + i * bucketSize;
          const end = start + bucketSize;
          const count = numbers.filter(
            (n) => n >= start && n < end
          ).length;

          facetValues.push({
            value: { start, end },
            label: `${start} - ${end}`,
            count,
            selected: false,
          });
        }
      }
    }

    const facet: Facet = {
      name: field,
      field,
      values: facetValues,
      type,
    };

    this.facets.set(field, facet);
    return facet;
  }

  /**
   * Filter documents with multiple criteria
   */
  filter(
    filters: FilterCriteria[],
    options: {
      facetFields?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): FilterResult {
    let results = Array.from(this.documents.values());

    // Apply filters
    for (const filter of filters) {
      results = results.filter((doc) =>
        this.evaluateFilter(doc, filter)
      );
    }

    const totalCount = results.length;

    // Generate facets for remaining documents
    const facets: Facet[] = [];
    if (options.facetFields) {
      for (const field of options.facetFields) {
        const facet = this.generateFacet(field, "terms");
        // Filter facet counts based on current results
        const docIds = results.map((d) => this.getDocumentId(d));
        facet.values = facet.values.map((fv) => ({
          ...fv,
          count: results.filter((doc) => {
            const value = doc[field];
            if (Array.isArray(value)) {
              return value.includes(fv.value);
            }
            return String(value) === String(fv.value);
          }).length,
        }));
        facets.push(facet);
      }
    }

    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      documents: paginatedResults,
      facets,
      totalCount,
      appliedFilters: filters,
    };
  }

  /**
   * Evaluate single filter
   */
  private evaluateFilter(document: any, filter: FilterCriteria): boolean {
    const value = document[filter.field];

    switch (filter.operator) {
      case "eq":
        if (Array.isArray(value)) {
          return value.includes(filter.value);
        }
        return value === filter.value;

      case "ne":
        if (Array.isArray(value)) {
          return !value.includes(filter.value);
        }
        return value !== filter.value;

      case "gt":
        return value > filter.value;

      case "gte":
        return value >= filter.value;

      case "lt":
        return value < filter.value;

      case "lte":
        return value <= filter.value;

      case "in":
        if (Array.isArray(value)) {
          return value.some((v) => filter.value.includes(v));
        }
        return filter.value.includes(value);

      case "nin":
        if (Array.isArray(value)) {
          return !value.some((v) => filter.value.includes(v));
        }
        return !filter.value.includes(value);

      case "range":
        const { start, end } = filter.value;
        return value >= start && value < end;

      default:
        return true;
    }
  }

  /**
   * Get document ID (utility)
   */
  private getDocumentId(doc: any): string {
    return doc.id || doc._id || JSON.stringify(doc);
  }

  /**
   * Get available facets
   */
  getAvailableFacets(fields: string[] = []): Facet[] {
    if (fields.length === 0) {
      return Array.from(this.facets.values());
    }

    return fields
      .map((f) => this.facets.get(f))
      .filter((f) => f !== undefined) as Facet[];
  }

  /**
   * Create range filter
   */
  createRangeFilter(
    field: string,
    start: number,
    end: number
  ): FilterCriteria {
    return {
      field,
      operator: "range",
      value: { start, end },
    };
  }

  /**
   * Create multi-select filter
   */
  createMultiSelectFilter(
    field: string,
    values: any[]
  ): FilterCriteria {
    return {
      field,
      operator: "in",
      value: values,
    };
  }

  /**
   * Create comparison filter
   */
  createComparisonFilter(
    field: string,
    operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte",
    value: any
  ): FilterCriteria {
    return {
      field,
      operator,
      value,
    };
  }

  /**
   * Get filter suggestions
   */
  getFilterSuggestions(field: string): string[] {
    const facet = this.facets.get(field);
    if (!facet) {
      return [];
    }

    return facet.values
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((v) => String(v.value));
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    for (const facet of this.facets.values()) {
      facet.values.forEach((v) => {
        v.selected = false;
      });
    }
  }

  /**
   * Get applied filters summary
   */
  getFiltersSummary(filters: FilterCriteria[]): string {
    return filters
      .map((f) => `${f.field} ${f.operator} ${f.value}`)
      .join(" AND ");
  }

  /**
   * Batch filter operation
   */
  batchFilter(
    filterGroups: FilterCriteria[][],
    facetFields?: string[]
  ): FilterResult[] {
    return filterGroups.map((filters) =>
      this.filter(filters, { facetFields })
    );
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.size,
      totalFields: this.fieldMetadata.size,
      totalFacets: this.facets.size,
      fieldDistribution: Array.from(this.fieldMetadata.entries()).map(
        ([field, metadata]) => ({
          field,
          type: metadata.type,
          uniqueValues: metadata.uniqueValues.size,
        })
      ),
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.documents.clear();
    this.facets.clear();
    this.fieldMetadata.clear();
  }
}

/**
 * Singleton instance
 */
let facetedEngine: FacetedSearchEngine | null = null;

export function getFacetedSearchEngine(): FacetedSearchEngine {
  if (!facetedEngine) {
    facetedEngine = new FacetedSearchEngine();
  }
  return facetedEngine;
}

export function resetFacetedSearchEngine(): void {
  facetedEngine = null;
}
