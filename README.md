# Apartag

Aparta el móvil. Recupera tu tiempo.

App nativa de foco: eliges las apps, acercas un tag NFC, y esas apps se cierran. Para volver, hay que escanear el mismo tag. Tres desbloqueos de emergencia.

UI propia (noche + ámbar), no copia los colores de Monk.

## Qué hace de verdad

- **Android (Windows o Mac):** bloqueo real con overlay + acceso de uso (`expo-app-blocker`) y lectura NFC del tag.
- **iOS (hace falta Mac):** bloqueo real con Tiempo de uso / Family Controls. Apple tiene que aprobar el entitlement para TestFlight y App Store. Mientras tanto, en Xcode usa *Family Controls (Development)*.
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
2. Apps: marca las que quieres cerrar.
3. Foco: acerca el tag (o mantén pulsado para simular).
4. Para desbloquear, el mismo tag. Emergencia: 3 veces.

## Licencia

Uso privado / prototipo.
