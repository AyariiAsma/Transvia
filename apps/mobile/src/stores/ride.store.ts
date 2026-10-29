import { create } from 'zustand';
import { Ride, FareBreakdown } from '@logistic/shared';

type RidePhase =
  | 'idle'
  | 'selecting_pickup'
  | 'selecting_dropoff'
  | 'estimating'
  | 'confirming'
  | 'searching'
  | 'accepted'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'ride_started'
  | 'completed'
  | 'cancelled';

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

interface RideStore {
  phase: RidePhase;
  activeRide: Ride | null;
  pickup: LocationPoint | null;
  dropoff: LocationPoint | null;
  selectedVehicleTypeId: string | null;
  fareEstimate: FareBreakdown | null;
  promoCode: string | null;
  promoDiscount: number;
  driverLocation: { lat: number; lng: number; eta?: number } | null;
  estimatedRoute: { polyline: string; distanceKm: number; durationMinutes: number } | null;

  // Actions
  setPhase: (phase: RidePhase) => void;
  setPickup: (loc: LocationPoint | null) => void;
  setDropoff: (loc: LocationPoint | null) => void;
  setSelectedVehicleType: (id: string) => void;
  setFareEstimate: (fare: FareBreakdown | null) => void;
  setPromoCode: (code: string | null, discount?: number) => void;
  setActiveRide: (ride: Ride | null) => void;
  updateDriverLocation: (loc: { lat: number; lng: number; eta?: number }) => void;
  setEstimatedRoute: (route: { polyline: string; distanceKm: number; durationMinutes: number } | null) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as RidePhase,
  activeRide: null,
  pickup: null,
  dropoff: null,
  selectedVehicleTypeId: null,
  fareEstimate: null,
  promoCode: null,
  promoDiscount: 0,
  driverLocation: null,
  estimatedRoute: null,
};

export const useRideStore = create<RideStore>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setSelectedVehicleType: (id) => set({ selectedVehicleTypeId: id }),
  setFareEstimate: (fareEstimate) => set({ fareEstimate }),
  setPromoCode: (promoCode, promoDiscount = 0) => set({ promoCode, promoDiscount }),
  setActiveRide: (activeRide) => set({ activeRide }),
  updateDriverLocation: (driverLocation) => set({ driverLocation }),
  setEstimatedRoute: (estimatedRoute) => set({ estimatedRoute }),
  reset: () => set(initialState),
}));
