# Tests de Integración: Encoding Base64

## 📋 Descripción

Los tests de integración verifican el **proceso completo** de codificación/decodificación base64 que se usa en `erd-checker-parametrizable.html`. Estos tests:

1. ✅ Codifican archivos `.erd` a base64 (como `encode-erd.js`)
2. ✅ Decodifican el base64 (como `appParametrizable.js`)
3. ✅ Verifican preservación del contenido al 100%
4. ✅ **Usan el parser REAL de `app.js`** para detectar todos los errores
5. ✅ Validan el flujo completo end-to-end

## 🎯 Objetivo

Estos tests responden a la pregunta: **"¿Funciona realmente el sistema de URLs con base64?"**

A diferencia de los tests unitarios (`test-ternaria.js`, `test-superheroes.js`, `test-the-expanse.js`) que verifican la lógica de comparación, estos tests verifican que el **ciclo completo de encoding/decoding** funciona correctamente.

## 🔄 Flujo del Test

```
Archivo .erd original
    ↓
🔒 Codificación base64 (como encode-erd.js)
    ↓
Base64 string (URL query parameter)
    ↓
🔓 Decodificación (como appParametrizable.js)
    ↓
Texto decodificado
    ↓
✓ Verificación: ¿coincide con el original?
    ↓
🔍 Parsing y comparación ERD
```

## 📊 Casos de Test

### Test 1-3: Ternaria
- **Correcto**: Verifica que el encoding/decoding no altera el contenido
- **Cardinalidades incorrectas**: Preservación exacta del contenido
- **Falta relación**: Verificación de detección de errores post-decoding

### Test 4-5: Superhéroes
- **Completo**: 948 caracteres → 1992 base64 → 948 caracteres
- **9 errores**: Verifica detección de errores con contenido decodificado

### Test 6-7: The Expanse
- **Completo**: 2312 caracteres → 4952 base64 → 2312 caracteres
- **23 errores**: Test más complejo de encoding/decoding

### Test 8: Caracteres Especiales
- Verifica preservación de:
  - Acentos (á, é, í, ó, ú)
  - Letra ñ
  - Espacios y saltos de línea
  - Caracteres especiales en comentarios

## ✅ Resultados Esperados

### Todos los tests pasan al 100%
- ✓ 8/8 tests pasando completamente
- ✓ Contenido preservado al 100% (8/8 tests)
- ✓ Detección de errores completa usando parser real de `app.js`
- ✓ Caracteres especiales preservados (8/8 tests)

### Comparación con versión anterior

**ANTES** (parser simplificado):
- ✓ 5/8 tests pasaban completamente
- ✓ 8/8 preservación de contenido
- ⚠️ Parser simplificado no detectaba todos los errores

**AHORA** (parser real de app.js):
- ✓ **8/8 tests pasan completamente** 🎉
- ✓ 8/8 preservación de contenido
- ✓ **Detecta TODOS los tipos de errores**:
  - Cardinalidades incorrectas
  - Atributos faltantes/sobrantes
  - Roles en relaciones recursivas
  - Especialización (parcial/total, solapada/disjunta)
  - Restricciones UNIQUE
  - Claves incorrectas
  - Y mucho más...

## 🚀 Ejecución

```bash
# Ejecutar solo tests de integración
npm run test:integration

# Ejecutar todos los tests (incluye integración)
npm test
```

## 📈 Interpretación de Resultados

### ✓ Test Exitoso
```
Test 1/8: Ternaria - Solución correcta (encoding completo)
  📦 Codificado a base64: 452 caracteres
  📂 Decodificado: 237 caracteres
  ✓ Contenido preservado correctamente
  ✓ PASS - 0 errores detectados (esperados: 0)
```

**Significado**: El archivo se codificó y decodificó sin pérdida de información.

### Números a observar:
- **Codificado**: ~2x el tamaño original (base64 genera ~33% overhead + URL encoding)
- **Decodificado**: Debe coincidir EXACTAMENTE con el tamaño original
- **Preservación**: Debe ser 100% idéntico byte por byte

## 🔍 Validación de Contenido

El test incluye una validación personalizada para caracteres especiales:

```javascript
customValidation: (encoded, decoded, original) => {
    const errors = [];
    if (decoded !== original) {
        errors.push('El texto decodificado no coincide exactamente con el original');
    }
    if (original.includes('ñ') && !decoded.includes('ñ')) {
        errors.push('Se perdió la letra ñ en el encoding/decoding');
    }
    // ... más validaciones
    return errors;
}
```

## 💡 Valor de estos Tests

1. **Confianza**: Sabemos que el sistema de URLs funciona
2. **Regresión**: Si cambiamos encode-erd.js o appParametrizable.js, detectamos problemas
3. **Documentación**: Muestra cómo usar el encoding/decoding correctamente
4. **Integración Real**: Simula el uso real de la aplicación

## 🔗 Relación con otros Tests

| Test Suite | Propósito | Verifica |
|------------|-----------|----------|
| `test-integration-encoding.js` | **Integración** | Encoding/Decoding funciona |
| `test-ternaria.js` | Validación | Lógica de comparación ternaria |
| `test-superheroes.js` | Validación | Lógica entidades débiles/roles |
| `test-the-expanse.js` | Validación | Lógica especialización/compleja |

**Juntos** forman una suite completa que verifica:
- ✅ El encoding/decoding funciona (integración)
- ✅ La lógica de validación es correcta (unitarios)
- ✅ El sistema completo funciona end-to-end

## 🎓 Ejemplo de Uso Real

```javascript
// 1. Usuario guarda un ERD
const erdContent = fs.readFileSync('mi-solucion.erd', 'utf-8');

// 2. Encode como lo hace encode-erd.js
const base64 = Buffer.from(encodeURIComponent(erdContent)).toString('base64');

// 3. Crear URL
const url = `erd-checker-parametrizable.html?solution=${base64}`;

// 4. El navegador carga y decodifica (appParametrizable.js)
const decoded = decodeURIComponent(atob(base64));

// 5. VERIFICACIÓN: ¿son idénticos?
console.assert(decoded === erdContent, 'Content must match!');
```

Este test automatiza esta verificación para todos nuestros archivos .erd.
