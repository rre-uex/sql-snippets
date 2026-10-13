# Tests Directory

Ficheros de prueba y utilidades de depuración del sitio.

## Qué hay aquí

### Pruebas de la aplicación de SQL Snippets

- **`test-row-limits.html`** — Límites de filas de SQL.js con datos artificiales
- **`debug-rows.html`** — Visualización de filas con varias bases de datos
- **`debug-detailed.html`** — Herramienta de depuración con registro detallado, para diagnosticar problemas de visualización de resultados
- **`test-schema.js`** — Prueba en Node de la función `createSchemaMermaid` (necesita el paquete `sqlite3`)

### Consultas SQL de prueba

- **`test-queries.sql`** — Consultas para diagnosticar límites de filas con la base de datos de pingüinos
- **`test-query.sql`** — Análisis de relaciones y mejoras del esquema
- **`test-mermaid-debug.sql`**, **`test-pk-fix.sql`**, **`test-pk-fk-fix.sql`** — Correcciones del diagrama de esquema

### Prueba del comprobador de diagramas ER

- **`test-improved-errors.html`** — Carga `app.js` en el navegador y compara pares de modelos para revisar la redacción de los mensajes de error

## Cómo ejecutarlas

### Pruebas en navegador

```bash
# Desde la raíz del proyecto
python3 -m http.server 8080
```

Y abrir `http://localhost:8080/tests/<fichero>.html`

### Pruebas SQL

```bash
sqlite3 db/<base-de-datos>.db < tests/<fichero>.sql
```

### Prueba en Node

```bash
cd tests
node test-schema.js
```

## Nota sobre la suite del comprobador ER

La batería automática de pruebas del comprobador de diagramas ER no está en
este repositorio. Necesita modelos ER completos como ficheros de prueba, y esos
modelos son las soluciones de los ejercicios del Campus Virtual, de modo que no
pueden estar en un repositorio público.

Esa suite vive en el repositorio privado del proyecto, junto a los ficheros
`.erd`. Quien vaya a modificar `app.js` debería ejecutarla allí antes de traer
los cambios aquí.

Lo que sí se puede verificar desde este repositorio es `test-improved-errors.html`,
que carga `app.js` en el navegador con modelos escritos en la propia página.

## Para qué sirvieron estos ficheros

- Diagnosticar el límite de filas mostradas (resuelto: era una limitación de `max-height` en CSS)
- Probar el análisis de relaciones del esquema
- Depurar la integración con SQL.js
- Verificar la carga de bases de datos y la ejecución de consultas