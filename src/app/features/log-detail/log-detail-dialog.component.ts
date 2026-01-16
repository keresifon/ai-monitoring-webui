import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { LogEntry, LOG_LEVEL_COLORS } from '../../shared/models/log.model';

/**
 * Log Detail Dialog Component
 * Displays detailed information about a log entry
 */
@Component({
  selector: 'app-log-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>description</mat-icon>
      Log Details
    </h2>
    
    <mat-dialog-content class="log-detail-content">
      <div class="detail-section">
        <h3>Basic Information</h3>
        <div class="detail-row">
          <span class="label">ID:</span>
          <span class="value">{{ log.id }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Timestamp:</span>
          <span class="value">{{ formatTimestamp(log.timestamp) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Level:</span>
          <mat-chip [style.background-color]="getLogLevelColor(log.level)">
            {{ log.level }}
          </mat-chip>
        </div>
        <div class="detail-row">
          <span class="label">Service:</span>
          <span class="value">{{ log.service }}</span>
        </div>
        <div class="detail-row" *ngIf="log.environment">
          <span class="label">Environment:</span>
          <span class="value">{{ log.environment }}</span>
        </div>
        <div class="detail-row" *ngIf="log.host">
          <span class="label">Host:</span>
          <span class="value">{{ log.host }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="detail-section">
        <h3>Message</h3>
        <div class="message-content">
          {{ log.message }}
        </div>
      </div>

      <mat-divider *ngIf="log.metadata && hasMetadata()"></mat-divider>

      <div class="detail-section" *ngIf="log.metadata && hasMetadata()">
        <h3>Metadata</h3>
        <div class="metadata-content">
          <pre>{{ formatMetadata(log.metadata) }}</pre>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>
      <button mat-raised-button color="primary" (click)="copyToClipboard()">
        <mat-icon>content_copy</mat-icon>
        Copy
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .log-detail-content {
      min-width: 500px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .detail-section {
      margin: 16px 0;
    }

    .detail-section h3 {
      margin: 0 0 12px 0;
      color: rgba(0, 0, 0, 0.87);
      font-size: 16px;
      font-weight: 500;
    }

    .detail-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 12px;
    }

    .detail-row .label {
      font-weight: 500;
      min-width: 120px;
      color: rgba(0, 0, 0, 0.6);
    }

    .detail-row .value {
      flex: 1;
      word-break: break-word;
    }

    .message-content {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }

    .metadata-content {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      overflow-x: auto;
    }

    .metadata-content pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }

    mat-chip {
      color: white;
      font-weight: 500;
    }

    mat-divider {
      margin: 16px 0;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class LogDetailDialogComponent {
  readonly logLevelColors = LOG_LEVEL_COLORS;

  constructor(
    public dialogRef: MatDialogRef<LogDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public log: LogEntry
  ) {}

  /**
   * Close dialog
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Copy log details to clipboard
   */
  copyToClipboard(): void {
    const logText = JSON.stringify(this.log, null, 2);
    navigator.clipboard.writeText(logText).then(() => {
      // Could show a snackbar here
      console.log('Log copied to clipboard');
    });
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get log level color
   */
  getLogLevelColor(level: string): string {
    return this.logLevelColors[level as keyof typeof this.logLevelColors] || '#000000';
  }

  /**
   * Check if metadata exists and has properties
   */
  hasMetadata(): boolean {
    return this.log.metadata !== undefined && 
           Object.keys(this.log.metadata).length > 0;
  }

  /**
   * Format metadata for display
   */
  formatMetadata(metadata: Record<string, any>): string {
    return JSON.stringify(metadata, null, 2);
  }
}

// Made with Bob
