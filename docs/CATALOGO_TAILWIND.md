# Catálogo JM-AROMAS · Tailwind y encabezado permanente

## Qué se cambió

La pantalla pública `src/app/tienda/catalogo-page.component.html` ahora está construida con utilidades **Tailwind CSS v4**. El CSS propio se redujo drásticamente a reglas de accesibilidad de propósito específico.

- **Header sticky**: permanece visible arriba al desplazarse por la página; incluye el logo, búsqueda y botón del carrito con contador.
- **La franja promocional no es sticky**: desaparece al bajar para dejar más espacio en pantallas pequeñas.
- **Versión móvil**: el carrito permanece en el encabezado; el menú de categorías es desplegable y ofrece acceso a sesión, perfil y administración según el rol.
- **Búsqueda**: permite escribir y saltar al catálogo sin ocultar el encabezado; se descuenta su altura al desplazar.
- **Rediseño completo**: hero editorial, ventajas, categorías, barra de resultados y ordenamiento, filtros por audiencia, familia, ml, precio y ofertas, fichas de producto, precio/rebajas, detalle con galería, carrito lateral, promociones de marca y pie.
- **Sin productos ficticios**: la tienda sigue mostrando solo datos reales del API.
- **Sin cambios en contratos HTTP, precios, pagos o stock**.

## Rendimiento

- `filtrados` utiliza **memoización por criterios y referencia de productos**: los filtros no se recalculan cuando Angular consulta repetidamente la propiedad sin que cambien los filtros o datos.
- `trackBy` en las tarjetas y líneas del carrito evita recrear elementos al cambiar la lista.
- Se mantienen `loading="lazy"` y `decoding="async"` en fotografías, así como el caché de catálogo de 60 s implementado en `data-access/catalogo.service.ts`.
- La ruta sigue siendo lazy-loaded desde `app.routes.ts`.

### Medición del build (no velocidad real)

En GitHub Actions run **41978166267** (`npm run build:prod`), Angular informó aproximadamente:

| Componente | Tamaño sin compresión | Transferencia estimada |
| --- | ---: | ---: |
| Archivos iniciales | 591.40 kB | 145.68 kB |
| Módulo catálogo diferido | 59.33 kB | 13.80 kB |
| CSS global | 47.93 kB | 7.36 kB |

El rediseño añade utilidades CSS y aumenta ligeramente el tamaño inicial frente al build anterior; la velocidad real debe verificarse con Lighthouse y DevTools (LCP, INP, CLS y TTFB). No afirmar mejoras de segundos o porcentajes sin esa medición.

## Cómo probar

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
npm install
npm run build:prod
npm start
```

1. Entrar en `http://localhost:4200`. Desplazarse hasta productos y final de página: logo, búsqueda y carrito deben seguir visibles.
2. En móvil (DevTools Device Toolbar) comprobar menú, búsqueda y carrito; la barra promocional puede desplazarse.
3. Filtrar por audiencia, ml, familia, precio y ofertas. Comprobar ordenamientos.
4. Abrir una foto, cambiar miniatura y cerrar con botón o tecla **Escape**.
5. Agregar un producto real, abrir carrito desde cualquier punto de la página, variar cantidades y navegar a checkout.
6. Comprobar inicio/cierre de sesión y acceso a Mi perfil; si es ADMIN, acceso al panel.
7. En estado sin productos o API caída, comprobar las pantallas de error sin fragancias inventadas.

El backend y la base de datos no requieren modificaciones para este cambio.
