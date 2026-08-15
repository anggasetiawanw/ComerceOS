import { UniqueId } from '../../../../shared/kernel/uuid';
import { Inquiry } from '../entities/inquiry.aggregate';

export const INQUIRY_REPOSITORY = Symbol('INQUIRY_REPOSITORY');

export interface InquiryRepository {
  findById(id: UniqueId): Promise<Inquiry | null>;
  save(inquiry: Inquiry): Promise<void>;
}
