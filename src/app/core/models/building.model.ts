export interface LatLng {
  lat: number; //Latitude
  lng: number; //Longitude
}

export interface Building {
  id: string;
  name: string;
  code: string;
  description: string;
  floors: number;
  area: number;
  polygon: LatLng[];
  isPublic: boolean;
  userId: string;
  createdAt: string;
}

export type BuildingCreate = Omit<Building, 'id' | 'createdAt' | 'userId'>;
export type BuildingUpdate = Partial<BuildingCreate>;

export interface BuildingFilter {
  search: string;
  showPublicOnly: boolean;
}
