import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="callback">
      <div class="simbolo">JM ✦ AROMAS</div>
      <h1>Verificando tu cuenta</h1>
      <p *ngIf="procesando" role="status">Validando tu sesión de Google y consultando tus permisos...</p>
      <p *ngIf="error" class="error" role="alert">{{error}}</p>
      <a *ngIf="error" routerLink="/ingresar">Volver a iniciar sesión →</a>
    </main>
  `,
  styles: [`
    :host{display:grid;place-items:center;min-height:100vh;background:#faf5ee;color:#382d25}
    .callback{text-align:center;max-width:450px;padding:32px}.simbolo{color:#a47757;font-size:12px;font-weight:800;letter-spacing:.18em}
    h1{font:500 38px Georgia,serif;margin:20px 0}p{font-size:13px;color:#806f62;line-height:1.8}
    .error{color:#ad3b33;background:#fff0ec;padding:15px;border-radius:5px}
    a{color:#8c5e41;font-size:13px}
  `]
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  procesando = true;
  error = '';

  async ngOnInit(): Promise<void> {
    try {
      // getSession espera la inicialización de Supabase, incluido el retorno
      // OAuth con code/PKCE. El rol se consulta solo en el backend.
      const identidad = await this.auth.identidadActual();
      if (!identidad) {
        throw new Error('Google no devolvió una sesión válida.');
      }
      await this.router.navigateByUrl(identidad.rol === 'ADMIN' ? '/admin' : '/', { replaceUrl: true });
    } catch {
      this.error = 'No fue posible completar el acceso. Revisa la configuración de Google OAuth y que el backend esté activo.';
    } finally {
      this.procesando = false;
    }
  }
}
