// server/utils/r2Storage.js
//
// Single source of truth for talking to Cloudflare R2 (S3-compatible).
// Every resume/CV/profile-image upload path should go through this file
// instead of writing to local disk with multer.diskStorage.
//
// Why: local disk storage does not survive redeploys or multi-instance
// hosting, which is why uploaded resumes were disappearing. R2 gives us
// durable object storage; we keep the bucket PRIVATE and hand out
// short-lived signed URLs on demand instead of permanent public links,
// since resumes contain PII (name, email, phone).

import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

let _client = null;
let _warnedMissingEnv = false;

function isConfigured() {
  return REQUIRED_ENV.every((key) => !!process.env[key]);
}

function getClient() {
  if (_client) return _client;

  if (!isConfigured()) {
    if (!_warnedMissingEnv) {
      console.error(
        `R2 storage is not configured. Missing env vars: ${REQUIRED_ENV.filter(
          (k) => !process.env[k]
        ).join(", ")}`
      );
      _warnedMissingEnv = true;
    }
    throw new Error("R2 storage is not configured (missing env vars)");
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  return _client;
}

const BUCKET = () => process.env.R2_BUCKET_NAME;

export function buildObjectKey(prefix, ownerId, originalName) {
  const safeName = (originalName || "file")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const ownerPart = ownerId !== undefined && ownerId !== null ? `${ownerId}-` : "";
  return `${prefix.replace(/\/+$/, "")}/${ownerPart}${unique}-${safeName}`;
}

export async function uploadBufferToR2({ buffer, key, contentType, originalName }) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      ContentDisposition: originalName
        ? `inline; filename="${originalName.replace(/"/g, "")}"`
        : undefined,
    })
  );
  return key;
}

export async function getSignedDownloadUrl(key, { expiresIn = 300, downloadFilename } = {}) {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ...(downloadFilename
      ? { ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(/"/g, "")}"` }
      : {}),
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromR2(key) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

export async function objectExistsInR2(key) {
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function isExternalUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function isR2Key(value) {
  return typeof value === "string" && value.startsWith("r2:");
}

export function toR2Key(rawKey) {
  return `r2:${rawKey}`;
}

export function fromR2Key(prefixedKey) {
  return prefixedKey.startsWith("r2:") ? prefixedKey.slice(3) : prefixedKey;
}

export async function resolveResumeUrl(value, { downloadFilename, expiresIn = 300 } = {}) {
  if (!value) return null;
  if (isExternalUrl(value)) return value;
  if (isR2Key(value)) {
    return getSignedDownloadUrl(fromR2Key(value), { downloadFilename, expiresIn });
  }
  return value;
}

export { isConfigured as isR2Configured };
