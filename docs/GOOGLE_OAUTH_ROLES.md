# JM-AROMAS — Google OAuth y redirección por rol

## Flujo

1. En `/`, la tienda es pública. Botón **Iniciar sesión** -> `/ingresar`.
2. Se autentica con Google usando Supabase Auth y PKCE.
3. Supabase retorna a `/auth/callback` y se crea la sesión en el navegador.
4. Angular consulta `GET /api/v1/auth/me` con el token Bearer de Supabase.
5. El backend valida el token con Supabase Auth y consulta `app_private.administradores`.
6. Si devuelve `ADMIN`, el usuario entra a `/admin`. Si devuelve `CLIENTE`, entra a `/`.
7. En `/admin`, **Ver como comprador** lleva al catálogo SIN cerrar la sesión y SIN cambiar el rol; desde el catálogo, **Panel administrador** lo devuelve.
8. Los compradores nunca reciben autorización para llamadas `/api/v1/admin/**` aunque manipulen el JavaScript o la URL. El backend revalida su token y rol en cada petición administrativa.

## Configurar Google OAuth (necesario para la primera prueba)

- En [Google Cloud Auth Clients](https://console.cloud.google.com/auth/clients), crear una credencial OAuth para **Web application**.
- **Authorized JavaScript origins:** `http://localhost:4200`.
- **Authorized redirect URI en Google Cloud:** `https://gonhxfvelgxnjqpdyzpg.supabase.co/auth/v1/callback`.
- Configurar Audience / usuarios de prueba en Google Cloud si la aplicación está en modo Testing.
- En [Supabase Auth Providers](https://supabase.com/dashboard/project/gonhxfvelgxnjqpdyzpg/auth/providers), habilitar Google e introducir Client ID y Client Secret de Google Cloud.
- En [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/gonhxfvelgxnjqpdyzpg/auth/url-configuration):
  - **Site URL:** `http://localhost:4200` en desarrollo.
  - **Redirect URLs permitidos:** `http://localhost:4200/auth/callback`.
- El backend debe tener configurados `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`, además de conexión a PostgreSQL.
- En producción, configurar también el dominio HTTPS publicado como redirect permitido. No habilitar comodines innecesarios.

**Atención:** la URI de retorno registrada en Google Cloud apunta a **Supabase**. La URI de retorno permitida en Supabase apunta a **Angular**. Son diferentes.

## Designar la primera cuenta administradora

La base se verificó sin usuarios ni administradores iniciales. NO se otorga ADMIN automáticamente por correo ni por ser el primer usuario.

1. Iniciar sesión con Google con la cuenta que quieres que sea administradora. La primera vez se redirigirá a la tienda como CLIENTE.
2. En [Supabase SQL Editor](https://supabase.com/dashboard/project/gonhxfvelgxnjqpdyzpg/sql/new), comprobar qué usuario se registró:
   ```sql
   select id, email from auth.users order by created_at desc limit 10;
   ```
3. Una vez que hayas verificado que **ese correo es de la administradora autorizada**, ejecutar (sustituir el correo de ejemplo):
   ```sql
   insert into app_private.administradores(usuario_id)
   select id from auth.users
   where lower(email) = lower('CORREO_GOOGLE_ADMIN_VERIFICADO')
   on conflict (usuario_id) do nothing;
   ```
4. Verificar la asignación:
   ```sql
   select u.email, a.creado_en
   from app_private.administradores a
   join auth.users u on u.id = a.usuario_id;
   ```
5. Actualizar el navegador o cerrar sesión y volver a entrar con Google: el backend devolverá `ADMIN` y entrará al panel.

La dirección `notificaciones.jmaromas@gmail.com` utilizada para el envío SMTP **no identifica por sí sola** a la administradora: no se le otorgó el rol automáticamente.

## Rutas

| Ruta | Acceso |
|---|---|
| `/` | Público (catálogo y carrito) |
| `/ingresar` | Inicio de sesión Google |
| `/auth/callback` | Retorno OAuth y verificación de rol |
| `/admin` | Solo administrador: guard Angular + filtro seguro del backend |
| `/checkout` | Comprador o invitado |
| `/pedido/:id` | Pedido protegido por token privado de seguimiento |

## Verificación local

Frontend:

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
npm install
npm start
```

Backend, en su propia carpeta:

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
set -a
source .env.local
set +a
mvn spring-boot:run
```

Probar:
- `http://localhost:4200/`: accesible sin sesión.
- `http://localhost:4200/ingresar`: muestra botón Google.
- Usuario nuevo inicia sesión: aparece catálogo y menú de cuenta.
- Usuario administrador vuelve a entrar: aparece panel y enlace **Ver como comprador**.
- En el catálogo, una cuenta admin autenticada conserva enlace **Panel administrador**.
- Usuario comprador que intente `/admin` es redirigido al catálogo; requests administrativas siguen dando 403.
- Ante backend desconectado, no se asigna rol ADMIN por defecto; se muestra aviso de error.

## Documentación oficial
- [Google OAuth con Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Configuración de Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
