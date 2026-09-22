# Tests de Integración: Encoding Base64

## Descripción

Los tests de integración verifican el proceso completo de codificación y
decodificación en base64 que usa el checker cuando se sirve desde el campus
virtual:

1. Codifican un fichero `.erd` a base64, igual que `encode-erd.js`
2. Decodifican el base64, igual que `app.js`
3. Verifican que el contenido se preserva byte a byte
4. Parsean y comparan el modelo con el parser real de `app.js`

## Objetivo

Responden a una pregunta que los tests de validación no cubren: **¿sobrevive
el modelo al viaje por la URL?**

Los otros tres ficheros (`test-ternaria.js`, `test-superheroes.js`,
`test-the-expanse.js`) comprueban la lógica de comparación partiendo del texto
en claro. Estos comprueban que ese texto llega intacto.

## Flujo

```
Fichero .erd original
    ↓
Codificación base64 (como encode-erd.js)
    Buffer.from(encodeURIComponent(texto)).toString('base64')
    ↓
Cadena base64  →  checker_parameter en el campus
    ↓
erd-checker.js monta la URL:  erd-checker.html?s=<base64>
    ↓
Decodificación (como app.js)
    decodeURIComponent(atob(base64))
    ↓
Texto decodificado
    ↓
¿Coincide exactamente con el original?
    ↓
Parseo y comparación del modelo
```

## De dónde sale el código que se prueba

```javascript
const { parseERD, compareSolutions } = require('../app.js');
```

No hay copia del parser en el test. `app.js` registra su interfaz solo cuando
existe `document`, y exporta `parseERD` y `compareSolutions` al cargarse desde
Node, así que estos tests ejercitan exactamente el código que corre en el
navegador.

Esto no siempre fue así: el fichero llegó a tener una copia del parser pegada
a mano, que se quedó desfasada sin que ningún test lo detectara. De ahí la
importancia de importar en lugar de copiar.

## Casos de test

| Caso | Fichero correcto | Fichero del alumno | Qué comprueba |
|---|---|---|---|
| 1 | Ternaria correcto | el mismo | Cero errores |
| 2 | Ternaria correcto | cardinalidades incorrectas | Detecta las dos cardinalidades cambiadas |
| 3 | Ternaria correcto | falta un participante | Detecta que la ternaria tiene un enlace en vez de dos |
| 4 | Superhéroes final | el mismo | Cero errores |
| 5 | Superhéroes final | incorrecto | Nueve comportamientos distintos |
| 6 | The Expanse final | el mismo | Cero errores |
| 7 | The Expanse final | incorrecto | Ocho comportamientos, incluidas las jerarquías |
| 8 | Ternaria correcto | el mismo | Preservación de acentos, ñ y espacios |

## Por qué no se cuenta el número de errores

Los casos con errores declaran los **comportamientos que deben detectarse**, no
cuántos errores debe producir el checker:

```javascript
mustDetect: [
    ['entidad que falta',    /Missing entity: "Mineral"/],
    ['entidad que sobra',    /Unexpected entity: "Dron"/],
    ['superclase equivocada',/Entity "Directivo": should be a subclass of "Personal"/],
    ['jerarquía que falta',  /Missing hierarchy: .*over "Personal"/]
]
```

Contar errores hacía el test frágil: cualquier mejora en la redacción de un
mensaje lo rompía sin que nada estuviera mal. Y un número como "43 errores" no
documenta nada sobre lo que se está cubriendo.

Con este criterio, cuando un caso falla el mensaje dice qué comprobación se ha
perdido, en lugar de que dos cifras no coinciden.

Los casos que comparan una solución correcta consigo misma sí exigen cero
errores, que ahí es una afirmación con sentido: si aparece algo, hay un
problema real.

## Ejecución

```bash
# Solo los tests de integración
npm run test:integration

# Todos
npm test
```

## Interpretación de la salida

```
Test 2/8: Ternaria - cardinalidades incorrectas
  Las cardinalidades de los dos enlaces de la ternaria están cambiadas
  base64: 452 caracteres, decodificado: 237, contenido preservado
  ✓ PASS - detectadas las 2 comprobaciones del caso
  2 errores en total
```

Números a observar:

- **base64**: alrededor del doble del original, por el `encodeURIComponent`
  más el propio base64
- **decodificado**: tiene que coincidir exactamente con el tamaño del fichero
- **errores en total**: informativo, no forma parte de la condición de éxito

## Validación de caracteres especiales

El caso 8 incluye una comprobación propia, porque la pérdida de acentos no
produce un error de modelo sino un texto distinto:

```javascript
customValidation: (encoded, decoded, original) => {
    const errors = [];
    if (decoded !== original) {
        errors.push('El texto decodificado no coincide exactamente con el original');
    }
    if (original.includes('ñ') && !decoded.includes('ñ')) {
        errors.push('Se perdió la letra ñ en el encoding/decoding');
    }
    return errors;
}
```

Esto importa porque los enunciados están en español y los modelos usan nombres
como `Estudiante_Politecnica`, `calificación` o `año`.

## Relación con los demás tests

| Suite | Propósito | Verifica |
|---|---|---|
| `test-integration-encoding.js` | Integración | Que el modelo sobrevive al viaje por la URL |
| `test-ternaria.js` | Validación | Relaciones ternarias y cardinalidades |
| `test-superheroes.js` | Validación | Entidades débiles, atributos y roles |
| `test-the-expanse.js` | Validación | Jerarquías y modelos complejos |

## Ejemplo del flujo real

```javascript
// 1. El profesor guarda la solución esperada
const erdContent = fs.readFileSync('erd/01 Superheroes/ER 01 Superheroes final.erd', 'utf-8');

// 2. Se codifica, como hace encode-erd.js
const base64 = Buffer.from(encodeURIComponent(erdContent)).toString('base64');

// 3. Ese valor es checker_parameter en el ejercicio del campus,
//    y erd-checker.js monta la URL:
const url = `erd-checker.html?s=${base64}`;

// 4. El navegador la decodifica, como hace app.js
const decoded = decodeURIComponent(atob(base64));

// 5. Tienen que ser idénticos
console.assert(decoded === erdContent, 'El contenido debe coincidir');

// 6. Y el MD5 que app.js devuelve al campus sale de ahí
const md5 = CryptoJS.MD5(decoded.trim()).toString();
```

Ese último paso es el motivo de que cambiar una solución obligue a actualizar
dos valores en el ejercicio, no uno. Para hacerlo en lote está
`tools/regen-campus.js`.
