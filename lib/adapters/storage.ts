import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config";

/**
 * Object storage adapter. Mock implementation writes to the local
 * filesystem under /public/uploads; a live implementation would swap in an
 * S3-compatible client behind this same interface.
 */

export interface StorageAdapter {
  putObject(input: { buffer: Buffer; filename: string; contentType: string }): Promise<{ url: string }>;
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

class LocalStorageAdapter implements StorageAdapter {
  async putObject(input: { buffer: Buffer; filename: string; contentType: string }) {
    if (!ALLOWED_TYPES.has(input.contentType)) {
      throw new Error("Unsupported file type");
    }
    if (input.buffer.byteLength > MAX_BYTES) {
      throw new Error("File too large");
    }
    const ext = path.extname(input.filename) || ".bin";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), input.buffer);
    return { url: `/uploads/${safeName}` };
  }
}

export function getStorageAdapter(): StorageAdapter {
  // In production, live mode would instantiate an S3-compatible client here
  // using the same interface.
  return new LocalStorageAdapter();
}
