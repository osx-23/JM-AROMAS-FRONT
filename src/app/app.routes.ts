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
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        title: 'JM Aromas | Resumen',
        loadComponent: () => import('./admin/dashboard/admin-dashboard.component')
          .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'inventario',
        canActivate: [adminGuard],
        data: { seccion: 'inventario' },
        title: 'JM Aromas | Inventario',
        loadComponent: () => import('./admin/inventario/barcode-admin.component')
          .then(m => m.BarcodeAdminComponent)
      },
      {
        path: 'nueva-venta',
        canActivate: [adminGuard],
        title: 'JM Aromas | Nueva venta',
        loadComponent: () => import('./admin/ventas/nueva-venta.component')
          .then(m => m.NuevaVentaComponent)
      },
      {
        path: 'ventas-pedidos',
        canActivate: [adminGuard],
        title: 'JM Aromas | Ventas y pedidos',
        loadComponent: () => import('./admin/ventas/ventas-pedidos.component')
          .then(m => m.VentasPedidosComponent)
      },
      {
        path: 'pedidos',
        canActivate: [adminGuard],
        title: 'JM Aromas | Pedidos y pagos',
        loadComponent: () => import('./admin/pedidos/admin-pedidos-page.component')
          .then(m => m.AdminPedidosPageComponent)
      },
      {
        path: 'productos',
        canActivate: [adminGuard],
        data: { seccion: 'productos' },
        title: 'JM Aromas | Productos y ofertas',
        loadComponent: () => import('./admin/inventario/barcode-admin.component')
          .then(m => m.BarcodeAdminComponent)
      },
      {
        path: 'boletas',
        canActivate: [adminGuard],
        title: 'JM Aromas | Boletas electrónicas',
        loadComponent: () => import('./admin/boletas/admin-boletas.component')
          .then(m => m.AdminBoletasComponent)
      }
    ]
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
