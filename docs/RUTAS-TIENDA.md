# Rutas del frontend JM-AROMAS

Se separa la tienda pública del panel administrativo.

| URL | Vista | Inicio de sesión |
| --- | --- | --- |
| `http://localhost:4200/` | Inicio, catálogo de perfumes, filtros y carrito de vista previa | No |
| `http://localhost:4200/admin` | Inventario, búsqueda y escáner de códigos de barras | Sí, Google + tabla privada de administradores |

## Ejecutar

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
npm install
npm start
```

Abre `http://localhost:4200/`. El catálogo consulta `GET http://localhost:8080/api/v1/productos`.

Mientras la base esté vacía, o si no se puede alcanzar la API, se muestran **ocho perfumes ficticios**, con una advertencia explícita de demostración. No son existencias reales; los precios no corresponden a mercancía disponible. Los productos registrados desde el escáner se guardan con `publicado=false` y, por tanto, no aparecerán todavía en el catálogo público hasta implementar la publicación administrativa.

El carrito solo permite experimentar con artículos dentro de la sesión de la página. No hay todavía autenticación de clientes, checkout real, pagos ni integración operativa con WhatsApp; el botón de finalizar pedidos está deshabilitado.

## Escáner

Para abrir el escáner usa `/admin` y sigue `docs/ESCANER-INVENTARIO.md`. La protección de operaciones está también en el backend Spring Boot; esconder o mostrar una ruta de Angular nunca sustituye autorización en el servidor.

## Pendiente

- Fotografías reales (Supabase Storage) y campos de familia olfativa y audiencia en base de datos.
- Panel de gestión, revisión y publicación de productos.
- Inicio de sesión de clientes, direcciones y pedidos por WhatsApp.
- Pruebas móviles en HTTPS.
