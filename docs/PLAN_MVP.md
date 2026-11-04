# Plan del MVP

Marketing para una cafetería: el cliente se registra por QR, el admin sube el Excel de ventas del día, las ventas se asocian a los clientes registrados, un dashboard muestra qué compra cada uno y el admin envía ofertas por correo a un segmento.

> Este archivo es la fuente de verdad para quien implemente (personas o subagentes). Si el código y este plan no coinciden, se detiene y se pregunta.

## Fases

| # | Fase | Quién | Verificación |
|---|------|-------|--------------|
| 1 | Prisma 7 + SQLite, config validada, esquema y migración | Opus | `prisma migrate dev` crea la base; la API arranca |
| 2 | Cifrado (AES-256-GCM), HMAC, normalizadores y auth del admin (JWT) | Opus | tests unitarios de cifrado, normalización y login |
| 3 | Clientes: registro público, baja por token, listado para el admin | Opus | tests e2e de registro, baja y listado |
| 4 | Importación: interfaz de adaptador, adaptador Excel, deduplicación y asociación | Opus (diseño y servicio) + Haiku (Excel de ejemplo y tests del adaptador) | tests unitarios y e2e con un `.xlsx` generado |
| 5 | Dashboard (función pura) y ofertas (segmento, correo, envío) | Haiku (funciones puras y correo, con su test) + Opus (servicios que las unen) | tests unitarios; un correo visible en Mailpit |
| 6 | Frontend: login, panel, importar, clientes con QR, ofertas, registro y baja | Opus (cliente de API y sesión) + Haiku (páginas) | `next build`; flujo completo en el navegador |
| 7 | Docker (volumen SQLite y migraciones al arrancar), CI y README | Haiku + revisión de Opus | `docker compose up`, prueba de punta a punta |

## Modelo de datos (Prisma, SQLite)

- `Admin`: `email` único y `passwordHash` (bcrypt). Se crea al arrancar con `ADMIN_EMAIL` y `ADMIN_PASSWORD` si no hay ningún admin.
- `Cliente`: `nombre`, `correoCifrado?`, `correoHmac?` (único), `telefonoCifrado?`, `telefonoHmac?` (único), `consentimientoEn`, `bajaEn?` y `tokenBaja` (único, aleatorio).
- `Importacion`: `archivo`, `filasLeidas`, `importadas`, `duplicadas`, `conError`, `asociadas` y `creadoEn`.
- `Venta`: `idExterno` (único), `fecha`, `producto`, `cantidad`, `monto` (pesos, entero), `correoHmac?`, `telefonoHmac?`, `clienteId?` e `importacionId`.
- `MapeoColumnas`: `fuente` (id, por ejemplo `"excel"`) y `mapeo` (JSON). Guarda el último mapeo usado.
- `Oferta`: `asunto`, `mensaje`, `segmento` (JSON), `enviados`, `fallidos` y `creadoEn`.

La venta **no** guarda correo ni teléfono en texto plano: guarda solo sus HMAC, que sirven para asociarla al cliente aunque este se registre después.

## Reglas de negocio

- **Normalización:** el correo se recorta y pasa a minúsculas, y debe tener la forma `algo@algo.algo`. El teléfono chileno se deja en dígitos: 9 dígitos que empiezan con 9 → `+569XXXXXXXX`; 11 dígitos que empiezan con 569 → `+569XXXXXXXX`; cualquier otro caso no es válido.
- **Cifrado:** AES-256-GCM con IV aleatorio de 12 bytes. Se guarda como `v1:<iv base64>:<tag base64>:<texto cifrado base64>`. La clave es `CLIENTES_ENC_KEY`, 32 bytes en base64.
- **HMAC:** HMAC-SHA256 en hexadecimal del valor normalizado, con la clave `CLIENTES_HMAC_KEY`.
- **Registro:** necesita `nombre`, al menos un contacto válido y `consentimiento: true`. El nombre se recorta y no puede quedar vacío ni tener saltos de línea. Si el contacto ya existe, solo se renueva el consentimiento y se quita la baja (vuelve a aceptar); **no se cambian el nombre ni los contactos**, porque cualquiera que conozca el correo o el teléfono de otra persona podría, si no, reemplazarle los datos y recibir sus ofertas. La respuesta es la misma en los dos casos (y también si dos registros simultáneos chocan con el índice único), para no revelar quién está registrado. Después del registro, las ventas anteriores con el mismo HMAC **del cliente** se asocian a él. Limitación conocida: sin doble confirmación (*double opt-in*), quien conoce el contacto de alguien que se dio de baja puede volver a suscribirlo.
- **Baja:** `POST /api/clientes/baja/:token` marca `bajaEn`. Es POST, no GET, para que los antivirus de correo que abren enlaces no den de baja a nadie.
- **Importación:**
  - Mapeo de columnas: `fecha`, `producto` y `monto` son obligatorios; `cantidad` (1 por defecto), `correo`, `telefono` e `idExterno` son opcionales.
  - Fecha: una celda de fecha de Excel, `YYYY-MM-DD`, o `DD-MM-YYYY` / `DD/MM/YYYY`, con hora opcional `HH:mm`.
  - Monto: un número, o un texto como `$4.500` (el punto separa miles y la coma, decimales). Se redondea a entero.
  - Sin `idExterno`: se usa `fila:<sha256 de fecha|producto|cantidad|monto|correoHmac|telefonoHmac>#<n-ésima aparición en el archivo>`.
  - Una venta duplicada, ya sea por `idExterno` en la base o dentro del mismo archivo, se cuenta y se salta.
  - Una fila con error se cuenta con su número de fila y su motivo, y no detiene el import.
  - El archivo tiene que ser `.xlsx` de hasta 5 MB. Se procesa en memoria y no se guarda.
- **Segmento de una oferta:** `{ producto?: string, minCompras: number, dias: number }`. Entran los clientes sin baja que en los últimos `dias` días compraron `producto` (si viene; la comparación no distingue mayúsculas) al menos `minCompras` veces. Si `minCompras` es 0, entran todos los clientes sin baja.
- **Correo de oferta:** dice "Hola {nombre}," seguido del mensaje, y al final un enlace de baja `${PUBLIC_WEB_URL}/baja/${tokenBaja}` y el encabezado `List-Unsubscribe`. Solo se envía a clientes con correo.

## API (`/api`, JSON; los tipos están en `packages/shared`)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /health` | público | `{ status: 'ok' }` |
| `POST /auth/login` | público | `{ email, password }` → `{ token }` |
| `POST /clientes/registro` | público | `RegistroClienteDto` → `{ mensaje }` |
| `POST /clientes/baja/:token` | público | → `{ mensaje }` |
| `GET /clientes` | admin | `ClienteResumen[]` |
| `POST /importaciones/encabezados` | admin | multipart `archivo` → `EncabezadosExcel` |
| `POST /importaciones` | admin | multipart `archivo` + `mapeo` (JSON) → `ResumenImportacion` |
| `GET /importaciones` | admin | `ResumenImportacion[]` |
| `GET /dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | admin | `Dashboard` (por defecto, los últimos 30 días) |
| `POST /ofertas/vista-previa` | admin | `{ segmento }` → `{ destinatarios }` |
| `POST /ofertas` | admin | `{ asunto, mensaje, segmento }` → `OfertaResumen` |
| `GET /ofertas` | admin | `OfertaResumen[]` |

Admin = encabezado `Authorization: Bearer <token>`.

## Variables de entorno (API)

`DATABASE_URL`, `JWT_SECRET`, `CLIENTES_ENC_KEY`, `CLIENTES_HMAC_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `PUBLIC_WEB_URL` y `PORT`. La API no arranca si falta alguna o si una clave tiene un largo inválido.

## Fuera del MVP

Límite de peticiones en el registro, CSV y otros adaptadores, varios admins con roles, plantillas HTML de correo, envío en segundo plano (cola) y despliegue.
