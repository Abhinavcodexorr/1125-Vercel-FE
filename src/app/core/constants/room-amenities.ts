export interface PredefinedRoomAmenity {
  key: string;
  name: string;
  icon: string;
  /** Icon name sent to the public site. Material names render when iconType is material. */
  apiIcon?: string;
  iconType?: 'custom' | 'material';
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
  { key: 'pool', name: 'Pool', icon: 'pool', apiIcon: 'pool', iconType: 'material' },
  { key: 'ocean_view', name: 'Ocean View', icon: 'ocean_view', apiIcon: 'waves', iconType: 'material' },
  { key: 'private_deck', name: 'Private Deck', icon: 'private_deck', apiIcon: 'deck', iconType: 'material' },
  { key: 'lounge_access', name: 'Lounge Access', icon: 'lounge_access', apiIcon: 'weekend', iconType: 'material' },
  { key: 'game_room', name: 'Direct access to game room', icon: 'game_room', apiIcon: 'sports_esports', iconType: 'material' },
];

export const CUSTOM_AMENITY_ICON_OPTIONS = [
  { value: 'star', label: 'Star', svg: 'star' },
  { value: 'pool', label: 'Pool', svg: 'pool' },
  { value: 'waves', label: 'Ocean', svg: 'ocean_view' },
  { value: 'deck', label: 'Deck', svg: 'private_deck' },
  { value: 'weekend', label: 'Lounge', svg: 'lounge_access' },
  { value: 'king_bed', label: 'Bed', svg: 'bed' },
] as const;

export type CustomAmenityIconValue = (typeof CUSTOM_AMENITY_ICON_OPTIONS)[number]['value'];

const PREDEFINED_BY_KEY = new Map(PREDEFINED_ROOM_AMENITIES.map((item) => [item.key, item]));
const PREDEFINED_BY_NAME = new Map(
  PREDEFINED_ROOM_AMENITIES.map((item) => [item.name.trim().toLowerCase(), item]),
);

const AMENITY_NAME_ALIASES: Record<string, string> = {
  'direct access to lounge': 'lounge_access',
  'lounge': 'lounge_access',
  'direct access to game room': 'game_room',
  'game room': 'game_room',
  'gameroom': 'game_room',
  'pool access': 'pool',
  'oceanview': 'ocean_view',
  'private deck access': 'private_deck',
  'deck access': 'private_deck',
};

export function findPredefinedAmenity(
  key?: string,
  name?: string,
): PredefinedRoomAmenity | undefined {
  if (key) {
    const byKey = PREDEFINED_BY_KEY.get(key);
    if (byKey) return byKey;
  }

  const normalizedName = name?.trim().toLowerCase();
  if (normalizedName) {
    const aliasKey = AMENITY_NAME_ALIASES[normalizedName];
    if (aliasKey) return PREDEFINED_BY_KEY.get(aliasKey);
    const byName = PREDEFINED_BY_NAME.get(normalizedName);
    if (byName) return byName;
  }

  return undefined;
}

export function svgIconForApiIcon(icon: string): string {
  const match = CUSTOM_AMENITY_ICON_OPTIONS.find((option) => option.value === icon);
  return match?.svg ?? icon;
}

export function toAmenityPayload(amenity: PredefinedRoomAmenity) {
  return {
    key: amenity.key,
    name: amenity.name,
    icon: amenity.apiIcon ?? amenity.icon,
    iconType: amenity.iconType ?? 'custom',
  };
}
