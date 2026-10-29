import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_APP = 'FIREBASE_APP';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: (config: ConfigService) => {
        if (admin.apps.length > 0) return admin.apps[0];

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.get('FIREBASE_PROJECT_ID'),
            privateKeyId: config.get('FIREBASE_PRIVATE_KEY_ID'),
            privateKey: config.get<string>('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
            clientEmail: config.get('FIREBASE_CLIENT_EMAIL'),
            clientId: config.get('FIREBASE_CLIENT_ID'),
            authUri: config.get('FIREBASE_AUTH_URI'),
            tokenUri: config.get('FIREBASE_TOKEN_URI'),
          } as admin.ServiceAccount),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [FIREBASE_APP],
})
export class FirebaseModule {}
