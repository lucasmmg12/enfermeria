---
description: Regla de Base de Datos Unificada y Gestión Vertical de Usuarios desde el Hub
---

# 🔒 Regla: Base de Datos Unificada + Usuarios Verticales desde el Hub

## Regla 1 — Base de Datos Única

**TODA operación de datos debe usar la instancia Supabase `hakysnqiryimxbwdslwe`.**

- Las variables `VITE_SUPABASE_URL` y `VITE_HUB_SUPABASE_URL` apuntan a la misma instancia.
- PROHIBIDO crear o conectar a otra instancia de Supabase.
- TODAS las tablas de Enfermería usan el prefijo `enf_` para evitar colisiones con otros sistemas que comparten la misma base.

### Prefijos de tablas en la base compartida:
- `hub_` → Tablas del Hub (perfiles, roles, sistemas, logs)
- `enf_` → Tablas de Enfermería
- `admqui_` → Tablas de ADM-QUI (Quirófano)
- `rrhh_` → Tablas de RRHH
- `trans_` → Tablas del Transcriptor

## Regla 2 — Gestión Vertical de Usuarios

**El Hub es la ÚNICA fuente de verdad para identidades de usuario.**

### Flujo de creación de usuario (exclusivamente desde el Hub):

```
1. Hub admin → RPC `hub_create_enfermeria_user()`
2. Se crea auth.users (identidad central con email + password encriptado)
3. Se crea hub_perfiles (perfil central)
4. Se crea enf_usuarios (perfil local para FK internas del sistema)
5. Se registra en hub_usuario_sistemas (asignación al sistema)
6. Se asigna hub_roles_sistema (rol: admin/coordinador/enfermero)
```

### Reglas de autenticación en Enfermería:

1. **Login**: Usar SIEMPRE `supabase.auth.signInWithPassword()` — NUNCA consultar `enf_usuarios` para validar credenciales.
2. **Perfil post-login**: Después del login exitoso, consultar `enf_usuarios` solo para obtener `nombre`, `apellido`, `rol`.
3. **Sesión**: Manejar con `supabase.auth.getSession()` y `onAuthStateChange()`.
4. **Logout**: Usar `supabase.auth.signOut()`.

### Prohibiciones:

- ❌ NO crear formularios de registro de usuarios en Enfermería
- ❌ NO guardar passwords en `enf_usuarios.password_hash` (legacy, solo lectura)
- ❌ NO autenticar comparando contra tablas custom
- ❌ NO crear tablas de usuarios nuevas fuera del esquema `auth.*` o `hub_*`
- ❌ NO crear instancias de Supabase adicionales

### RPCs del Hub disponibles para gestión de usuarios de Enfermería:

| RPC | Uso |
|---|---|
| `hub_create_enfermeria_user()` | Crear usuario (auth + hub + enf_usuarios) |
| `hub_list_system_users('enfermeria')` | Listar usuarios de Enfermería |
| `hub_toggle_system_user()` | Activar/desactivar usuario |
| `hub_update_system_user()` | Cambiar nombre, rol o password |
| `hub_get_system_roles('enfermeria')` | Listar roles: admin, coordinador, enfermero |

## Regla 3 — Tablas locales (`enf_*`)

- Las tablas `enf_*` son propiedad de Enfermería y pueden ser creadas/modificadas en el schema.sql del proyecto.
- Las FK de `enf_pases.enfermero_saliente_id`, `enf_registros.registrado_por`, etc. apuntan a `enf_usuarios(id)`.
- El `enf_usuarios.id` DEBE coincidir con `auth.users.id` (garantizado por las RPCs del Hub).
- Si se necesita una nueva tabla, usar el prefijo `enf_` y documentar en `supabase/schema.sql`.
