import { before, after, beforeEach } from 'mocha';
import mongoose from 'mongoose';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { setApp } from './support.js';

let temporaryDatabase;
let uploadsDirectory;

before(async function () {
  this.timeout(120000);
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  uploadsDirectory = await mkdtemp(path.join(os.tmpdir(), 'shipnow-uploads-test-'));
  process.env.UPLOADS_DIR = uploadsDirectory;
  temporaryDatabase = await MongoMemoryServer.create();
  process.env.MONGODB_URI = temporaryDatabase.getUri('shipnow_test');

  if (!process.env.MONGODB_URI.startsWith('mongodb://127.0.0.1:')) {
    throw new Error('La base de testing debe ejecutarse exclusivamente en localhost');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const { default: app } = await import('../../src/app.js');
  setApp(app);
});

beforeEach(async () => {
  if (process.env.NODE_ENV !== 'test' || !temporaryDatabase) {
    throw new Error('El entorno de pruebas no está aislado');
  }
  await rm(uploadsDirectory, { recursive: true, force: true });
  await mkdir(uploadsDirectory, { recursive: true });
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();
  if (temporaryDatabase) {
    await temporaryDatabase.stop();
  }
  if (uploadsDirectory) await rm(uploadsDirectory, { recursive: true, force: true });
});
