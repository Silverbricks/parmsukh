import "server-only";
import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DIR = path.resolve(process.env.STORAGE_DIR ?? "./storage");
const ALLOWED: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD = 10 * 1024 * 1024;

// Magic-byte check so a renamed executable can't be uploaded as a "PDF".
function sniff(buf: Buffer) {
  if (buf.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** Stores an upload outside the public web root. Encryption at rest should be provided by the storage volume / bucket in production. */
export async function storeUpload(file: File) {
  if (!file || file.size === 0) return { error: "Please choose a file." } as const;
  if (file.size > MAX_UPLOAD) return { error: "File is larger than 10 MB." } as const;
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !ALLOWED[mime]) return { error: "Only PDF, JPG, PNG or WEBP files are allowed." } as const;
  await mkdir(DIR, { recursive: true });
  const storedName = `${randomBytes(16).toString("hex")}.${ALLOWED[mime]}`;
  await writeFile(path.join(DIR, storedName), buf);
  return { storedName, mime, size: buf.length, fileName: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) } as const;
}

export async function readUpload(storedName: string) {
  if (!/^[a-f0-9]{32}\.(pdf|jpg|png|webp)$/.test(storedName)) throw new Error("bad name");
  return readFile(path.join(DIR, storedName));
}
