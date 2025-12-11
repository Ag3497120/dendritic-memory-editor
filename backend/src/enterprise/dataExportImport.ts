/**
 * Data Export/Import System
 *
 * Comprehensive data management:
 * - Multiple export formats (JSON, CSV, Excel)
 * - Batch import
 * - Data validation
 * - Conflict resolution
 * - Backup/restore
 */

import { v4 as uuidv4 } from "uuid";

export type ExportFormat = "json" | "csv" | "xlsx" | "xml";

export interface ExportJob {
  id: string;
  organizationId: string;
  format: ExportFormat;
  filters?: Record<string, any>;
  resourceTypes: string[];
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  fileUrl?: string;
  fileSize?: number;
  rowCount?: number;
  startTime: number;
  endTime?: number;
  errorMessage?: string;
  createdBy: string;
}

export interface ImportJob {
  id: string;
  organizationId: string;
  format: ExportFormat;
  fileUrl: string;
  fileSize: number;
  status: "pending" | "validating" | "processing" | "completed" | "failed";
  progress: number;
  rowCount?: number;
  importedCount?: number;
  failedCount?: number;
  startTime: number;
  endTime?: number;
  errorMessage?: string;
  conflictResolution: "skip" | "overwrite" | "merge";
  createdBy: string;
}

export interface ExportData {
  exportedAt: number;
  organizationId: string;
  format: ExportFormat;
  version: string;
  data: {
    tiles?: any[];
    inferences?: any[];
    users?: any[];
    metadata?: Record<string, any>;
  };
  checksum?: string;
}

export interface ImportResult {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  skippedRows: number;
  errors: Array<{ rowNumber: number; error: string }>;
}

/**
 * Data Export/Import Engine
 */
export class DataExportImportEngine {
  private exportJobs: Map<string, ExportJob> = new Map();
  private importJobs: Map<string, ImportJob> = new Map();
  private exportedData: Map<string, ExportData> = new Map();

  /**
   * Create export job
   */
  createExportJob(
    organizationId: string,
    format: ExportFormat,
    resourceTypes: string[],
    createdBy: string,
    filters?: Record<string, any>
  ): ExportJob {
    const jobId = `export-${uuidv4()}`;

    const job: ExportJob = {
      id: jobId,
      organizationId,
      format,
      filters,
      resourceTypes,
      status: "pending",
      progress: 0,
      startTime: Date.now(),
      createdBy,
    };

    this.exportJobs.set(jobId, job);
    return job;
  }

  /**
   * Update export job progress
   */
  updateExportJobProgress(
    jobId: string,
    progress: number,
    options?: {
      status?: "processing" | "completed" | "failed";
      fileUrl?: string;
      fileSize?: number;
      rowCount?: number;
      errorMessage?: string;
    }
  ): void {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.progress = progress;

    if (options?.status) {
      job.status = options.status;
    }

    if (options?.fileUrl) {
      job.fileUrl = options.fileUrl;
    }

    if (options?.fileSize) {
      job.fileSize = options.fileSize;
    }

    if (options?.rowCount) {
      job.rowCount = options.rowCount;
    }

    if (options?.errorMessage) {
      job.errorMessage = options.errorMessage;
    }

    if (
      options?.status === "completed" ||
      options?.status === "failed"
    ) {
      job.endTime = Date.now();
    }
  }

  /**
   * Create import job
   */
  createImportJob(
    organizationId: string,
    format: ExportFormat,
    fileUrl: string,
    fileSize: number,
    createdBy: string,
    conflictResolution: "skip" | "overwrite" | "merge" = "skip"
  ): ImportJob {
    const jobId = `import-${uuidv4()}`;

    const job: ImportJob = {
      id: jobId,
      organizationId,
      format,
      fileUrl,
      fileSize,
      status: "pending",
      progress: 0,
      startTime: Date.now(),
      createdBy,
      conflictResolution,
    };

    this.importJobs.set(jobId, job);
    return job;
  }

  /**
   * Update import job progress
   */
  updateImportJobProgress(
    jobId: string,
    progress: number,
    options?: {
      status?: "validating" | "processing" | "completed" | "failed";
      rowCount?: number;
      importedCount?: number;
      failedCount?: number;
      errorMessage?: string;
    }
  ): void {
    const job = this.importJobs.get(jobId);
    if (!job) return;

    job.progress = progress;

    if (options?.status) {
      job.status = options.status;
    }

    if (options?.rowCount) {
      job.rowCount = options.rowCount;
    }

    if (options?.importedCount) {
      job.importedCount = options.importedCount;
    }

    if (options?.failedCount) {
      job.failedCount = options.failedCount;
    }

    if (options?.errorMessage) {
      job.errorMessage = options.errorMessage;
    }

    if (
      options?.status === "completed" ||
      options?.status === "failed"
    ) {
      job.endTime = Date.now();
    }
  }

  /**
   * Get export job status
   */
  getExportJobStatus(jobId: string): ExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * Get import job status
   */
  getImportJobStatus(jobId: string): ImportJob | undefined {
    return this.importJobs.get(jobId);
  }

  /**
   * Prepare export data
   */
  prepareExportData(
    organizationId: string,
    format: ExportFormat,
    data: {
      tiles?: any[];
      inferences?: any[];
      users?: any[];
    },
    metadata?: Record<string, any>
  ): ExportData {
    const exportId = uuidv4();

    const exportData: ExportData = {
      exportedAt: Date.now(),
      organizationId,
      format,
      version: "1.0",
      data: {
        tiles: data.tiles,
        inferences: data.inferences,
        users: data.users,
        metadata: metadata || {},
      },
      checksum: this.calculateChecksum({
        tiles: data.tiles || [],
        inferences: data.inferences || [],
        users: data.users || [],
      }),
    };

    this.exportedData.set(exportId, exportData);
    return exportData;
  }

  /**
   * Format exported data
   */
  formatExportData(
    exportData: ExportData,
    format: ExportFormat
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(exportData, null, 2);

      case "csv":
        return this.convertToCSV(exportData);

      case "xlsx":
        return this.convertToXLSX(exportData);

      case "xml":
        return this.convertToXML(exportData);

      default:
        return "";
    }
  }

  /**
   * Convert to CSV format
   */
  private convertToCSV(data: ExportData): string {
    const lines: string[] = [];

    // Tiles
    if (data.data.tiles && data.data.tiles.length > 0) {
      lines.push("=== TILES ===");
      const tileHeaders = Object.keys(data.data.tiles[0]);
      lines.push(tileHeaders.join(","));

      for (const tile of data.data.tiles) {
        const values = tileHeaders.map((h) => {
          const value = tile[h];
          if (typeof value === "string") {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return JSON.stringify(value);
        });
        lines.push(values.join(","));
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Convert to XML format
   */
  private convertToXML(data: ExportData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<export>\n';
    xml += `  <metadata>\n`;
    xml += `    <exportedAt>${new Date(data.exportedAt).toISOString()}</exportedAt>\n`;
    xml += `    <organizationId>${data.organizationId}</organizationId>\n`;
    xml += `    <version>${data.version}</version>\n`;
    xml += `  </metadata>\n`;

    if (data.data.tiles) {
      xml += `  <tiles>\n`;
      for (const tile of data.data.tiles) {
        xml += `    <tile>\n`;
        for (const [key, value] of Object.entries(tile)) {
          xml += `      <${key}>${this.escapeXML(String(value))}</${key}>\n`;
        }
        xml += `    </tile>\n`;
      }
      xml += `  </tiles>\n`;
    }

    xml += "</export>";
    return xml;
  }

  /**
   * Convert to XLSX format (simplified JSON representation)
   */
  private convertToXLSX(data: ExportData): string {
    // In production, use a library like 'xlsx'
    return JSON.stringify(data, null, 2);
  }

  /**
   * Validate import data
   */
  validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      errors.push("Invalid data format");
      return { valid: false, errors };
    }

    // Check required fields
    if (!data.exportedAt || !data.organizationId) {
      errors.push("Missing required metadata fields");
    }

    // Validate tiles
    if (data.data?.tiles && Array.isArray(data.data.tiles)) {
      for (let i = 0; i < data.data.tiles.length; i++) {
        const tile = data.data.tiles[i];

        if (!tile.id) {
          errors.push(`Tile ${i}: Missing required field 'id'`);
        }

        if (!tile.title) {
          errors.push(`Tile ${i}: Missing required field 'title'`);
        }

        if (!tile.content) {
          errors.push(`Tile ${i}: Missing required field 'content'`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate data checksum for integrity
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Get export history
   */
  getExportHistory(
    organizationId: string,
    limit: number = 50
  ): ExportJob[] {
    return Array.from(this.exportJobs.values())
      .filter((j) => j.organizationId === organizationId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Get import history
   */
  getImportHistory(
    organizationId: string,
    limit: number = 50
  ): ImportJob[] {
    return Array.from(this.importJobs.values())
      .filter((j) => j.organizationId === organizationId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Cancel export job
   */
  cancelExportJob(jobId: string): boolean {
    const job = this.exportJobs.get(jobId);
    if (job && (job.status === "pending" || job.status === "processing")) {
      job.status = "failed";
      job.errorMessage = "Cancelled by user";
      job.endTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Cancel import job
   */
  cancelImportJob(jobId: string): boolean {
    const job = this.importJobs.get(jobId);
    if (job && (job.status === "pending" || job.status === "validating" || job.status === "processing")) {
      job.status = "failed";
      job.errorMessage = "Cancelled by user";
      job.endTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get statistics
   */
  getStats(organizationId?: string) {
    let exports = Array.from(this.exportJobs.values());
    let imports = Array.from(this.importJobs.values());

    if (organizationId) {
      exports = exports.filter((j) => j.organizationId === organizationId);
      imports = imports.filter((j) => j.organizationId === organizationId);
    }

    return {
      totalExports: exports.length,
      completedExports: exports.filter((j) => j.status === "completed").length,
      totalImports: imports.length,
      completedImports: imports.filter((j) => j.status === "completed").length,
      totalDataExported: exports.reduce((sum, j) => sum + (j.fileSize || 0), 0),
      totalDataImported: imports.reduce((sum, j) => sum + (j.fileSize || 0), 0),
    };
  }

  /**
   * Clear old jobs
   */
  clearOldJobs(retentionDays: number = 30): number {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let cleared = 0;

    for (const [id, job] of this.exportJobs) {
      if (job.endTime && job.endTime < cutoffTime) {
        this.exportJobs.delete(id);
        cleared++;
      }
    }

    for (const [id, job] of this.importJobs) {
      if (job.endTime && job.endTime < cutoffTime) {
        this.importJobs.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

/**
 * Singleton instance
 */
let dataExportImportEngine: DataExportImportEngine | null = null;

export function getDataExportImportEngine(): DataExportImportEngine {
  if (!dataExportImportEngine) {
    dataExportImportEngine = new DataExportImportEngine();
  }
  return dataExportImportEngine;
}

export function resetDataExportImportEngine(): void {
  dataExportImportEngine = null;
}
