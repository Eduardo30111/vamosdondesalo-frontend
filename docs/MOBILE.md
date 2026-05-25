# Guía Móvil — Vamos Donde Salo!

Esta guía cubre todas las opciones para usar la app en celulares y tablets.

---

## Sección 1: Probar como PWA (Opción más rápida)

La app ya es una PWA (Progressive Web App) — se puede "instalar" en cualquier celular directamente desde el navegador, sin necesidad de tiendas de apps.

### Android (Chrome)

1. Abre Chrome en tu celular Android
2. Navega a tu URL de la app (ej: `https://vamos-donde-salo.vercel.app`)
3. Chrome mostrará un banner automático "Agregar a pantalla de inicio" — si aparece, tócalo
4. Si no aparece el banner:
   - Toca los **3 puntitos** (menú) arriba a la derecha
   - Selecciona **"Instalar app"** o **"Agregar a pantalla de inicio"**
5. Ponle nombre: "Donde Salo" → **"Agregar"**
6. La app aparecerá como ícono en tu pantalla de inicio
7. Al abrirla, se verá como una app nativa (sin barra de navegación del browser)

### iOS (Safari)

1. Abre **Safari** en tu iPhone/iPad (debe ser Safari, no Chrome)
2. Navega a tu URL de la app
3. Toca el botón de **Compartir** (cuadrado con flecha hacia arriba)
4. Desplázate y selecciona **"Agregar a pantalla de inicio"**
5. Ponle nombre: "Donde Salo" → **"Agregar"**
6. Busca el ícono nuevo en tu pantalla de inicio
7. Al abrirlo, se ejecuta a pantalla completa como app nativa

### Ventajas de la PWA
- **Cero configuración** — funciona inmediatamente
- **Siempre actualizada** — no necesitas "actualizar" desde tienda
- **Funciona offline** (básico) — las páginas visitadas se cachean
- **Liviana** — no ocupa espacio como una app nativa

### Limitaciones de la PWA
- No aparece en la Play Store / App Store
- Notificaciones push limitadas en iOS
- No tiene acceso a algunas APIs nativas (Bluetooth, NFC)

---

## Sección 2: Build Nativo Android con Capacitor

Si necesitas una APK para distribuir o publicar en Play Store.

### Requisitos

- **macOS, Windows o Linux** 
- **Android Studio** instalado
- **Java 17+**
- **Node.js 20+** y **pnpm**

### Paso 1: Instalar Android Studio (macOS)

1. Descarga Android Studio desde [developer.android.com/studio](https://developer.android.com/studio)
2. Abre el `.dmg`, arrastra Android Studio a Aplicaciones
3. Abre Android Studio por primera vez:
   - Selecciona **"Standard"** en la configuración
   - Acepta las licencias (click "Accept" en cada una)
   - Espera a que descargue los componentes (~2-5 min)

### Paso 2: Instalar SDKs necesarios

1. En Android Studio → **More Actions** → **SDK Manager** (o menú **Tools → SDK Manager**)
2. Tab **"SDK Platforms"**:
   - Marca ✅ **Android 14.0 ("UpsideDownCake")** API 34
3. Tab **"SDK Tools"**:
   - Marca ✅ **Android SDK Build-Tools 34**
   - Marca ✅ **Android SDK Platform-Tools**
   - Marca ✅ **Android SDK Command-line Tools (latest)**
4. Click **"Apply"** → **"OK"** → espera descarga

### Paso 3: Configurar variables de entorno

Agrega esto a tu `~/.zshrc` (o `~/.bashrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Luego recarga:
```bash
source ~/.zshrc
```

Verifica:
```bash
echo $ANDROID_HOME  # Debería mostrar /Users/tu-usuario/Library/Android/sdk
adb --version       # Debería mostrar la versión
```

### Paso 4: Compilar la app web

```bash
cd apps/web

# Build de producción
pnpm build

# Agregar plataforma Android (solo la primera vez)
pnpm cap:add:android

# Sincronizar archivos web con el proyecto nativo
pnpm cap:sync
```

### Paso 5: Abrir en Android Studio

```bash
pnpm cap:open:android
```

Esto abre el proyecto Android en Android Studio. Espera a que Gradle sincronice (puede tardar 2-3 minutos la primera vez).

### Paso 6: Ejecutar en Emulador

1. En Android Studio → **Device Manager** (ícono de celular en la barra lateral)
2. Click **"Create Device"**
3. Selecciona **Pixel 7** → **Next**
4. Selecciona imagen **API 34** (UpsideDownCake) → **Download** si no la tienes → **Next**
5. Nombre: déjalo por defecto → **Finish**
6. Click ▶️ **Run** en la barra superior (o `Shift+F10`)
7. Espera a que el emulador inicie y cargue la app

### Paso 7: Generar APK firmado

Para distribuir la app (WhatsApp, Drive, etc.):

1. En Android Studio → **Build** → **Generate Signed Bundle / APK...**
2. Selecciona **APK** → **Next**
3. **Create new key store**:
   - Key store path: elige una ubicación segura (ej: `~/keystores/salo.jks`)
   - Password: elige una contraseña fuerte
   - Alias: `salo`
   - Key password: misma contraseña
   - Validity: 25 años
   - Certificate: llena tu nombre y organización
4. **Next** → selecciona **release** → **Finish**
5. La APK estará en `apps/web/android/app/release/app-release.apk`

### Paso 8: Instalar en dispositivo real

```bash
# Conecta tu celular Android por USB
# Activa "Depuración USB" en Opciones de Desarrollador

adb install apps/web/android/app/release/app-release.apk
```

O simplemente envía el archivo `.apk` por WhatsApp/email y ábrelo en el celular.

---

## Sección 3: Build Nativo iOS con Capacitor

### Requisitos

- **macOS** (obligatorio para iOS)
- **Xcode 15+** (desde App Store, ~12GB)
- Apple Developer Account ($99/año) para dispositivo real

### Paso 1: Instalar Xcode

1. Abre **App Store** → busca **"Xcode"** → **Obtener** (descarga ~12GB, sé paciente)
2. Abre Xcode una vez descargado, acepta la licencia
3. Instala Command Line Tools:
```bash
sudo xcodebuild -license accept
xcode-select --install
```

### Paso 2: Instalar CocoaPods (si no lo tienes)

```bash
sudo gem install cocoapods
# O con Homebrew:
brew install cocoapods
```

### Paso 3: Compilar y agregar iOS

```bash
cd apps/web

# Build de producción
pnpm build

# Agregar plataforma iOS (solo la primera vez)
pnpm cap:add:ios

# Sincronizar
pnpm cap:sync
```

### Paso 4: Abrir en Xcode

```bash
pnpm cap:open:ios
```

### Paso 5: Ejecutar en Simulator

1. En Xcode, selecciona el dispositivo destino arriba (ej: **iPhone 15 Pro**)
2. Click ▶️ **Run** (o `Cmd+R`)
3. El Simulator se abrirá y cargará la app

### Paso 6: Ejecutar en dispositivo real

Requiere Apple Developer Account ($99/año):

1. En Xcode → proyecto → **Signing & Capabilities**
2. Selecciona tu **Team** (tu Apple Developer account)
3. Conecta tu iPhone por USB
4. Selecciónalo como destino
5. Click ▶️ **Run**
6. En tu iPhone: **Configuración → General → Gestión de dispositivos** → confía en el desarrollador

### Publicar en App Store

1. Necesitas Apple Developer Account activa ($99/año)
2. Crea un **App Store Connect** record
3. En Xcode: **Product → Archive** → **Distribute App** → **App Store Connect**
4. Completa la ficha en App Store Connect (screenshots, descripción, etc.)
5. Envía a revisión de Apple (1-3 días típicamente)

---

## Sección 4: Pruebas Móviles en Red Local

Para probar la app en tu celular conectado a la misma red WiFi que tu computadora (durante desarrollo):

### Encontrar tu IP local

```bash
# macOS
ipconfig getifaddr en0

# Resultado ejemplo: 192.168.1.50
```

### Probar Frontend

1. Asegúrate de que Docker esté corriendo (`docker compose up`)
2. En tu celular, abre el navegador y ve a: `http://192.168.1.50:3000`
3. Deberías ver la app funcionando

### Probar con Capacitor (Live Reload)

Edita `apps/web/capacitor.config.ts`:

```ts
server: {
  url: 'http://192.168.1.50:3000',  // Tu IP local
  cleartext: true,  // Permitir HTTP en desarrollo
}
```

Luego:
```bash
pnpm cap:sync
pnpm cap:open:android  # o cap:open:ios
# Run desde Android Studio / Xcode
```

> **Importante**: Recuerda quitar/comentar el `server.url` antes de hacer build de producción.

### Debugging remoto

**Android (Chrome):**
1. Conecta el celular por USB
2. En tu PC, abre Chrome → `chrome://inspect`
3. Tu dispositivo aparecerá listado con las pestañas abiertas
4. Click **"Inspect"** para abrir DevTools del celular

**iOS (Safari):**
1. En tu iPhone: Configuración → Safari → Avanzado → Inspector Web ✅
2. Conecta por USB
3. En tu Mac, abre Safari → Desarrollo → [nombre de tu iPhone] → selecciona la página

---

## Resumen de Opciones

| Opción | Tiempo setup | Distribución | Recomendado para |
|--------|-------------|-------------|------------------|
| **PWA** | 0 minutos | Link/QR | Clientes, empleados |
| **APK Android** | 30-60 min | Archivo directo | Repartidores, kiosco |
| **App Store iOS** | 1-2 horas + $99/año | App Store | Si necesitas presencia oficial |

### Nuestra recomendación

Para un restaurante/negocio pequeño, **la PWA es suficiente**. Es gratis, siempre actualizada, y funciona en cualquier dispositivo. Usa Capacitor solo si:
- Necesitas publicar en Play Store/App Store
- Requieres notificaciones push nativas
- Necesitas acceso a hardware específico (cámara avanzada, etc.)
