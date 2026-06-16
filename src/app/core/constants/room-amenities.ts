export interface PredefinedRoomAmenity {
  key: string;
  name: string;
  icon: string;
}

export const PREDEFINED_ROOM_AMENITIES: PredefinedRoomAmenity[] = [
  { key: 'hot_cold_shower', name: 'Hot & Cold Shower', icon: 'hot_cold_shower' },
  { key: 'high_speed_wifi', name: 'High-Speed WiFi', icon: 'high_speed_wifi' },
  { key: 'mini_fridge', name: 'Mini Fridge', icon: 'mini_fridge' },
  { key: 'on_request_laundry', name: 'On-Request Laundry', icon: 'on_request_laundry' },
  { key: 'air_conditioning', name: 'Air Conditioning', icon: 'air_conditioning' },
  { key: 'equipped_kitchenette', name: 'Equipped Kitchenette', icon: 'equipped_kitchenette' },
  { key: 'flat_screen_tv', name: 'Flat Screen TV', icon: 'flat_screen_tv' },
  { key: 'butler_service', name: 'Butler Service', icon: 'butler_service' },
];

const PREDEFINED_BY_KEY = new Map(PREDEFINED_ROOM_AMENITIES.map((item) => [item.key, item]));
const PREDEFINED_BY_NAME = new Map(
  PREDEFINED_ROOM_AMENITIES.map((item) => [item.name.trim().toLowerCase(), item]),
);

export function findPredefinedAmenity(
  key?: string,
  name?: string,
): PredefinedRoomAmenity | undefined {
  if (key) {
    const byKey = PREDEFINED_BY_KEY.get(key);
    if (byKey) return byKey;
  }

  if (name) {
    const byName = PREDEFINED_BY_NAME.get(name.trim().toLowerCase());
    if (byName) return byName;
  }

  return undefined;
}
