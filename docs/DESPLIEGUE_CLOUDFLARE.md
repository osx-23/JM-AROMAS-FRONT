# JM-AROMAS-FRONT · Publicar solo Angular en Cloudflare Pages

## Objetivo actual

Publicar exclusivamente el frontend desde la rama `main`. El backend **todavía no está desplegado**. El sitio puede renderizar sus pantallas, pero las consultas al catálogo, pedidos y las operaciones administrativas necesitan la API; el inicio de sesión con Google también necesita que el backend responda a `/auth/me`.

**No activar ventas públicas hasta desplegar y probar la API.** No se han creado, modificado ni desplegado recursos de Railway, Supabase ni Google.

## Integración GitHub → Cloudflare Pages

1. Acceder a https://dash.cloudflare.com/ y abrir **Workers & Pages**.
2. Pulsar **Create application** → **Pages** → **Import an existing Git repository** (las etiquetas pueden variar).
3. Autorizar GitHub y elegir `osx-23/JM-AROMAS-FRONT`.
4. Elegir un nombre de Pages disponible, por ejemplo `jm-aromas`. El dominio resultante será **el que confirme Cloudflare**, normalmente `<nombre>.pages.dev`.
5. Configurar exactamente:

| Campo | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Angular` (si está disponible) |
| Root directory | `/` (raíz del repositorio) |
| Build command | `npm run build:prod` |
| Build output directory | `dist/jm-aromas-front/browser` |
| Node.js | `22` (`.node-version` incluido) |

6. Pulsar **Save and Deploy** y comprobar que termina en estado de éxito.
7. Abrir la URL real `*.pages.dev` que entrega el panel.

La integración GitHub Pages redespliega automáticamente cada push a `main`. `feature/mvp-base` puede seguir como rama de desarrollo, con versiones de vista previa si Cloudflare las habilita.

## Rutas de Angular

Cloudflare Pages trata automáticamente un sitio sin `404.html` en la raíz como una SPA; resuelve `/admin/dashboard`, `/mi-perfil` o `/auth/callback` con el `index.html`. No añadimos `_redirects` porque no es necesario para este proyecto y una regla comodín podría interferir con futuras funciones o rutas de la API.

## Separar API local de producción

**Desarrollo:** `src/environments/environment.ts`
```ts
apiBaseUrl: 'http://localhost:8080/api/v1'
```

**Cloudflare Pages:** `src/environments/environment.production.ts`
```ts
apiBaseUrl: '/api/v1'
```

Esta ruta relativa es **temporal** y no instala ninguna API. Cuando el backend esté desplegado, cambiar únicamente el valor de producción a la URL pública real:
```ts
apiBaseUrl: 'https://TU-DOMINIO-REAL-DEL-BACKEND/api/v1'
```
Luego ejecutar `git push origin main`; Cloudflare recompilará y publicará el nuevo JavaScript con esa URL. No introducir el URL de ejemplo literalmente.

## Google y Supabase después de obtener el dominio de Pages

- En Supabase Auth: añadir `https://<dominio-real>.pages.dev/auth/callback` a **Redirect URLs**. No borrar `http://localhost:4200/auth/callback` si se sigue desarrollando localmente.
- Verificar también el **Site URL** que corresponda a tu frontend definitivo y las opciones del proveedor Google (Supabase mantiene su propia callback de OAuth).
- En el backend: añadir el origen exacto `https://<dominio-real>.pages.dev` a CORS y comprobar que la API responda por HTTPS.
- El código actual de Angular usa Google OAuth con PKCE y envía el JWT al backend. No se podrá completar ese flujo si la API no existe.

## Verificar

- Abrir la portada y comprobar que Angular carga sin errores de JS.
- Probar navegación directa a `/mi-perfil` y `/checkout`: Cloudflare debe servir el frontend.
- El catálogo **mostrará un error de conexión** hasta desplegar el backend, de acuerdo con su estado real; no agregar productos falsos.
- En GitHub Actions se ejecuta `npm install --no-audit --no-fund` seguido de `npm run build:prod` para pushes a `main` y `feature/mvp-base`.
- Las variables del navegador son públicas, nunca incluir claves secretas de Supabase/Google.

## Enlaces oficiales

- https://developers.cloudflare.com/pages/framework-guides/deploy-an-angular-site/
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://angular.dev/tools/cli/environments
