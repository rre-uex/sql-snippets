# SQL Snippets with ERD Checker

Aplicación web para el aprendizaje de SQL y la validación de diagramas
Entidad-Relación, usada en la asignatura de Bases de Datos de la Universidad
de Extremadura.

Este repositorio contiene el sitio que se publica en
`https://i3lab.unex.es/sql-snippets/`.

## Qué hace

### SQL Snippets

Editor de consultas SQL que se ejecutan en el propio navegador, con SQL.js,
sobre bases de datos SQLite incluidas en el repositorio. Muestra los
resultados y puede dibujar el diagrama del esquema de la base de datos.

Se usa desde el Campus Virtual: el bloque de `sqlsnippets.js` se incrusta en
la pregunta y carga `sql-block.html` dentro de un iframe.

### ERD Checker

Comprueba diagramas Entidad-Relación escritos en notación bigER. El alumno
escribe su modelo, el comprobador lo analiza y le indica en qué se diferencia
del modelo esperado: entidades, atributos, claves, relaciones, cardinalidades,
jerarquías y entidades asociativas.

Se usa igualmente desde el Campus Virtual, con el bloque de `erd-checker.js`
cargando `erd-checker.html` en un iframe.

## Estructura

```
sql-snippets/
├── index.html           Página principal del editor de SQL
├── style.css            Estilos
├── script.js            Lógica del editor: consultas, resultados, esquema
├── schema.js            Generación del diagrama del esquema
├── sql-block.html       Página que se carga en el iframe de Moodle
├── sqlsnippets.js       Bloque que se incrusta en la pregunta de Moodle
│
├── erd-checker.html     Página del comprobador, dentro del iframe
├── erd-checker.css      Estilos del comprobador
├── app.js               Analizador de diagramas ER y comparación
├── erd-checker.js       Bloque que se incrusta en la pregunta de Moodle
│
├── db/                  Bases de datos SQLite de los ejercicios
├── images/              Iconos e imágenes
└── tests/               Pruebas y utilidades de depuración
```

## Notación bigER

El comprobador entiende la notación bigER. Ejemplo de lo que soporta:

```
erdiagram Ejemplo
notation=crowsfoot

entity Alumno {
    expediente key
    nombre
    correo unique
}

entity Asignatura {
    codigo key
    titulo
}

relationship imparte {
    Profesor[1..1] -> Asignatura[1..N]
}

weak entity Sesion {
    fecha partial-key
}

weak relationship pertenece_a {
    Asignatura[1..1] -> Sesion[0..N]
}

hierarchy h_persona Persona total disjoint

entity Alumno extends h_persona {
    expediente key
}

associative entity Matricula {
    nota
}

associative relationship cursa {
    Alumno[1..1] -> Matricula[1..N]
}
```

Soporta jerarquías con nombre propio, varias jerarquías sobre la misma entidad
base, jerarquías multinivel, y entidades y relaciones asociativas. Una
jerarquía con una sola subclase solo admite `partial`; con dos o más, la
restricción `disjoint` u `overlapping` es obligatoria.

La extensión de VS Code que usan los alumnos para escribir estos modelos es
una adaptación del proyecto bigER (https://github.com/borkdominik/bigER).

## Desarrollo

### Requisitos

- Un navegador moderno
- Python 3 o cualquier servidor estático para el desarrollo local

### En local

```bash
python3 -m http.server 8080
```

Y abrir `http://localhost:8080`

### Pruebas

Ver [tests/README.md](tests/README.md).

La batería automática del comprobador ER no está en este repositorio: necesita
modelos completos como ficheros de prueba, y esos modelos son las soluciones
de los ejercicios. Vive en el repositorio privado del proyecto, y conviene
ejecutarla allí antes de traer cambios de `app.js` aquí.

## Despliegue

El sitio son ficheros estáticos: basta con servir el contenido del
repositorio. No hay nada que compilar.

Las páginas cargan varias bibliotecas desde CDN y no desde este servidor
(CodeMirror, SQL.js, CryptoJS, Mermaid y Viz.js), así que el navegador del
alumno necesita acceso a internet, no solo al servidor.

## Licencia

ISC