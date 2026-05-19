# Analisis de Datos de Referencia - Prueba de Carga Login API

> **Nota**: Este analisis corresponde a los **datos de referencia** provistos en el ejercicio (`results/textsummry.txt` y `results/VUs_vs_TPS.png`). Se analizan las metricas y patrones de comportamiento del sistema de referencia, identificando escalabilidad, saturacion, caidas y recuperaciones en los datos provistos.

## 1. Resumen Ejecutivo - Metricas del Sistema de Referencia

**Archivo de referencia**: `results/textsummry.txt`
**API bajo prueba**: Servicio de autenticacion (login)
**Duracion total de la prueba**: ~50 minutos (01:40 - 02:30)

### 1.1 Metricas Generales del Sistema de Referencia

| Metrica | Valor en Referencia | Criterio | Cumplimiento |
|---------|-------------------|----------|-------------|
| TPS Promedio | 73.18 req/s | >= 20 TPS | PASS - Cumple |
| Tiempo de Respuesta P95 | 1.57 s | < 1.5 s | FAIL - No cumple |
| Tasa de Error | 2.44% | < 3% | PASS - Cumple |
| Total Requests | 276,650 | - | - |
| VUs maximos | 140 | - | - |
| Checks exitosos | 97.55% | - | - |

**Conclusion general**: El sistema de referencia CUMPLE el criterio de TPS (73.18 >> 20 req/s) y tasa de error (2.44% < 3%), pero NO CUMPLE el criterio de latencia P95 (1.57s > 1.5s). Las dos caidas dramaticas de VUs observadas en la grafica revelan inestabilidad estructural bajo carga sostenida.

---

## 2. Analisis Detallado de Metricas de Referencia

### 2.1 Throughput (TPS) del Sistema de Referencia

**Valor en datos de referencia**: 73.18 requests/segundo

**Analisis**:
- El TPS del sistema de referencia (73.18 req/s) supera ampliamente el criterio minimo de 20 req/s
- Excedente: +53.18 TPS (+265.9% por encima del objetivo)
- El pico de TPS registrado es de 82.6 req/s (a las 02:02:00 con 140 VUs)
- Sin embargo, las caidas de VUs en la grafica indican que este throughput no es sostenible de forma continua
- El sistema no mantiene 140 VUs estables durante toda la prueba: sufre dos colapsos donde los VUs caen a 10-20

**Interpretacion**:
El sistema de referencia CUMPLE el objetivo de 20+ TPS. No obstante, la alta tasa de errores 5xx (5,987 errores) y las caidas de VUs indican que el throughput promedio de 73 req/s se logra a costa de inestabilidad. El sistema alterna entre periodos de alta carga (~140 VUs, 82 req/s) y colapsos (~10 VUs).

### 2.2 Tiempo de Respuesta del Sistema de Referencia

| Percentil | Valor (ms) | Criterio | Cumplimiento |
|-----------|-----------|----------|--------------|
| Promedio | 861.68 | - | - |
| Minimo | 191.86 | - | - |
| P50 (Mediana) | 613.42 | - | - |
| P90 | 1,280 | - | - |
| P95 | 1,570 | < 1500 | FAIL - No cumple |
| Maximo | 29,930 | - | - |

**Analisis**:
- El P95 de 1.57s **excede** el criterio de <1.5s en 70ms (+4.7%)
- La diferencia entre mediana (613.42ms) y promedio (861.68ms) es de 248ms, indicando una distribucion fuertemente sesgada: hay peticiones muy lentas que inflan el promedio
- **El valor maximo de 29.93s es critico**: es 19x mayor que el P95 (1.57s) y 49x mayor que la mediana (613ms). Esto revela fallos cascada o timeouts masivos durante las caidas de VUs
- Las peticiones exitosas (`expected_response:true`) tienen promedio 735.84ms vs 861.68ms global, confirmando que las peticiones fallidas son mas lentas
- La latencia no es estable: la brecha P95-P50 = 957ms indica alta variabilidad, correlacionada con los periodos de colapso del servidor

**Interpretacion**:
El sistema de referencia NO CUMPLE el criterio de latencia. El P95 de 1.57s y el maximo de 29.93s indican que durante los picos de carga o las caidas, las peticiones experimentan latencias extremas. Esto es consistente con un servidor que se satura y genera timeouts/errores 5xx.

### 2.3 Tasa de Errores del Sistema de Referencia

**Tasa de error total en referencia**: 2.44% (6,759 fallos de 276,650 requests)

**Distribucion de errores por tipo y etapa**:

| Tipo de Error | Etapa | Cantidad | Tasa | % del Total de Fallos |
|---------------|-------|----------|------|----------------------|
| HTTP 5xx (Server Error) | Stage 1 | 5,987 | 1.58/s | **88.6%** |
| HTTP 4xx (Client Error) | Stage 1 | 769 | 0.20/s | 11.4% |
| HTTP 5xx (Server Error) | Stage 0 | 1 | ~0/s | <0.1% |
| HTTP 5xx (Server Error) | Stage 2 | 2 | ~0/s | <0.1% |
| **Total** | | **6,759** | | **100%** |

**Analisis**:
- El 88.6% de los fallos (5,987) son errores 5xx del servidor, concentrados en el stage 1 de la prueba
- Esto confirma que el servidor colapsa bajo carga: no puede procesar todas las peticiones y responde con errores internos
- Los errores 4xx (769, 11.4%) son probablemente artefactos de la inestabilidad (requests malformados durante los colapsos)
- La tasa de error de 2.44% esta por debajo del criterio del 3%, por lo que **formalmente cumple**, pero la concentracion de 5xx en stage 1 es una senal de alerta

**Interpretacion**:
Aunque la tasa de error global cumple el criterio (<3%), los 5,987 errores 5xx indican que el servidor NO soporta la carga maxima de forma estable. Los errores no son uniformes, sino que se concentran en el stage 1, coincidiendo con las caidas de VUs observadas en la grafica.

---

## 3. Analisis de la Grafica de Referencia VUs vs TPS (`VUs_vs_TPS.png`)

> **Nota**: Este analisis se basa en la grafica de referencia provista en el ejercicio. Se identifican los patrones de comportamiento reales del sistema bajo carga.

### 3.1 Estructura de la Grafica

| Elemento | Descripcion |
|----------|-------------|
| **Tipo** | Grafico de lineas temporales con dos metricas superpuestas |
| **Eje Y izquierdo** | VUs (Usuarios Virtuales) - Escala 0 a 150 |
| **Eje Y derecho** | http_reqs (Solicitudes HTTP/s) - Escala 0/s a 100/s |
| **Eje X** | Tiempo - ~50 minutos (01:40:00 a 02:30:00) |
| **VUs** | Area azul clara sombreada |
| **http_reqs** | Linea azul oscura |

### 3.2 Fases Identificadas en la Grafica

#### Fase 1: Estable Inicial (01:40 - 01:50, ~10 min)
- **VUs**: ~150 constantes
- **http_reqs**: ~85 req/s estables
- **Estado**: Carga maxima sostenida, sistema respondiendo

#### Fase 2: Primera Caida Dramatica (~01:50, ~2 min)
- **VUs**: Caida abrupta de ~150 a 10-20
- **http_reqs**: Caida proporcional (sigue el patron de VUs)
- **Tipo de patron**: CAIDA ABRUPTA - Colapso del sistema
- **Interpretacion**: El servidor falla bajo la carga sostenida, k6 reduce drasticamente los VUs activos

#### Fase 3: Recuperacion Gradual (01:50 - 02:15, ~25 min)
- **VUs**: Recuperacion progresiva de 10-20 hasta ~140
- **http_reqs**: Recuperacion proporcional siguiendo a los VUs
- **Tipo de patron**: RECUPERACION - El sistema reintenta escalar
- **Interpretacion**: k6 incrementa VUs gradualmente. El servidor responde, permitiendo la recuperacion parcial

#### Fase 4: Estable Intermedio (02:02 - 02:25, ~23 min)
- **VUs**: ~140 estables (pico: 140 VUs a las 02:02 generando 82.6 req/s)
- **http_reqs**: ~82.6 req/s
- **Tipo de patron**: SATURACION - Meseta de rendimiento maximo
- **Interpretacion**: El sistema opera al limite de su capacidad (~140 VUs / 82 req/s)

#### Fase 5: Segunda Caida (~02:30)
- **VUs**: Nueva reduccion significativa
- **http_reqs**: Caida proporcional
- **Tipo de patron**: CAIDA ABRUPTA - Segundo colapso
- **Interpretacion**: El sistema vuelve a fallar, indicando que la causa raiz no se resolvio tras la primera recuperacion

### 3.3 Patrones Identificados (Resumen)

| Patron | Estado | Descripcion |
|--------|--------|-------------|
| **Caidas** | OBSERVADO (2 eventos) | Dos colapsos donde VUs caen de ~150 a 10-20. La primera a los ~10 min (~01:50), la segunda a los ~50 min (~02:30) |
| **Recuperaciones** | OBSERVADO (1 evento) | Recuperacion gradual post-primera caida (~01:50 a 02:15). Los VUs pasan de 10-20 a ~140 |
| **Saturacion** | OBSERVADO | El TPS se estabiliza en ~82 req/s con ~140 VUs. No crece mas alla de este punto |
| **Correlacion VUs-TPS** | OBSERVADO | La curva de http_reqs sigue fielmente la de VUs en todo momento, demostrando que el throughput es estrictamente proporcional a los usuarios activos |

### 3.4 Ciclo de Degradacion Identificado

```
ESTABLE (150 VUs, 85 req/s)
    │
    ├──> CAIDA #1: VUs colapsan a 10-20
    │         │
    │         └──> RECUPERACION GRADUAL: VUs suben a 140
    │                    │
    │                    └──> ESTABLE (140 VUs, 82 req/s)
    │                              │
    │                              └──> CAIDA #2: VUs colapsan nuevamente
```

Este ciclo "estable -> colapso -> recuperacion -> recolapso" revela un sistema que NO puede mantener carga alta de forma continua.

---

## 4. Correlacion Grafica vs Metricas (textSummary.txt)

| Observacion en Grafica | Evidencia en textSummary.txt |
|------------------------|------------------------------|
| Caidas de VUs a 10-20 | `vus: min=2` - confirma el minimo global durante colapsos |
| Recuperacion a ~140 VUs | `vus_max: 140` - confirma el maximo sostenido alcanzado |
| Correlacion VUs <-> http_reqs | `http_reqs: 276650 73.176857/s` - throughput promedio global |
| Dos caidas = dos colapsos del servidor | 5,987 errores HTTP 5xx (stage 1) = 88.6% de fallos por errores del servidor |
| TPS pico de 82.6 req/s | Throughput promedio de 73.18 req/s (promedio ponderado entre picos y valles) |
| Latencia extrema durante caidas | `http_req_duration max=29.93s` - timeouts masivos |
| Recuperacion entre caidas | `vus_max=140`, sistema logra retomar carga |
| Inestabilidad cronica | 2.44% error rate con 88.6% de fallos concentrados como 5xx |

---

## 5. Comparacion: Datos de Referencia vs Criterios de Aceptacion

### 5.1 Tabla Comparativa

| Metrica | Dato de Referencia | Criterio Esperado | Diferencia | Analisis |
|---------|-------------------|-------------------|-----------|----------|
| TPS promedio | 73.18 req/s | >= 20 req/s | +53.18 req/s (+265.9%) | Cumple con amplio margen |
| P95 latencia | 1,570 ms | < 1,500 ms | +70 ms (+4.7%) | **No cumple** por 70ms |
| Tasa de error | 2.44% | < 3% | -0.56% | Cumple por margen estrecho |
| VUs maximos | 140 | - | - | Carga pico alcanzada |
| Latencia maxima | 29.93 s | - | - | Valor extremo critico |
| TPS pico | ~82.6 req/s | - | - | No sostenible |

### 5.2 Interpretacion de Diferencias

**Respecto al objetivo de TPS (>= 20 req/s):**
El sistema de referencia alcanza 73.18 TPS promedio, superando el criterio por mas de 3.5x. Sin embargo, este throughput no es estable: alterna entre picos de 82 req/s y valles cercanos a 0 durante las caidas de VUs.

**Respecto a la latencia (P95 < 1500ms):**
El P95 de 1.57s NO cumple el criterio. La grafica muestra que las latencias extremas ocurren durante las caidas de VUs, cuando el servidor colapsa y genera timeouts (max 29.93s). La latencia en condiciones estables (~613ms mediana) es aceptable, pero los periodos de inestabilidad degradan los percentiles altos.

**Respecto a la tasa de error (< 3%):**
El 2.44% cumple formalmente, pero el 88.6% de los errores son 5xx del servidor (no del cliente ni del script). Esto es sintoma de un problema estructural, no de un margen de seguridad adecuado.

---

## 6. Causa Raiz

El sistema de referencia **no soporta carga sostenida de 140+ VUs** debido a un **bottleneck estructural del servidor**, evidenciado por:

1. **5,987 errores HTTP 5xx (stage 1)**: El servidor devuelve errores internos cuando la carga es alta, indicando saturacion de recursos (CPU, memoria, conexiones a BD, pool de workers)
2. **Dos caidas dramaticas de VUs**: k6 reduce los VUs activos cuando el sistema falla (de ~150 a 10-20), comportamiento tipico de un sistema que no puede procesar la carga
3. **Recuperacion parcial seguida de recolapso**: El sistema se recupera tras la primera caida pero vuelve a fallar ~25 min despues, indicando que la causa raiz (fuga de recursos, conexiones agotadas, acumulacion de procesos) persiste
4. **Latencia maxima de 29.93s**: Timeouts extremos durante los colapsos, 19x superiores al P95, confirman fallos cascada
5. **Correlacion VUs-TPS perfecta**: El throughput depende estrictamente del numero de VUs activos; cuando estos caen, el TPS se desploma

**Posibles causas tecnicas**:
- Pool de conexiones a base de datos saturado (las conexiones no se liberan correctamente)
- Rate limiting del servidor API que rechaza conexiones bajo carga excesiva
- Workers del servidor insuficientes para manejar 140+ conexiones concurrentes
- Memory leaks o acumulacion de goroutines/hilos que degradan el rendimiento con el tiempo
- Timeouts en cascada: peticiones lentas bloquean workers, generando mas peticiones lentas

---

## 7. Conclusion Final

**El sistema de referencia NO CUMPLE todos los criterios de rendimiento.**

| Metrica | Criterio | Referencia | Veredicto |
|---------|---------|-----------|-----------|
| TPS | >= 20 req/s | 73.18 req/s | PASS |
| P95 | < 1,500 ms | 1,570 ms | **FAIL** |
| Error rate | < 3% | 2.44% | PASS |
| Estabilidad | - | 2 caidas dramaticas | **FAIL implicito** |

**Hallazgos principales de la grafica `VUs_vs_TPS.png`**:
- **2 caidas dramaticas**: Los VUs colapsan de ~150 a 10-20 en dos ocasiones (~01:50 y ~02:30)
- **1 recuperacion gradual**: Tras la primera caida, el sistema se recupera progresivamente hasta ~140 VUs
- **Saturacion**: El TPS maximo sostenido es ~82 req/s con 140 VUs (pico observado a las 02:02)
- **Patron ciclico**: Estable -> Colapso -> Recuperacion -> Recolapso. El sistema no aprendio ni se estabilizo tras la primera falla
- **Correlacion perfecta VUs-TPS**: El throughput depende estrictamente de los usuarios activos, sin comportamiento anomalo de la metrica http_reqs por si sola

**Causa**: Bottleneck estructural del servidor bajo carga concurrente alta (140+ VUs), manifestado en 5,987 errores 5xx, latencia maxima de 29.93s, y dos colapsos de VUs.

**Recomendaciones**:
1. Investigar los 5,987 errores 5xx del stage 1: revisar logs del servidor para identificar la excepcion especifica
2. Aumentar el pool de conexiones/workers del servidor API
3. Implementar circuit breaker para evitar fallos cascada
4. Revisar configuracion de rate limiting
5. Repetir la prueba con monitoreo de recursos del servidor (CPU, memoria, conexiones activas) para identificar el cuello de botella exacto
6. Probar con escalones progresivos de VUs (50, 75, 100, 125, 150) para determinar el umbral exacto donde el sistema comienza a degradarse
