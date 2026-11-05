import { Routes } from '@angular/router';
import { adminGuard } from './auth/auth.guard';

/**
 * Carga diferida por pantalla: el escáner, pagos y checkout no se descargan
 * mientras el visitante solo explora el catálogo.
 */
export const routes: Routes = [
  {
    path: '', pathMatch: 'full',
    title: 'JM-AROMAS | Tienda de perfumes',
    loadComponent: () => import('./tienda/catalogo-page.component')
      .then(m => m.CatalogoPageComponent)
  },
  {
    path: 'ingresar',
    title: 'JM-AROMAS | Iniciar sesión',
    loadComponent: () => import('./auth/login-page.component')
      .then(m => m.LoginPageComponent)
  },
  {
    path: 'auth/callback',
    title: 'JM-AROMAS | Verificando sesión',
    loadComponent: () => import('./auth/auth-callback.component')
      .then(m => m.AuthCallbackComponent)
  },
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/dashboard' },
  {
    path: 'admin/dashboard',
    canActivate: [adminGuard],
    title: 'JM-AROMAS | Dashboard',
    loadComponent: () => import('./admin/dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent)
  },
  {
    path: 'admin/inventario',
    canActivate: [adminGuard],
    title: 'JM-AROMAS | Inventario y cobros',
    loadComponent: () => import('./admin/inventario/barcode-admin.component')
      .then(m => m.BarcodeAdminComponent)
  },
  {
    path: 'mi-perfil',
    title: 'JM-AROMAS | Mi perfil',
    loadComponent: () => import('./perfil/mi-perfil.component')
      .then(m => m.MiPerfilComponent)
  },
  {
    path: 'checkout',
    title: 'JM-AROMAS | Tu pedido',
    loadComponent: () => import('./checkout/checkout-page.component')
      .then(m => m.CheckoutPageComponent)
  },
  {
    path: 'pedido/:id',
    title: 'JM-AROMAS | Seguimiento',
    loadComponent: () => import('./checkout/pedido-estado.component')
      .then(m => m.PedidoEstadoComponent)
  },
  {
    path: 'politica-de-privacidad',
    title: 'Política de privacidad | JM Aromas',
    data: { tipo: 'privacidad' },
    loadComponent: () => import('./legal/legal-page.component')
      .then(m => m.LegalPageComponent)
  },
  {
    path: 'terminos-y-condiciones',
    title: 'Términos y condiciones | JM Aromas',
    data: { tipo: 'terminos' },
    loadComponent: () => import('./legal/legal-page.component')
      .then(m => m.LegalPageComponent)
  },
  { path: '**', redirectTo: '' }
];
