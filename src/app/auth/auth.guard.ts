import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** El backend decide los permisos. Este guard solo controla la navegación. */
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  try {
    const identidad = await auth.identidadActual();
    if (!identidad) return router.parseUrl('/ingresar');
    return identidad.rol === 'ADMIN' ? true : router.parseUrl('/');
  } catch {
    // Ante fallos de conexión NO asumir que el usuario es administrador.
    return router.createUrlTree(['/ingresar'], {
      queryParams: { aviso: 'No pudimos verificar tu acceso. Revisa que el backend esté iniciado.' }
    });
  }
};
