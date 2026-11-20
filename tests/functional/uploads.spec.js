import { describe, it } from 'mocha';
import { expect } from 'chai';
import path from 'node:path';
import { stat, readdir } from 'node:fs/promises';
import { api, assertApiError, assertSuccess, createTestOrder, createTestUser } from './support.js';
import DeliveryModel from '../../src/models/delivery.model.js';
import UserModel from '../../src/models/user.model.js';
import { uploadsRepository } from '../../src/repositories/uploads.repository.js';

const FILE_MAX_BYTES = 5 * 1024 * 1024;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const totalFiles = async directory => {
  try { return (await readdir(path.join(process.env.UPLOADS_DIR, directory))).length; }
  catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
};
const filePath = relativePath => path.join(process.env.UPLOADS_DIR, ...relativePath.split('/'));

const createDelivery = async () => {
  const order = await createTestOrder();
  const saved = await DeliveryModel.create({
    order: order._id,
    trackingCode: `DOC-${order._id}`,
    status: 'pending',
    courier: null
  });
  return saved.toObject();
};

describe('Carga de archivos de usuarios', () => {
  it('guarda un PDF y registra los metadatos en MongoDB', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'identity')
      .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertSuccess(response, 201);
    const documents = response.body.payload.documents;
    expect(documents).to.be.an('array').with.lengthOf(1);
    const metadata = documents[0];
    expect(metadata).to.include({ originalName: 'dni.pdf', mimeType: 'application/pdf', size: PDF.length, documentType: 'identity' });
    expect(metadata.storedName).to.match(/^[0-9a-f-]{36}\.pdf$/);
    expect(metadata.relativePath).to.match(/^users\/documents\/[0-9a-f-]{36}\.pdf$/);
    expect(new Date(metadata.uploadedAt).toString()).not.to.equal('Invalid Date');
    expect((await stat(filePath(metadata.relativePath))).size).to.equal(PDF.length);
    const stored = await UserModel.findById(user._id).lean();
    expect(stored.documents).to.have.lengthOf(1);
    expect(stored.documents[0].storedName).to.equal(metadata.storedName);
    const readResponse = await api().get(`/api/users/${user._id}`);
    assertSuccess(readResponse);
    expect(readResponse.body.payload.documents).to.have.lengthOf(1);
  });

  it('admite JPG como licencia y conserva el tipo de documento', async () => {
    const user = await createTestUser();
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'license')
      .attach('file', jpeg, { filename: 'licencia.jpeg', contentType: 'image/jpeg' });
    assertSuccess(response, 201);
    expect(response.body.payload.documents[0].documentType).to.equal('license');
    expect(response.body.payload.documents[0].storedName).to.match(/\.jpg$/);
    expect(response.body.payload.documents[0].relativePath).to.match(/^users\/licenses\//);
  });

  it('admite varios documentos del mismo usuario sin sobrescribir los anteriores', async () => {
    const user = await createTestUser();
    for (const documentType of ['identity', 'other']) {
      const response = await api().post(`/api/users/${user._id}/documents`)
        .field('documentType', documentType)
        .attach('file', PDF, { filename: `${documentType}.pdf`, contentType: 'application/pdf' });
      assertSuccess(response, 201);
    }
    const saved = await UserModel.findById(user._id).lean();
    expect(saved.documents).to.have.lengthOf(2);
    expect(new Set(saved.documents.map(doc => doc.storedName)).size).to.equal(2);
    expect(await totalFiles('users/documents')).to.equal(2);
  });

  it('rechaza la falta de documentType y elimina el archivo', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertApiError(response, 400, 'DOCUMENT_TYPE_INVALID');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza falta de archivo', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'identity');
    assertApiError(response, 400, 'FILE_REQUIRED');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza tipo de documento inválido y elimina el archivo guardado', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'unlisted')
      .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertApiError(response, 400, 'DOCUMENT_TYPE_INVALID');
    expect(await totalFiles('users/documents')).to.equal(0);
    expect((await UserModel.findById(user._id).lean()).documents).to.have.lengthOf(0);
  });

  it('rechaza MIME/extensión no admitidos sin guardar', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'other')
      .attach('file', Buffer.from('texto plano'), { filename: 'archivo.txt', contentType: 'text/plain' });
    assertApiError(response, 400, 'FILE_TYPE_INVALID');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza archivos cuyo contenido no coincide con el tipo declarado', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'identity')
      .attach('file', Buffer.from('contenido que no es PDF'), { filename: 'falso.pdf', contentType: 'application/pdf' });
    assertApiError(response, 400, 'FILE_TYPE_INVALID');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza archivos mayores a 5 MB', async () => {
    const user = await createTestUser();
    const data = Buffer.concat([PDF, Buffer.alloc(FILE_MAX_BYTES)]);
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'identity')
      .attach('file', data, { filename: 'grande.pdf', contentType: 'application/pdf' });
    assertApiError(response, 413, 'FILE_TOO_LARGE');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza el nombre incorrecto del campo de archivo', async () => {
    const user = await createTestUser();
    const response = await api().post(`/api/users/${user._id}/documents`)
      .field('documentType', 'identity')
      .attach('documento', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertApiError(response, 400, 'FILE_FIELD_INVALID');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('rechaza usuarios inexistentes antes de escribir en disco', async () => {
    const response = await api().post('/api/users/507f1f77bcf86cd799439011/documents')
      .field('documentType', 'identity')
      .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertApiError(response, 404, 'USER_NOT_FOUND');
    expect(await totalFiles('users/documents')).to.equal(0);
  });

  it('elimina el archivo si falla la persistencia de sus metadatos', async () => {
    const user = await createTestUser();
    const previous = uploadsRepository.appendUserDocument;
    uploadsRepository.appendUserDocument = async () => { throw new Error('Error simulado al guardar'); };
    try {
      const response = await api().post(`/api/users/${user._id}/documents`)
        .field('documentType', 'identity')
        .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
      assertApiError(response, 500, 'FILE_SAVE_FAILED');
      expect(await totalFiles('users/documents')).to.equal(0);
      expect((await UserModel.findById(user._id).lean()).documents).to.have.lengthOf(0);
    } finally {
      uploadsRepository.appendUserDocument = previous;
    }
  });

  it('rechaza ID inválido con error centralizado', async () => {
    const response = await api().post('/api/users/incorrecto/documents')
      .field('documentType', 'identity')
      .attach('file', PDF, { filename: 'dni.pdf', contentType: 'application/pdf' });
    assertApiError(response, 400, 'INVALID_ID');
  });
});

describe('Comprobantes de entregas', () => {
  it('almacena un PNG y asocia su metadata a la entrega', async () => {
    const delivery = await createDelivery();
    const response = await api().post(`/api/deliveries/${delivery._id}/proofs`)
      .attach('file', PNG, { filename: 'comprobante.png', contentType: 'image/png' });
    assertSuccess(response, 201);
    const proofs = response.body.payload.proofs;
    expect(proofs).to.be.an('array').with.lengthOf(1);
    expect(proofs[0]).to.include({ documentType: 'delivery_proof', mimeType: 'image/png', originalName: 'comprobante.png' });
    expect((await stat(filePath(proofs[0].relativePath))).size).to.equal(PNG.length);
    expect((await DeliveryModel.findById(delivery._id).lean()).proofs).to.have.lengthOf(1);
  });

  it('rechaza ausencia de comprobante', async () => {
    const delivery = await createDelivery();
    const response = await api().post(`/api/deliveries/${delivery._id}/proofs`).set('Content-Type', 'multipart/form-data; boundary=test').send('--test--\r\n');
    assertApiError(response, 400, 'FILE_REQUIRED');
    expect(await totalFiles('deliveries/proofs')).to.equal(0);
  });

  it('rechaza comprobantes para entregas inexistentes', async () => {
    const response = await api().post('/api/deliveries/507f1f77bcf86cd799439011/proofs')
      .attach('file', PNG, { filename: 'comprobante.png', contentType: 'image/png' });
    assertApiError(response, 404, 'DELIVERY_NOT_FOUND');
    expect(await totalFiles('deliveries/proofs')).to.equal(0);
  });

  it('rechaza campos adicionales en comprobantes', async () => {
    const delivery = await createDelivery();
    const response = await api().post(`/api/deliveries/${delivery._id}/proofs`)
      .field('documentType', 'identity')
      .attach('file', PNG, { filename: 'comprobante.png', contentType: 'image/png' });
    assertApiError(response, 400, 'FILE_FIELD_INVALID');
    expect(await totalFiles('deliveries/proofs')).to.equal(0);
  });
});
