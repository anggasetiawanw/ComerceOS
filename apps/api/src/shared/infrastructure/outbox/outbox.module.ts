import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';

@Module({
  imports: [QueueModule],
  providers: [OutboxRepository, OutboxService],
  exports: [OutboxRepository, OutboxService],
})
export class OutboxModule {}
