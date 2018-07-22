import { Firestore, WhereFilterOp, WriteResult } from '@google-cloud/firestore';
import { Result } from '../models';

export class FirestoreService {

  private firestore: Firestore;

  constructor() {
    this.firestore = new Firestore({
      projectId: 'mad-movie-bot-slack-alpha',
      credentials: {
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCJhd2NRyZKptg7\ne2XSE8NECq/jnkc2zMPpHCBfYpuyJCz8IjBT0ejs8fDzjhH8IsFCCii337gnlAwe\nsxkcNJer5YA7T19wJTs3OAfzVsE4iCK9r0tw9UFuKyBC3OdRjHDQBw44Kv2Nt6uR\ngw5iFfmBE+X+nMlNo3o/3yJJGRKRJEZ1IxjpROxMvkIrI0PBZF8slb20eSMrpmFa\nOStvX0eIkFLxgpGVh04K3Wud/deQjaqO6zHNG8QSQT/GVj9ejVgKsw7amICyPHQj\nmqVDTSbHg7aur7I27qSJafnLnAOA8iWrxCDwnjxzRJmkTYI0FKlJZ4PyRYaJvXuh\nuGb6jbsfAgMBAAECggEAATeSEmIC0L5RQ5V//S/3lm6Rx+3qq218fl+lWbLBtf3j\n+AdFbjh5Wz945m7ncdfM5gy494efVZpV0R+8pSdCAF9zlxLIwXFS6NYyG9E0vI9X\n313hyQoinhr7mhviYDJh/TVSxuR6gfqSJiOGyQ9wude3PV2d2nYL6uzKnOL/6xDn\nzB033R5CdDKx+mRMx/9LL4Rk4haVBIkOMFZgETGdvF5opS43+twkaV2J8G02WkuH\nGamP4trH/ARyiFrNael5o6mGlCmtZH1mK52xacfgzHRXi0cUCHxeTdWiFL55OtuJ\nJIh8/354okIbjfs7NloPU6ZkfnV+MCB0TOhxv6DnoQKBgQDBfiM3mS/w74dfKOHo\ny8aJyYciG3LKAaizkLTFaXdSFDNCGCx6o0km/ZvdzXgoT9rE+gaPVYAK7ayVVRn9\nsvsKL34JX9C0ADUMKFV+HieYHGNP/bTWjB93AA0LJVL1CKJfjsDSBWDNx3R5jDDH\n4pmkCx43615eC6UQ0DdGzi+PtQKBgQC18wUvutdgrevGR97Z8g1r+xO6SAwKGvOm\nHD9dYrxLFrowzz6gLjdpedt1/szYE7sbyZD4yy0CDzQzzHP49/qq7TsYJ7ApT7F8\nuD2i9qxdFlHWFjj0k64qzHr7uXYWtcRMQyJpaNNx4VWBKImputmeFq+iKVYZp00x\nuHVcKzJcAwKBgHhq2dv2F+HoD+Vm+gD5IJwLsW/GiU+ybJ0jx3y8QCfyrlvJ05SX\nHiWH24LUJp1f5RSFTaPSYBdtBuUAy2YaByW1nMiUurvrDRh92YbdmWKO+DeF+w8y\nsTpL69It7kzUjMjPfKy38CDgqloipxEesuNmj+3ZKyd4M8gc7OnB09OpAoGAf0Gq\ntfhbHS5ngjXQQuUNyCFCaf5sFUFGej61fs5I3cfWj77TkVrhvK7S9NMyWEpsioHP\nGIOaRh92JmhwEIj4VEY6F6nihvJLM+z0hx857J1ovXCrgzwrC5oaxiav1jBpS+GE\nlu8PPE4a7Iv6xLB/9hbt3mBE7QpbblQSGVXJEhsCgYEAm9zhjOuyhPMY4Fze3UZ0\nDnR0YdF8zwW+Au1fd8bAC54kO1pRM817ozVBVIERjGEiNE47tF9EKoT3LcuAUTh2\nr+HV97+CeJz+WN9sq6HkqTo0lXRYo3u4BqtxYSUQu284ksuzaCEbgA4koXuRWvj5\nHR6lLSxlAFIishMI9Ijazi0=\n-----END PRIVATE KEY-----\n',
        client_email: 'main-dev@mad-movie-bot-slack-alpha.iam.gserviceaccount.com'
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

}
