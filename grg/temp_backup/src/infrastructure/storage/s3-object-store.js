const crypto = require('node:crypto');

class S3ObjectStore {
  constructor({ client, bucket, commands }) {
    if (!client || !bucket) throw new Error('S3ObjectStore requires client and bucket');
    this.client = client;
    this.bucket = bucket;
    this.commands = commands;
  }

  static create(options = {}) {
    const sdk = require('@aws-sdk/client-s3');
    const client = new sdk.S3Client({
      endpoint: options.endpoint,
      region: options.region || 'us-east-1',
      forcePathStyle: options.forcePathStyle !== false,
      credentials: options.accessKeyId ? {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      } : undefined,
    });
    return new S3ObjectStore({
      client, bucket: options.bucket,
      commands: {
        PutObjectCommand: sdk.PutObjectCommand,
        GetObjectCommand: sdk.GetObjectCommand,
        HeadBucketCommand: sdk.HeadBucketCommand,
        CreateBucketCommand: sdk.CreateBucketCommand,
      },
    });
  }

  async initialize() {
    try {
      await this.client.send(new this.commands.HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      const missing = status === 404 || ['NotFound', 'NoSuchBucket'].includes(error?.name);
      if (!missing || !this.commands.CreateBucketCommand) throw error;
      await this.client.send(new this.commands.CreateBucketCommand({ Bucket: this.bucket }));
    }
    return this;
  }

  key(tenantId, category, name) {
    const clean = [tenantId, category, name].map((part) => String(part || '').replace(/^\/+|\/+$/g, ''));
    if (clean.some((part) => !part || part.includes('..'))) throw new Error('invalid object key');
    return clean.join('/');
  }

  async put(tenantId, category, name, body, contentType = 'application/octet-stream') {
    const key = this.key(tenantId, category, name);
    const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const command = new this.commands.PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType,
      Metadata: { sha256, tenant: tenantId },
    });
    const result = await this.client.send(command);
    return { key, sha256, etag: result.ETag || null, size: bytes.length };
  }

  async get(tenantId, category, name) {
    const key = this.key(tenantId, category, name);
    const command = new this.commands.GetObjectCommand({ Bucket: this.bucket, Key: key });
    const result = await this.client.send(command);
    const bytes = Buffer.from(await result.Body.transformToByteArray());
    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    if (result.Metadata?.sha256 && result.Metadata.sha256 !== actual) throw new Error('object checksum mismatch');
    return { key, body: bytes, contentType: result.ContentType, sha256: actual };
  }

  async health() {
    await this.client.send(new this.commands.HeadBucketCommand({ Bucket: this.bucket }));
    return { ok: true, adapter: 's3', bucket: this.bucket };
  }

  close() {
    this.client.destroy?.();
  }
}

module.exports = { S3ObjectStore };
