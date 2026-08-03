import { Module } from '@nestjs/common';
import { QueueModule } from './queue.module';
import { RepeatableJobsBootstrap } from './repeatable-jobs.bootstrap';

// Worker-only — repeatable job registration must run exactly once, in the
// worker process, not on every HTTP API instance.
@Module({
  imports: [QueueModule],
  providers: [RepeatableJobsBootstrap],
})
export class RepeatableJobsModule {}
