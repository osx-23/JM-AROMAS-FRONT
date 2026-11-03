import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type RolJmAromas = 'ADMIN' | 'CLIENTE';

export interface IdentidadJmAromas {
  usuarioId: string;
  correo: string;
  rol: RolJmAromas;
}

/**
 * Una sola instancia de Supabase Auth para evitar varios clientes compitiendo
 * por la misma sesión/código OAuth en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );

  async sesion(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error('No se pudo recuperar tu sesión de Google.');
    return data.session;
  }

  async identidadConToken(accessToken: string): Promise<IdentidadJmAromas> {
    return firstValueFrom(this.http.get<IdentidadJmAromas>(
      environment.apiBaseUrl + '/auth/me',
      { headers: new HttpHeaders({ Authorization: 'Bearer ' + accessToken }) }
    ));
  }

  async identidadActual(): Promise<IdentidadJmAromas | null> {
    const session = await this.sesion();
    return session ? this.identidadConToken(session.access_token) : null;
  }

  async iniciarGoogle(): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback'
      }
    });
    if (error) throw error;
  }

  async cerrarSesion(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}
