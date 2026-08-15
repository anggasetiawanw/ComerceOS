import { Inject, Injectable } from '@nestjs/common';
import { BuyerDirectory, BuyerDirectoryEntry } from '../../../ordering/application/ports/buyer-directory.port';
import { Email } from '../../domain/value-objects/email.vo';
import { User } from '../../domain/entities/user.aggregate';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';

// Implements ordering's BUYER_DIRECTORY port — same dependency-inversion
// direction as StoreLookupService implementing identity's own STORE_LOOKUP.
// Importing the port's type file does not create a module cycle: it is a
// plain interface with no runtime dependency on OrderingModule.
@Injectable()
export class BuyerDirectoryService implements BuyerDirectory {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async findOrCreateByEmail(params: { email: string; name: string; phone: string | null }): Promise<BuyerDirectoryEntry> {
    const emailResult = Email.create(params.email);
    if (emailResult.isErr()) {
      throw emailResult.unwrapErr();
    }
    const email = emailResult.unwrap();

    const existing = await this.users.findByEmail(email.value);
    if (existing) {
      return { id: existing.id, name: existing.name, email: existing.email.value };
    }

    const guest = User.registerAsGuestBuyer({ email, name: params.name, phone: params.phone });
    await this.users.save(guest);

    return { id: guest.id, name: guest.name, email: guest.email.value };
  }
}
