---
title: Política de privacidad
lang: es
updated: 2026-10-13
description: Apartag no tiene cuenta, ni servidor, ni analítica. Lo que la app guarda se queda en el teléfono.
---

# Política de privacidad

[English](../en/privacy.md) · [Términos de uso](terminos.md)

> Antes de publicar esta página, sustituye cada **[PENDIENTE: …]**. Esos huecos identifican al responsable. Sin ellos, la página no sirve para las tiendas ni para informar a quien usa la app.

**Última actualización: 13 de octubre de 2026**

Apartag no tiene cuenta, ni servidor, ni anuncios, ni analítica. Lo que la app guarda se queda en tu teléfono. Juan Antonio López no lo recibe y no puede verlo.

## Quién es el responsable

El responsable es **Juan Antonio López**, persona física, en España.

- Correo: **[PENDIENTE: correo de contacto, por ejemplo hola@apartag.app]**
- Dirección postal: **[PENDIENTE: dirección postal completa]**
- Página de esta política: **[PENDIENTE: URL pública, por ejemplo https://apartag.app/privacidad]**

Si la app se publica a nombre de una sociedad, hay que sustituir este apartado por la razón social, el NIF y la dirección de esa sociedad.

## Qué es Apartag

Apartag es una app para cerrar las aplicaciones que tú eliges. Acercas un tag NFC, o escaneas un QR que muestra el móvil de alguien de confianza, y esas apps quedan bloqueadas. Para volver a abrirlas hace falta una de tus llaves: ese tag, un segundo tag que hayas emparejado como repuesto o la llave móvil. Si las pierdes, y no tienes activado el modo estricto, puedes usar uno de los desbloqueos de emergencia que se describen más abajo.

El bloqueo, la llave y las emergencias son gratis. Apartag Pro es un pago único opcional. Lo cobra Apple o Google: Apartag no recibe la tarjeta, el nombre ni la cuenta de la tienda. En el teléfono se guarda solo que Pro está activo (el identificador del producto y, si la tienda lo da, el de la transacción). Eso no sale del teléfono.

## Qué no ocurre con tus datos

- No creas una cuenta ni inicias sesión.
- No te pedimos el correo, el teléfono ni el nombre.
- No hay un servidor de Apartag que reciba lo que haces.
- No hay anuncios ni identificador de publicidad.
- No hay analítica de producto ni de terceros.
- No vendemos ni cedemos datos.
- No leemos tu ubicación, tus contactos, tu calendario, tus fotos, tus archivos ni el micrófono.
- No usamos el servicio de accesibilidad de Android.

Las tiendas (Google Play y App Store) tienen su propia cuenta de descarga. Esa relación es tuya con la tienda. Apartag no recibe tu identidad de la tienda.

## Qué se guarda en el teléfono

Todo lo de esta lista permanece en el almacenamiento privado de la app, en el propio teléfono. Desinstalar la app o borrar sus datos lo quita de esa instalación. En Android, esta versión pone `allowBackup` en false: la copia automática del sistema no copia ni restaura los datos de la app. Una copia subida antes de esta versión puede seguir existiendo en la cuenta de Google. En el iPhone, AsyncStorage (el contador, los identificadores de los tags, el secreto de la llave y las sesiones) queda fuera de la copia de iCloud. La selección de Tiempo de uso vive aparte, en el grupo que comparten las extensiones. Juan Antonio López no recibe una copia.

| Qué | Para qué |
|---|---|
| Si ya terminaste la introducción | No volver a mostrarla |
| Identificador del tag NFC emparejado | Reconocer tu llave y rechazar otro tag |
| Identificador de un segundo tag NFC (llave de repuesto), si lo emparejas | Aceptarlo también como llave y saber cuántas llaves tienes, porque el modo estricto pide al menos dos |
| Secreto de la llave móvil, si la creas | Comprobar el QR del otro móvil |
| En el móvil que actúa como llave: ese secreto y una etiqueta | Poder mostrar el QR. La etiqueta que viaja hoy en el QR de emparejar es el texto «apartag.», no tu nombre |
| Si hay una sesión en curso y cuándo empezó | Mantener el bloqueo y contar la sesión |
| Apps que marcas en Android (nombre de paquete) | Saber qué hay que bloquear |
| En iPhone: la selección de Tiempo de uso | Aplicar el escudo del sistema a lo que elegiste |
| Modo elegido (Trabajo, Estudio, Casa o Deporte) | Una etiqueta de la sesión. En esta versión los cuatro modos comparten la misma lista de apps |
| Tiempo de las sesiones de Apartag y hasta 40 sesiones (modo, inicio, fin y si terminó con un desbloqueo de emergencia) | La pantalla de estadísticas. Esas sesiones aparecen con la etiqueta «Emergencia» o «Emergency», según el idioma de la interfaz. La app está en español y en inglés: sigue el idioma del dispositivo (inglés si es el principal; si no, español) |
| Desbloqueos de emergencia que te quedan, fecha en que vuelve el siguiente y la hora más reciente que la app ha visto en el reloj del teléfono | Llevar la cuenta (se recupera una cada 30 días, hasta 3, sin fecha garantizada) y no recargar si el reloj va hacia atrás respecto a esa hora |
| Si tienes activado el modo estricto | Ocultar y desactivar los desbloqueos de emergencia mientras lo esté |
| Si Apartag Pro está activo, el identificador del producto y el de la transacción de la tienda | Saber que el pago único ya se hizo, sin pedir la tarjeta ni la cuenta |
| Ajustes del bloqueo en Android (lista, textos del aviso) | El servicio que tapa la app bloqueada |

La edad y las horas de la calculadora de «años en la pantalla» solo existen mientras esa pantalla está abierta. No se guardan. El cálculo no lee tu uso real del teléfono: usa los números que escribes ahí.

## Permisos

Cada permiso sirve para bloquear y desbloquear. Si lo rechazas, esa parte de la app no puede funcionar. El sistema operativo es quien muestra el permiso y quien lo puede revocar.

**Android**

- **Cámara.** Lee el QR de la llave móvil. No se guarda ninguna foto y no se usa el micrófono.
- **NFC.** Lee el identificador del tag. No escribimos nada en el tag.
- **Mostrar sobre otras apps.** Tapa la app bloqueada con un aviso a pantalla completa.
- **Acceso de uso.** Mira qué app está en primer plano para saber si es una de las que bloqueaste. No guarda un historial de tu día ni lo envía a nadie.
- **Notificaciones.** Avisa de que una app está bloqueada.
- **Servicio en primer plano.** Mantiene el bloqueo mientras dura la sesión, también después de reiniciar el teléfono si la sesión seguía activa.
- **Lista de apps instaladas.** Sirve para que elijas cuáles bloquear. Se lee en el teléfono. De forma duradera solo se guarda lo que tú marcas.

**iPhone**

- **Cámara.** El mismo uso que en Android: leer un QR, sin guardar la imagen.
- **NFC.** El mismo uso: leer el identificador del tag.
- **Tiempo de uso (Family Controls).** Tú autorizas a Apartag en tu propio iPhone, con Face ID o Touch ID. La app pone y quita el escudo del sistema sobre lo que elegiste. Tres extensiones del sistema (el monitor de actividad, la acción del escudo y la apariencia del escudo) comparten un grupo de datos en el mismo iPhone para mantener ese escudo. Esa autorización es para ti, en tu teléfono. No es un control parental de otra persona.

## Llave móvil

Si creas una llave móvil, se genera un secreto en tu teléfono. El QR de emparejar contiene ese secreto. Quien lo escanea lo guarda en su teléfono y, a partir de ahí, puede bloquear y desbloquear tus apps mostrando otro QR.

Ese segundo QR va firmado con HMAC-SHA256 en el teléfono y caduca a los 60 segundos. Solo vale una vez: si ya se ha escaneado, no vuelve a servir, aunque siga en pantalla. Un desfase pequeño entre los relojes de los dos móviles no lo invalida. No pasa por ningún servidor: va de una pantalla a la cámara del otro teléfono.

Enseña el QR de emparejar solo a alguien de tu confianza. Puedes revocar la llave desde Ajustes cuando no hay una sesión bloqueada. Si tienes activado el modo estricto, solo puedes revocarla si te quedan al menos otras dos llaves (el tag y un segundo tag). Apartag no puede revocarla por ti, porque el secreto no sale de los teléfonos.

## Si pierdes el tag

Si tienes un segundo tag emparejado o una llave móvil, puedes desbloquear con ellos.

Si no, Apartag tiene **desbloqueos de emergencia**. Funcionan solo dentro de la app y solo en tu teléfono:

- Empiezas con 3. Son gratis.
- Se recupera uno cada 30 días, hasta un máximo de 3. Gastar uno no reinicia un plazo que ya estuviera corriendo. Los días se calculan en el teléfono y la fecha no está garantizada. Si el reloj va hacia atrás respecto a la última hora que la app ya registró, no se recupera ninguno hasta que el reloj llegue a esa hora. Si la app sigue en memoria mientras el teléfono duerme, ese tiempo dormido puede no contar y la espera alargarse. Si la app estaba cerrada y el reloj se adelantó, la recarga puede llegar antes.
- Cada uno exige una cuenta atrás de 5 minutos con Apartag abierta en pantalla. La app mantiene la pantalla encendida durante esa espera y hasta que confirmas o sales, así que el bloqueo automático del teléfono no la cancela. Si bloqueas la pantalla a mano, cambias de app o Apartag pasa a segundo plano, la cuenta atrás se cancela y no se gasta ninguno. Al terminar, confirmas y el bloqueo se abre.
- La sesión queda anotada con la etiqueta «Emergencia» o «Emergency», según el idioma de la interfaz, en las estadísticas de la app, en tu teléfono. Después puedes emparejar un tag nuevo.

Ni el contador ni esas sesiones salen del teléfono. Nadie, tampoco Juan Antonio López, recibe un aviso de que has usado una emergencia.

El **modo estricto** es opcional y viene desactivado. Si lo activas, no hay desbloqueos de emergencia: solo desbloquean tus llaves. Para activarlo necesitas al menos dos llaves (el tag más un segundo tag o una llave móvil) y escribir «ESTRICTO» o «STRICT». Valen las dos palabras. No se puede desactivar durante un bloqueo. Mientras siga activo, no puedes quitar una llave si te quedarías con menos de dos.

Esta versión no tiene códigos de respaldo. Si no te queda ninguna llave ni ninguna emergencia, o tienes el modo estricto activo y has perdido todas tus llaves, la app no puede abrir la sesión desde dentro.

En ese caso, en Android puedes desinstalar Apartag o retirar «mostrar sobre otras apps» y el «acceso de uso». El bloqueo no sobrevive a eso: no pedimos permisos de administrador del dispositivo.

En el iPhone, la autorización es la de Tiempo de uso para el dueño del teléfono. Puedes revocar el permiso de Apartag en Ajustes, dentro de lo que iOS permite, o eliminar la app. Nosotros no tenemos un botón remoto para desbloquearte.

En Android, la lista para elegir qué bloquear no incluye la propia Apartag. En el iPhone, el selector de Tiempo de uso no puede ocultar Apartag de forma fiable. Si la marcas y el sistema no identifica ese elemento, la app no puede quitarlo, y el escudo puede impedir abrir la pantalla de emergencia. Las categorías no se aplican: iOS no dice si Apartag va dentro, así que hay que elegir las apps una a una.

Al desinstalar o al borrar los datos desaparece el contador de esa instalación, y una instalación nueva vuelve a empezar con 3, porque no hay copia en un servidor. En Android, esta versión no deja que la copia automática copie ni restaure esos datos; una copia anterior a esta versión puede seguir existiendo. En el iPhone, ese almacén queda fuera de iCloud. Juan Antonio López no recibe ninguna de esas copias.

## Menores

Apartag no está dirigida a menores de 14 años. No hay registro, así que no pedimos la edad y no tenemos datos de menores en un servidor. Si la ley de tu país exige una edad mayor para consentir el uso de una app, se aplica esa edad.

## Durante cuánto tiempo

Los datos duran lo que dure la instalación. Para borrarlos: desinstala Apartag o borra los datos de la app en los ajustes del sistema. Esta versión no los mete en la copia automática de Android. Una copia hecha antes puede seguir en la cuenta de Google. En el iPhone, AsyncStorage no entra en iCloud. No queda copia en poder del responsable, porque nunca la hubo.

## Tus derechos

Como el responsable no recibe esos datos, no puede enseñarte una copia que no tiene, ni corregirla, ni borrarla en un servidor. El acceso y el borrado se hacen en tu teléfono, como se indica arriba.

Si escribes al correo de contacto, Juan Antonio López te contestará a las preguntas sobre esta política. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es) si consideras que el tratamiento no se ajusta a la norma.

## Encargados, cesiones y transferencias

Apartag no usa encargados del tratamiento para los datos de la app, porque esos datos no salen del teléfono hacia nosotros.

Apple y Google tratan la descarga y la cuenta de la tienda según sus propias políticas. Si más adelante el sistema operativo te ofrece compartir diagnósticos de fallos con el desarrollador, esa opción es de la tienda, viene desactivada o es voluntaria según el sistema, y no forma parte de una analítica de Apartag. Esta versión no incorpora un SDK de fallos ni de métricas.

No hay transferencias internacionales hechas por Apartag, porque no hay un servidor de Apartag.

## Seguridad

Los datos están en el espacio privado de la app, con la protección del sistema. Apartag no añade una capa propia de cifrado encima. El secreto de la llave móvil se guarda ahí: por eso el QR de emparejar no debería verse en una captura ni enseñarse a cualquiera.

## Cambios

Si esta política cambia, se actualizará esta misma página y la fecha de arriba. Cuando la app esté en las tiendas, la ficha enlazará a la URL pública.

## Contacto

Juan Antonio López  
**[PENDIENTE: correo de contacto, por ejemplo hola@apartag.app]**  
**[PENDIENTE: dirección postal completa]**
