# JM-AROMAS · Tienda y administración (Angular)

Aplicación web responsive desarrollada con **Angular 20 (standalone)** y TypeScript. Integra Google OAuth con Supabase Auth y consume la API de JM-AROMAS.

## Arquitectura

Consulta [ARQUITECTURA_FRONT.md](docs/ARQUITECTURA_FRONT.md) para el detalle de carpetas y responsabilidades.

- `src/app/auth/`: sesión, callback de Google y guarda de administración.
- `src/app/tienda/`: catálogo, modelos y servicio de acceso a datos (sin productos ficticios).
- `src/app/admin/inventario/`: escáner, registro, movimientos de stock y galería de fotos.
- `src/app/admin/productos/editor/`: edición de datos, género/público objetivo, mililitros, familia olfativa y descuentos.
- `src/app/admin/pagos/`: gestión de medios de pago y comprobantes.
- `src/app/checkout/`: pedido, dirección y seguimiento.
- `src/app/app.routes.ts`: rutas con carga diferida (`loadComponent`).
- `src/app/app.config.ts`: proveedores de Angular; `src/main.ts`: arranque mínimo.

Las plantillas HTML y estilos CSS de los módulos administrativos están separados de los archivos TypeScript para facilitar su mantenimiento.

## Ejecutar localmente

Requisitos: Node.js 20.19+ (recomendado Node 22) y backend en ejecución.

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
npm install
npm start
```

Abre `http://localhost:4200`. El área de administración está en `/admin` y requiere cuenta Google autorizada. El frontend **no debe contener** claves secretas de Supabase, Google o PostgreSQL.

## Pruebas

```bash
npm run build
```

GitHub Actions compila el proyecto con Node 22. La compilación verifica tipos y plantillas, pero no reemplaza pruebas funcionales de compra o permisos.

## Desarrollo

- Mantener la lógica de consultas a API en servicios `data-access`.
- Colocar cada nueva pantalla y sus assets dentro del módulo correspondiente.
- No duplicar el cliente Supabase Auth: reutilizar `AuthService`.
- La autorización real de administración se valida en el backend, no solo en el guard de Angular.
- Evitar inventarios de demostración cuando la base esté vacía.

Branch de desarrollo: `feature/mvp-base`; no se han fusionado estos cambios a `main`.
