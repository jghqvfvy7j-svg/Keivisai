# Plantillas de correo de GymTrack Pro (para Supabase)

Estas plantillas tienen la marca de GymTrack Pro (logo, colores, correo de soporte)
y están listas para pegar en Supabase.

## Cómo instalarlas

1. Entra a tu proyecto en Supabase → **Authentication** → **Email Templates**.
2. Para cada plantilla, selecciona el tipo correspondiente en el menú y pega el
   contenido HTML del archivo:

   | Archivo                     | Tipo en Supabase          |
   |-----------------------------|---------------------------|
   | 01-confirm-signup.html      | Confirm signup            |
   | 02-reset-password.html      | Reset Password            |
   | 03-magic-link.html          | Magic Link                |
   | 04-invite.html              | Invite user               |
   | 05-change-email.html        | Change Email Address      |
   | 06-reauthentication.html    | Reauthentication          |

3. Guarda cada una (Save).

## Activar verificación de correo (sugerencia #6)

Para que los usuarios tengan que confirmar su correo al registrarse:

1. Supabase → **Authentication** → **Providers** → **Email**.
2. Activa **"Confirm email"** (Enable email confirmations).
3. Guarda.

Con esto, al registrarse recibirán el correo `01-confirm-signup.html` y deberán
confirmar antes de poder iniciar sesión.

## Configurar el remitente (importante)

Para que los correos salgan desde **tu** dominio (no desde el de Supabase):

1. Supabase → **Authentication** → **Emails** → **SMTP Settings**.
2. Configura un proveedor SMTP (por ejemplo Resend, SendGrid, Amazon SES, o el de
   tu hosting) con el correo remitente **soporte@gymtrackpro.xyz**.
3. Verifica el dominio gymtrackpro.xyz en ese proveedor (registros SPF/DKIM) para
   que los correos no caigan en spam.

Sin SMTP propio, Supabase envía desde su dominio con un límite bajo de correos por
hora — suficiente para pruebas, pero para producción conviene el SMTP propio.

## Variables disponibles

Supabase reemplaza automáticamente estas variables:
- `{{ .ConfirmationURL }}` — el enlace de acción (confirmar, resetear, etc).
- `{{ .Email }}` — el correo del usuario.
- `{{ .Token }}` / `{{ .TokenHash }}` — código de verificación.
- `{{ .SiteURL }}` — la URL de tu app.

## Nota sobre el logo

Las plantillas usan un cuadro verde como logo (por compatibilidad de correo, donde
los SVG no siempre se ven). Si quieres el logo real, sube el PNG a un hosting público
y reemplaza el `<div>` verde por:
`<img src="https://gymtrackpro.xyz/icons/icon-192.png" width="36" height="36" alt="GymTrack Pro" style="border-radius:10px;" />`
