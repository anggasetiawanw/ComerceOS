export const USERNAME_RESERVATION_STORE = Symbol('USERNAME_RESERVATION_STORE');

export interface UsernameReservationStore {
  isOnCooldown(storeId: string): Promise<boolean>;
  startCooldown(storeId: string): Promise<void>;
  isReserved(username: string): Promise<boolean>;
  reserve(username: string): Promise<void>;
}
