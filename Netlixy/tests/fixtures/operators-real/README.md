# Etiquetas reales autorizadas

**Estado actual: 0 muestras reales registradas.** Esta carpeta no contiene fotos ni credenciales. Añade solo fotos propias, anonimizadas o cuyo uso esté autorizado. No se crean patrones ni reglas mientras no existan muestras comprobables.

Formato local sugerido:

```text
<operador>-real-001/
├── input.local.jpg
├── expected.local.json
├── ocr.local.txt
├── diagnostic.local.json
└── notes.local.md
```

Los archivos locales están ignorados por `.gitignore`, incluidas fotos, texto OCR, resultados y valores esperados. No fuerces su inclusión con `git add -f`. Si se comparte una muestra, crea primero una copia revisada y redacta SSID, contraseña, números de serie, MAC, códigos QR y cualquier dato personal; usa `[REDACTED]` en los campos que se deban ocultar. Nunca subas `input.local.jpg`, secretos reales ni diagnósticos sin inspeccionarlos.

`index.json` guarda únicamente metadatos no sensibles y comienza con `samples: []`. Al validar una muestra, agrega un registro como:

```json
{
  "id": "digi-real-001",
  "operator": "digi",
  "source": "real",
  "status": "reviewed",
  "ocrCorrect": false,
  "operatorCorrect": true,
  "ssidCorrect": true,
  "passwordCorrect": false,
  "securityCorrect": true,
  "manualCorrection": true,
  "parserCorrect": false,
  "failureCategories": ["ocr.character_incorrect", "parser.password_not_detected"],
  "notes": "OCR confundió O con 0"
}
```

No añadas valores de credenciales ni datos personales a `notes` o `index.json`. Usa `failureCategories` con códigos como `photo.blur`, `ocr.character_incorrect`, `parser.wrong_candidate`, `operator.ambiguous` o `ui.candidate_not_visible` para clasificar los fallos observados. Los hallazgos avanzan por etapas: confirmado en una muestra, repetido en muestras independientes, regla candidata y solo entonces regla verificada mediante implementación y regresiones.

Para analizar una carpeta local reproduciblemente:

```sh
npm run test:fixture -- digi-real-001
npm run test:fixture -- --stats
```

El comando prefiere `input.local.jpg` y `expected.local.json`, usa Tesseract local y compara parser genérico contra perfiles activados. No imprime credenciales. Añade `--show-values` solo si estás trabajando en un terminal privado y necesitas ver los valores exactos. Para una prueba basada en un OCR previamente comprobado puede usarse `ocr.local.txt` si no hay imagen local. El análisis no escribe ni sube resultados.

## Primera muestra textual real: Huawei EchoLife EG8145V5

Se añade `huawei-eg8145v5-real-001` a partir de la transcripción literal suministrada por el usuario desde una fotografía física. La fotografía no se incluye en el repositorio. El fabricante/modelo se registran como Huawei EchoLife EG8145V5; el operador permanece `unknown` porque la etiqueta no lo identifica.

La transcripción con SSID, contraseña Wi-Fi y credencial de administración se conserva únicamente en archivos ignorados localmente (`ocr.txt` (transcripción sin datos de clientes/personales), `expected.local.json`, `notes.local.md`). `index.json` no contiene SSID ni contraseñas. Esta fixture verifica el parser sobre el texto facilitado; no equivale a una lectura Tesseract de la imagen y no certifica el OCR físico.
