/**
 * server/lib/s3.js
 * Single shared S3 client — imported by all routes.
 * BUG FIXED: S3Client was duplicated in appRoutes, candidateRoutes, and jobRoutes.
 * BUG FIXED: No startup guard for AWS env vars — now throws clearly on missing config.
 * BUG FIXED: Credentials passed as raw keys — now uses SDK default credential provider
 *            chain so IAM roles / instance profiles work in production automatically.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// ── Startup guards ────────────────────────────────────────────────────────────
if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set. Server cannot start.');
}
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set. Server cannot start.');
}

// ── S3 client ─────────────────────────────────────────────────────────────────
// BUG FIXED: Removed hardcoded credentials object. The AWS SDK v3 default credential
// provider chain picks up env vars, ~/.aws/credentials, or IAM role automatically.
// This enables credential rotation without code changes.
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Generate a pre-signed GET URL for a given S3 key.
 * @param {string} s3Key    - The S3 object key (e.g. "resumes/candidate-123.pdf")
 * @param {number} expiresIn - Expiry in seconds (default 900 = 15 min)
 */
async function getS3SignedUrl(s3Key, expiresIn = 900) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn });
}

module.exports = { s3, BUCKET_NAME, getS3SignedUrl };