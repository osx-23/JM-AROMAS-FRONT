# JM-AROMAS — Edición de perfumes, descuentos y filtros

## Administración
Acceder a `http://localhost:4200/admin` con una cuenta Google autorizada.

**Desde el escáner:** escanear o introducir un código de barras ya registrado. El sistema muestra el producto y abre el editor de sus datos, así como las opciones de stock y fotografías.

**Desde Productos registrados:** pulsar **Editar datos y descuentos** en la fila del producto.

En el editor se pueden cambiar: nombre, marca, código de barras, SKU, descripción, precio base, público objetivo (hombre/mujer/unisex), cantidad en mililitros (1 a 2000), y familia olfativa (Floral, Amaderada, Cítrica, Fresca, Oriental, Frutal). Se conservan los códigos y SKU únicos. El stock se actualiza en el formulario separado de ingreso de stock para mantener su historial de movimientos.

Los mismos campos de presentación y clasificación están disponibles al registrar perfumes nuevos.

**Promociones:** el editor permite introducir nombre, tipo de rebaja (porcentaje o monto fijo), valor, y fechas y horas de inicio y fin. Las fechas se envían en ISO UTC y se almacenan como `timestamptz` de PostgreSQL. La tienda aplica automáticamente descuentos vigentes y muestra precio anterior tachado y precio final.

Reglas de descuentos:
- Porcentaje mayor que 0 y menor que 100; importe fijo mayor que 0 y menor que el precio base.
- No pueden existir dos promociones activas del mismo perfume que se solapen en el tiempo.
- Las promociones se pueden desactivar conservando el historial.
- No se modifica el precio original `public.productos.precio` al crear descuentos.
- Al editar el precio, primero se debe desactivar cualquier descuento fijo activo que resulte igual o superior al nuevo precio.
- El backend calcula el precio final al **crear el pedido**, vuelve a aplicar la promoción vigente y registra `subtotal`, `descuento_total`, `total`, y el descuento de cada línea para auditar los importes. El carrito no es una fuente confiable de precios.
- El checkout público sigue controlado por `CHECKOUT_ENABLED` (desactivado por defecto, hasta implementar controles antiabuso).

## Compradores
En el catálogo, los filtros **Para quién**, **Contenido (ml)** y **Familia olfativa** se basan en los atributos reales de los productos registrados y publicados. Los tamaños se generan a partir de los productos del catálogo. Los filtros de ofertas muestran solo perfumes con una rebaja vigente.

Los productos antiguos conservan su información original y los nuevos atributos quedan inicialmente **Sin clasificar** hasta que se editen: no se inventan categorías ni tamaños.

## Cambios técnicos
- Supabase: columnas opcionales `public.productos.publico_objetivo`, `contenido_ml`, `familia_olfativa` con restricciones CHECK.
- La tabla `public.descuentos` ya existía; reutilizada sin eliminar datos.
- API admin: `PATCH /api/v1/admin/productos/{id}` y `GET/POST /api/v1/admin/productos/{id}/descuentos`, `PATCH /api/v1/admin/productos/{id}/descuentos/{descuentoId}/desactivar`.
- Todas las rutas admin siguen protegidas por `AdminAuthFilter`, validación de Google Auth y tabla privada de administradores.
- API catálogo: `precio` es el precio final vigente, `precioAnterior` es el original cuando hay promoción; se devuelven `publicoObjetivo`, `contenidoMl`, `familiaOlfativa`.
- Migración versionada: [`database/productos_edicion_descuentos.sql`](https://github.com/osx-23/JM-AROMAS-BACK/blob/feature/mvp-base/database/productos_edicion_descuentos.sql). Ya aplicada en la base real del proyecto.

## Prueba recomendada
1. Actualizar ambas ramas `feature/mvp-base`, compilar e iniciar backend y frontend.
2. Elegir un producto existente, añadir su clasificación y contenido, guardar.
3. Crear descuento 10 % con vigencia actual y fecha fin futura; confirmar que aparece en catálogo con precio tachado.
4. Filtrar por público, ml, familia y ofertas; comprobar que coincide.
5. Desactivar el descuento y recargar catálogo: el precio debe regresar al base.
6. Verificar que un comprador no puede llamar las rutas administrativas. No activar checkout real para pruebas sin antiabuso.

**Atención:** El código y la estructura de BD se han probado en compilación y SQL. Para confirmar el flujo de extremo a extremo es necesario probar con una sesión administrativa real en el navegador.
