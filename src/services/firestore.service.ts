import { Firestore, WhereFilterOp, WriteResult } from '@google-cloud/firestore';
import { Result } from '../models';

export class FirestoreService {

  private firestore: Firestore;

  constructor() {
    this.firestore = new Firestore({
      projectId: 'mad-movie-bot-slack-alpha',
      credentials: {
        private_key: this.sanitizePrivateKey(process.env.FIRESTORE_PRIVATE_KEY),
        client_email: process.env.FIRESTORE_CLIENT_EMAIL
      }
    });
    const settings = { timestampsInSnapshots: true };
    this.firestore.settings(settings);
  }

  async getDocumentFromCollection<T>(collectionPath: string, field: string, operator: WhereFilterOp, value: string): Promise<Result<T>> {
    let result: Result<T>;
    const docs: T[] = [];
    try {
      const documentsRaw = await this.firestore.collection(collectionPath).where(field, operator, value).limit(1).get();
      documentsRaw.docs.forEach(doc => {
        docs.push(doc.data() as T);
        // console.log('doc.data()', doc.data());
      });

      result = {
        success: true,
        data: docs[0]
      };
    } catch (error) {
      result = {
        success: false,
        error: error,
        message: `Error in calling this.firestore.collection(${collectionPath}).where(${field}, ${operator}, ${value}).get()`
      };
      console.log(`Error in calling this.firestore.collection(${collectionPath}).where(${field}, ${operator}, ${value}).get()`);
      throw new Error(error);
    }

    return result;
  }

  async createDocument<T>(collectionPath: string, data: T, docId?: string, merge?: boolean): Promise<WriteResult> {
    return await this.firestore.collection(collectionPath).doc(docId).set(data, { merge });
  }

  private sanitizePrivateKey(key: string): string {
    return key.replace(/\\n/g, '\n');
  }

}
