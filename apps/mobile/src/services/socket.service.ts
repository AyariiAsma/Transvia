import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_EVENTS } from '@logistic/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type Role = 'client' | 'driver' | 'admin';

class SocketService {
  private socket: Socket | null = null;
  private role: Role | null = null;

  async connect(role: Role): Promise<void> {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) throw new Error('Non authentifié');

    this.role = role;
    const namespace = role === 'client' ? '/client' : role === 'driver' ? '/driver' : '/admin';

    this.socket = io(`${API_URL}${namespace}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log(`[Socket] Connecté en tant que ${role}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[Socket] Déconnecté: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.error(`[Socket] Erreur connexion: ${err.message}`);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // ─── Chauffeur: position ───────────────────────────────────────────────────
  sendLocation(lat: number, lng: number, heading?: number, speed?: number): void {
    this.socket?.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, { lat, lng, heading, speed });
  }

  // ─── Client: suivi course ──────────────────────────────────────────────────
  startTrackingRide(rideId: string): void {
    this.socket?.emit(SOCKET_EVENTS.CLIENT_TRACKING_START, { rideId });
  }

  stopTrackingRide(rideId: string): void {
    this.socket?.emit(SOCKET_EVENTS.CLIENT_TRACKING_STOP, { rideId });
  }

  // ─── Listeners génériques ──────────────────────────────────────────────────
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    this.socket?.on(event, callback);
    return () => this.socket?.off(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton
export const socketService = new SocketService();
