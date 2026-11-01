# JM-AROMAS — Escáner móvil de inventario

## Estado
Módulo de administración de productos mediante código de barras, implementado en la rama `feature/mvp-base`.

## Tecnología
- Angular 20 + ZXing Browser 0.2.1 (EAN-8, EAN-13, UPC-A, UPC-E, Code 128, Code 39).
- Supabase Auth con inicio de sesión Google.
- Spring Boot API: GET /api/v1/admin/productos, GET /api/v1/admin/productos/codigo-barras/{codigo},
  POST /api/v1/admin/productos, PATCH /api/v1/admin/productos/{id}/stock.
- PostgreSQL Supabase: `public.productos` (código único) y `public.movimientos_stock` (auditoría).
- Los productos se crean **como borradores** (`publicado=false`) hasta añadir información e imágenes reales.

## Flujo
1. Abrir el frontend desde el móvil sobre HTTPS (o localhost en pruebas locales).
2. Iniciar sesión con Google en una cuenta previamente autorizada.
3. Pulsar **Activar cámara del celular**, conceder permiso y acercar el código al recuadro.
4. Al detectar el código, el frontend detiene la cámara y consulta la API.
5. Si el producto existe, ofrece **Registrar ingreso de stock**; el backend actualiza stock bajo bloqueo transaccional y añade un movimiento.
6. Si el producto no existe (HTTP 404), aparece **Registrar un producto nuevo** con nombre, marca, SKU, precio, stock y descripción.
7. El servidor normaliza UPC-A a GTIN con cero inicial, comprueba dígito verificador cuando aplica y utiliza UNIQUE para impedir duplicados.
8. Si el permiso de cámara falla, usar el campo manual.

## Configuración obligatoria
1. Configurar en Supabase **Authentication > Providers > Google** y **Authentication > URL Configuration** con origen/redirect de la web.
2. Registrar o iniciar sesión con Google.
3. Abrir Supabase > Authentication > Users y obtener el **UUID** del usuario autorizado.
4. Desde SQL Editor de Supabase como administrador, ejecutar, sustituyendo el UUID de forma segura:

   ```sql
   insert into app_private.administradores (usuario_id)
   values ('UUID-DEL-USUARIO-REAL')
   on conflict (usuario_id) do nothing;
   ```

   **Nunca** hacer este INSERT desde el frontend ni dejar autoinscripción de administradores.
5. En el backend configurar `DB_JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD`,
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `FRONTEND_ORIGIN`.
6. En `src/environments/environment.ts` configurar la URL pública del backend en `apiBaseUrl`. La clave **publishable** de Supabase es pública, pero nunca colocar una `service_role`.
7. Desde el frontend instalar dependencias con `npm install` y ejecutar `npm start`; backend con `mvn spring-boot:run`.
8. En el móvil acceder a una URL **HTTPS**. La cámara no funciona en una IP local HTTP no segura.

## Pendiente para salir a producción
- Completar la autenticación con Google en Supabase/Google Cloud.
- Autorizar la primera cuenta administradora.
- Configurar las variables privadas del backend y publicar Angular sobre HTTPS.
- Pruebas físicas de la cámara (Safari iOS / Chrome Android), con códigos reales y mala iluminación.
- Probar registros simultáneos, duplicados y movimientos contra PostgreSQL real.
- Incluir edición de fichas, fotos y publicación a tienda.

En ningún caso el escaneo por sí solo crea automáticamente un producto comercial: requiere revisión de los datos por la administradora.

Referencias:
- https://github.com/zxing-js/browser
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://supabase.com/docs/guides/auth/social-login/auth-google
