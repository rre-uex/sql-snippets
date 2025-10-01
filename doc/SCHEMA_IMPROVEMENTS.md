# Mejoras en la función createSchemaMermaid

## Problema Original
La función `createSchemaMermaid` generaba todas las relaciones con la misma cardinalidad y opcionalidad: `||--o{` (1:N con opcionalidad en el lado N), sin analizar correctamente la estructura de las claves foráneas.

## Mejoras Implementadas

### 1. Análisis de Cardinalidad
- **1:1**: Cuando todas las columnas de clave foránea constituyen la clave primaria completa de la tabla hija
- **1:N**: En cualquier otro caso (clave foránea no es PK completa, o es solo parte de una PK compuesta)

### 2. Análisis de Opcionalidad
- **Obligatoria** (`||--||` o `||--|{`): Cuando las columnas de clave foránea son NOT NULL
- **Opcional** (`||--o|` o `||--o{`): Cuando las columnas de clave foránea permiten NULL

### 3. Tipos de Relación Mermaid
- `||--||`: 1:1 obligatoria
- `||--o|`: 1:1 opcional  
- `||--|{`: 1:N obligatoria
- `||--o{`: 1:N opcional

### 4. Manejo de Claves Compuestas
La función ahora maneja correctamente:
- Claves foráneas que referencian múltiples columnas
- Claves foráneas que son parte de claves primarias compuestas
- Determinación correcta de cuándo una FK representa toda la PK vs. solo parte de ella

## Ejemplos de Resultados

### Base de Datos Empresa
```
EMPLEADO ||--o{ DEPARTAMENTO : director        # Opcional (director puede ser NULL)
DEPARTAMENTO ||--|{ EMPLEADO : nombreDpto, numeroDpto  # Obligatoria (empleado debe tener departamento)
```

### Base de Datos DGT
```
personas ||--|{ agentes : nif                  # Obligatoria (agente debe ser persona)
marcas ||--o{ modelos : cod_marca              # 1:N (cod_marca es solo parte de PK de modelos)
agentes ||--o{ sanciones : num_agente          # Opcional (sanción puede no tener agente)
```

## Cambios en el Código

### Nueva Estructura de Consulta
1. **table_info**: Información básica de columnas y tipos
2. **table_relations**: Generación de definiciones de tabla para Mermaid
3. **fk_detailed_info**: Análisis detallado de claves foráneas
4. **pk_column_count**: Conteo de columnas de clave primaria por tabla
5. **relationship_summary**: Determinación final de cardinalidad y opcionalidad

### Lógica de Decisión
```sql
CASE 
    -- Si todas las columnas FK son PK Y representan toda la PK → relación 1:1
    WHEN MIN(fk.fk_is_pk) = 1 AND MAX(fk.fk_is_pk) = 1 
         AND COUNT(fk.column_name) = COALESCE(pk.total_pk_columns, 0) THEN
        -- Determinar opcionalidad para 1:1
    ELSE
        -- Relación 1:N con opcionalidad apropiada
END
```

## Beneficios
- **Precisión**: Los diagramas ER ahora reflejan correctamente la estructura de la base de datos
- **Comprensión**: Los desarrolladores pueden entender mejor las restricciones de integridad
- **Documentación**: Los diagramas sirven como documentación precisa del modelo de datos