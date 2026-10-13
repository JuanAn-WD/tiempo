---
title: Términos de uso
lang: es
updated: 2026-10-12
description: Condiciones de uso de la app Apartag. Licencia de uso personal, sin cuenta y sin servidor.
---

# Términos de uso

[English](../en/terms.md) · [Política de privacidad](privacidad.md)

> Antes de publicar esta página, sustituye cada **[PENDIENTE: …]**.

**Última actualización: 12 de octubre de 2026**

Estos términos son el contrato entre tú y **Juan Antonio López** para el uso de la app Apartag. Al instalarla o usarla, los aceptas. Si no los aceptas, no uses la app.

- Correo: **[PENDIENTE: correo de contacto, por ejemplo hola@apartag.app]**
- Dirección postal: **[PENDIENTE: dirección postal completa]**
- Esta página: **[PENDIENTE: URL pública, por ejemplo https://apartag.app/terminos]**

Si la app se publica a nombre de una sociedad, el titular de estos términos pasa a ser esa sociedad y hay que escribir aquí su razón social, su NIF y su dirección.

## La app

Apartag bloquea las aplicaciones que tú eliges. La llave es un tag NFC o el móvil de otra persona, que muestra un QR. Puedes añadir un segundo tag como llave de repuesto. Para volver a entrar hay que usar una de tus llaves o, si el modo estricto está desactivado, un desbloqueo de emergencia.

Esta versión:

- es gratuita y no tiene compras dentro de la app;
- no tiene cuenta ni servidor;
- incluye hasta 3 desbloqueos de emergencia, gratuitos y locales, con una espera de 5 minutos, que el modo estricto opcional desactiva;
- no tiene código de respaldo;
- no impide desinstalar la app.

Es una fricción física, no una cerradura que el autor pueda abrir en remoto y no un dispositivo médico. No trata adicciones ni sustituye atención sanitaria.

Los cuatro modos (Trabajo, Estudio, Casa y Deporte) son etiquetas. En esta versión comparten la misma lista de apps.

La calculadora de años usa la edad y las horas que escribes en esa pantalla. No mide tu uso real del teléfono.

## Licencia

Apartag y su código fuente son propiedad de Juan Antonio López. Todos los derechos reservados. El detalle está en el archivo `LICENSE` del repositorio.

Recibes una licencia personal, no exclusiva, intransferible y revocable para instalar y usar el binario oficial en tus teléfonos, según estos términos y los de la tienda donde lo descargues.

Esa licencia no te autoriza a copiar el código, modificarlo, publicarlo, venderlo ni crear obras derivadas, salvo los derechos irrenunciables que te reconozca la ley (incluida, cuando proceda, la descompilación para interoperar).

El nombre Apartag y el wordmark son del titular. Estos términos no afirman que la marca esté registrada.

Los componentes de terceros que lleva la app siguen con su propia licencia. Eso no te concede una licencia sobre el código de Apartag.

## La llave

Empareja un tag que controles. Si quieres, empareja también un segundo tag como llave de repuesto: abre y cierra igual que el principal. Los identificadores de esos tags se guardan solo en tu teléfono. La app no escribe en los tags. Mientras hay un bloqueo no se pueden cambiar las llaves.

Si creas una llave móvil, el QR de emparejar contiene el secreto que permite bloquear y desbloquear. Quien lo escanea, o quien obtiene una foto de ese QR, puede actuar como llave hasta que revoques el secreto en Ajustes (cuando no haya una sesión bloqueada y, si el modo estricto está activo, solo si te quedan otras dos llaves). Enséñalo solo a alguien que sepa lo que está aceptando.

El QR que esa persona muestra después va firmado en su teléfono, caduca a los 60 segundos y solo puede usarse una vez. Un desfase pequeño de reloj entre los dos móviles se tolera.

No uses Apartag para bloquear el teléfono de otra persona sin que lo sepa y lo acepte. La persona que actúa como llave también tiene que querer ese papel.

## Desbloqueos de emergencia y modo estricto

Si pierdes tus llaves, la app ofrece desbloqueos de emergencia:

- Tienes hasta 3. Son gratuitos y no forman parte de ninguna compra.
- Se recupera uno cada 30 días, hasta un máximo de 3. Gastar uno no reinicia el plazo que ya estaba corriendo. Esa fecha no está garantizada. Si el reloj va hacia atrás respecto a la última hora que la app ya registró, no se recupera ninguno hasta que el reloj llegue a esa hora. Si la app sigue en memoria mientras el teléfono duerme, el tiempo dormido puede no contar y la espera alargarse. Si la app estaba cerrada y el reloj se adelantó, la recarga puede llegar antes.
- Cada uno exige una cuenta atrás de 5 minutos con Apartag abierta en pantalla. La app mantiene la pantalla encendida durante esa espera y hasta que confirmas o sales, así que el bloqueo automático no la cancela. Si la app pasa a segundo plano, cambias de app o bloqueas la pantalla a mano, la cuenta atrás se cancela y no se gasta ninguno. Al terminar tienes que confirmar.
- La sesión queda marcada como «Emergencia» en las estadísticas, solo en tu teléfono.

El contador se guarda y se calcula solo en tu teléfono. El autor no puede consultar, reponer ni regalar desbloqueos. Desinstalar y volver a instalar empieza otra vez con 3. En Android esta versión no deja que la copia automática copie ni restaure esos datos; una copia anterior puede seguir existiendo. En el iPhone ese almacén no entra en iCloud.

El modo estricto es opcional y viene desactivado. Mientras está activo no hay desbloqueos de emergencia: solo tus llaves desbloquean. Para activarlo necesitas al menos dos llaves (el tag principal más un segundo tag o una llave móvil) y escribir «ESTRICTO». No se puede desactivar durante un bloqueo, y mientras siga activo no puedes quitar una llave si te quedarías con menos de dos. Actívalo solo si aceptas que, si pierdes todas tus llaves, la app no podrá abrir el bloqueo desde dentro.

En Android no puedes marcar la propia Apartag en la lista. En el iPhone el selector de Tiempo de uso no puede ocultar Apartag de forma fiable: si la marcas y el sistema no identifica ese elemento, la app no puede quitarlo y puedes quedarte sin poder abrir la pantalla de emergencia. Las categorías no se bloquean. Hay que elegir las apps una a una.

## Si no puedes desbloquear

Si no tienes ninguna llave ni ningún desbloqueo de emergencia disponible, o el modo estricto está activo y no tienes tus llaves, el autor no puede desbloquearte: no tiene tu secreto ni una cuenta tuya a la que entrar. Esta versión no tiene códigos de respaldo.

En Android, desinstalar la app o retirar los permisos de mostrar sobre otras apps y de acceso de uso termina el bloqueo. En el iPhone, puedes revocar la autorización de Tiempo de uso de Apartag en Ajustes, dentro de lo que iOS permite, o eliminar la app.

## Permisos

El bloqueo necesita los permisos que describe la [política de privacidad](privacidad.md): en Android, cámara, NFC, mostrar sobre otras apps, acceso de uso, notificaciones y un servicio en primer plano; en iPhone, cámara, NFC y Tiempo de uso autorizado por ti. Si no los concedes, el bloqueo real no funciona.

Apartag no pide el servicio de accesibilidad de Android ni permisos de administrador del dispositivo.

## Uso aceptable

Te comprometes a usar la app de forma lícita. En particular, no la uses para vigilar a otra persona, para eludir una medida de protección de un menor, ni para interferir en un teléfono que no administras con el consentimiento de su dueño.

## Tiendas

Si descargas Apartag en Google Play o en el App Store, también aceptas las condiciones de esa tienda. Si esas condiciones y estos términos dicen cosas distintas sobre el pago o el reembolso, mandan las de la tienda. En esta versión no hay nada que comprar.

## Garantía y responsabilidad

La app se ofrece tal cual, sin una promesa de que el bloqueo sea imposible de saltar, de que funcione en todos los modelos de teléfono, ni de que un tag concreto sirva. El NFC y Tiempo de uso dependen del sistema y del aparato. Los desbloqueos de emergencia dependen del reloj del teléfono y de que la app siga abierta durante la cuenta atrás. La pantalla se mantiene encendida para que el bloqueo automático no la corte. Una llamada, salir de la app o bloquear la pantalla a mano sí la interrumpe, y entonces hay que empezarla de nuevo. No se promete que cada desbloqueo vuelva a los 30 días exactos.

Nada de esto limita los derechos que la ley de consumo no permite excluir. Si eres consumidor en la Unión Europea, conservas esos derechos.

En lo demás, y hasta donde la ley lo permite, Juan Antonio López no responde de daños indirectos, de la pérdida de datos que estuviera solo en tu teléfono, ni de no poder usar las apps que tú decidiste bloquear. Como esta versión no tiene un precio, no hay una cantidad pagada que sirva de tope. Esta frase no se aplica cuando la ley impide ese tope, ni a los daños que la ley no deja limitar.

## Cambios

Estos términos pueden actualizarse publicando la versión nueva en esta página, con una fecha nueva. Si sigues usando la app después de ese cambio, aceptas la versión nueva. Si no la aceptas, deja de usar la app y desinstálala.

## Ley aplicable

Estos términos se rigen por la ley española. Si eres consumidor en la Unión Europea, puedes acudir a los juzgados de tu domicilio y se aplica la protección imperativa de tu país. Si no eres consumidor, los juzgados del domicilio del titular en España conocen de las disputas, sin perjuicio de las normas procesales que no se puedan excluir.

## Idioma

La versión española y la inglesa dicen lo mismo. Si hubiera una diferencia, prevalece la española.

## Contacto

Juan Antonio López  
**[PENDIENTE: correo de contacto, por ejemplo hola@apartag.app]**  
**[PENDIENTE: dirección postal completa]**
