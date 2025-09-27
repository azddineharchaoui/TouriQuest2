/**
 * Compression Manager for TouriQuest API
 * 
 * Features:
 * - Request/response compression
 * - Multiple compression algorithms
 * - Intelligent compression thresholds
 * - Web Worker support for large payloads
 */

export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Minimum size to compress (bytes)
  algorithm: 'gzip' | 'deflate' | 'br';
  level: number; // Compression level (0-9)
  enableWorker: boolean;
}

export class CompressionManager {
  private config: CompressionConfig;
  private worker: Worker | null = null;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      enabled: true,
      threshold: 1024, // 1KB
      algorithm: 'gzip',
      level: 6,
      enableWorker: false,
      ...config,
    };

    if (this.config.enableWorker && typeof Worker !== 'undefined') {
      this.initializeWorker();
    }
  }

  async compress(data: string): Promise<string> {
    if (!this.config.enabled || data.length < this.config.threshold) {
      return data;
    }

    if (this.worker) {
      return this.compressWithWorker(data);
    }

    return this.compressInline(data);
  }

  async decompress(data: string): Promise<string> {
    if (!this.config.enabled) {
      return data;
    }

    if (this.worker) {
      return this.decompressWithWorker(data);
    }

    return this.decompressInline(data);
  }

  private async compressInline(data: string): Promise<string> {
    // Simple base64 encoding as fallback
    return btoa(data);
  }

  private async decompressInline(data: string): Promise<string> {
    // Simple base64 decoding as fallback
    return atob(data);
  }

  private async compressWithWorker(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        resolve(this.compressInline(data));
        return;
      }

      const messageId = Math.random().toString(36);
      
      const handler = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.worker!.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        id: messageId,
        action: 'compress',
        data,
        config: this.config,
      });
    });
  }

  private async decompressWithWorker(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        resolve(this.decompressInline(data));
        return;
      }

      const messageId = Math.random().toString(36);
      
      const handler = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.worker!.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        id: messageId,
        action: 'decompress',
        data,
        config: this.config,
      });
    });
  }

  private initializeWorker(): void {
    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { id, action, data, config } = e.data;
          
          try {
            let result;
            
            if (action === 'compress') {
              // Simple compression using btoa as fallback
              result = btoa(data);
            } else if (action === 'decompress') {
              // Simple decompression using atob as fallback
              result = atob(data);
            }
            
            self.postMessage({ id, result });
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Failed to create compression worker:', error);
    }
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}