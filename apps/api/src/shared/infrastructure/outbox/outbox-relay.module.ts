import { Module } from '@nestjs/common';
import { OutboxModule } from './outbox.module';
import { OutboxRelayProcessor } from './outbox-relay.processor';

// Worker-only: the relay processor claims pending outbox rows and publishes
// them to their target queues. The API process only ever enqueues (via
// OutboxModule/OutboxService) — it never relays.
@Module({
  imports: [OutboxModule],
  providers: [OutboxRelayProcessor],
})
export class OutboxRelayModule {}
