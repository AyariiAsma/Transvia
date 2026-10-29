import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Global()
@Module({
  imports: [FirebaseModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
