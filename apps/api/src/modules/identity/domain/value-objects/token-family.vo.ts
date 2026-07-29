import { ValueObject } from '../../../../shared/kernel/value-object.base';
import { generateId, UniqueId } from '../../../../shared/kernel/uuid';

interface TokenFamilyProps {
  id: UniqueId;
}

export class TokenFamily extends ValueObject<TokenFamilyProps> {
  private constructor(props: TokenFamilyProps) {
    super(props);
  }

  static create(): TokenFamily {
    return new TokenFamily({ id: generateId() });
  }

  static fromId(id: UniqueId): TokenFamily {
    return new TokenFamily({ id });
  }

  get id(): UniqueId {
    return this.props.id;
  }
}
