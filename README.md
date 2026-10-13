# Apartag

Aparta el móvil. Recupera tu tiempo.

App nativa de foco: eliges las apps, acercas un tag NFC, y esas apps se cierran. Para volver, hay que escanear el mismo tag o la llave móvil. Hay 3 desbloqueos de emergencia (se recupera 1 cada 30 días, máximo 3), cada uno con 5 minutos de espera. El modo estricto es opcional y las desactiva.

UI propia (noche + ámbar), no copia los colores de Monk.

## Qué hace de verdad

- **Android (Windows o Mac):** bloqueo real con overlay + acceso de uso (`expo-app-blocker`) y lectura NFC del tag. `android.allowBackup` es `false`: Auto Backup no copia ni restaura el estado local (contador de emergencias, plazo y secreto de la llave móvil).
- **iOS (hace falta Mac):** bloqueo real con Tiempo de uso / Family Controls. Apple tiene que aprobar el entitlement para TestFlight y App Store. Mientras tanto, en Xcode usa *Family Controls (Development)*. No incluyas Apartag ni una categoría: las categorías no se aplican, porque iOS no dice si Apartag va dentro y el selector no deja ocultarla.
- **Expo Go no vale.** Hay que generar un development build.

## Generar APK (recomendado)

No hace falta Android Studio. Con cuenta de Expo:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Cuando termine, descarga el `.apk` desde el enlace que muestra la CLI e instálalo en el móvil (permite “origenes desconocidos” si te lo pide).

Perfil `preview` en `eas.json` → `android.buildType: "apk"`.

## Arrancar en Android (local)

1. Instala [Android Studio](https://developer.android.com/studio) y un emulador, o activa USB debugging en el móvil.
2. Un tag NFC (NTAG213/215/216). En emulador, **mantén pulsado** el tag de la pantalla de Foco para simular el toque.
3. En esta carpeta:

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

4. En Ajustes, abre **permisos Android** y concede:
   - Mostrar sobre otras apps
   - Acceso a uso
   - Notificaciones

## iOS

1. Pon tu Team ID de Apple en `app.json` → `expo.ios.appleTeamId`.
2. Crea el App Group `group.com.apartag.app` y estos 4 App IDs, con Family Controls:
   - `com.apartag.app` (app)
   - `com.apartag.app.DeviceActivityMonitor`
   - `com.apartag.app.ShieldAction`
   - `com.apartag.app.ShieldConfiguration`
3. `npx expo prebuild --platform ios` y `npx expo run:ios --device` (NFC y Screen Time no van en simulador).

## Uso

1. Onboarding: empareja el tag.
2. Apps: marca las que quieres cerrar. En Android, Apartag no sale en la lista. En iOS, elige apps una a una; una categoría no se bloquea.
3. Foco: acerca el tag (o mantén pulsado para simular).
4. Para desbloquear, el mismo tag o la llave móvil. Si los pierdes: Desbloqueo de emergencia, 3 veces, con la app abierta 5 minutos. Se recupera 1 cada 30 días (máximo 3) y no se paga. El modo estricto, en Ajustes, quita esa salida; solo se activa con una llave de repuesto (segundo tag o llave móvil) y escribiendo `ESTRICTO`.

La llave móvil es otro teléfono emparejado. Muestra un QR firmado con HMAC-SHA256 que caduca a los 60 segundos y solo vale una vez. Un desfase pequeño de reloj entre los dos móviles se tolera. Si la llave ya estaba emparejada, el secreto se conserva: no hay que volver a escanear el QR de emparejar, pero el móvil que hace de llave tiene que estar actualizado para firmar el QR nuevo.

## Licencia

© 2026 Juan Antonio López. Todos los derechos reservados.

El código de Apartag es propietario. El aviso MIT que había en `LICENSE` era el de la plantilla de Expo y ya no aplica a este repositorio. Las dependencias siguen con su propia licencia.

Política de privacidad, términos (español e inglés) y las respuestas para Google Play y el App Store: [`docs/README.md`](docs/README.md).
