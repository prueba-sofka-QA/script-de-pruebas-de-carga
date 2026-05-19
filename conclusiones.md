# Análisis de Datos de Referencia - Prueba de Carga Login API

> **Nota**: Este análisis corresponde a los **datos de referencia** provistos en el ejercicio (`results/summary.txt` y `results/vus_vs_tps.png`). Se analizan las métricas y patrones de comportamiento del sistema de referencia, identificando escalabilidad, saturación, caídas y recuperaciones en los datos provistos.

## 1. Resumen Ejecutivo — Métricas del Sistema de Referencia

**Archivo de referencia**: `results/summary.txt`
**API bajo prueba**: https://fakestoreapi.com/auth/login
**Duración total de la prueba**: 7 minutos

### 1.1 Métricas Generales del Sistema de Referencia

| Métrica | Valor en Referencia | Criterio | Cumplimiento |
|---------|-------------------|----------|-------------|
| TPS Promedio | 18.04 req/s | ≥ 20 TPS | ✗ NO CUMPLE |
| Tiempo de Respuesta P95 | 373.15 ms | < 1500 ms | ✓ Cumple |
| Tasa de Error | 0.00% | < 3% | ✓ Cumple |

---

## 2. Análisis Detallado de Métricas de Referencia

### 2.1 Throughput (TPS) del Sistema de Referencia

**Valor en datos de referencia**: 18.04 requests/segundo

**Análisis**:
- El TPS del sistema de referencia (18.04 req/s) está por debajo del criterio mínimo de 20 req/s
- Déficit: -1.96 TPS (-9.8% por debajo del objetivo)
- El sistema de referencia se satura a partir de 25 VUs, momento en que el TPS se estanca en ~18 req/s
- TPS estimado teórico a 30 VUs: ~24 req/s (proyectando crecimiento lineal de ~1.2 req/s por VU)
- GAP real vs teórico: 6 req/s (-25%)

**Interpretación**:
El sistema de referencia NO CUMPLE el objetivo de 20+ TPS. El throughput se estanca en 18.04 req/s, indicando un bottleneck estructural del servidor API.

### 2.2 Tiempo de Respuesta del Sistema de Referencia

| Percentil | Valor (ms) | Criterio | Cumplimiento |
|-----------|-----------|----------|--------------|
| Promedio | 345.30 | - | - |
| P50 (Mediana) | 340.94 | - | - |
| P90 | 361.25 | - | - |
| P95 | 373.15 | < 1500 | ✓ Cumple |
| P99 | 419.41 | - | - |
| Máximo | 836.87 | - | - |

**Análisis**:
Los tiempos de respuesta son estables y bajos. El P95 de 373.15ms está muy por debajo del límite de 1500ms, indicando que la latencia no es el factor limitante. La diferencia entre P50 (340.94ms) y P99 (419.41ms) es de solo ~78ms, demostrando una distribución muy uniforme.

### 2.3 Tasa de Errores del Sistema de Referencia

**Tasa de error total en referencia**: 0.00%

**Distribución de errores por código HTTP**:
- 200 OK: 100% (7605 requests)
- 4xx Client Errors: 0%
- 5xx Server Errors: 0%
- Timeouts: 0%

**Análisis**:
El sistema de referencia no presenta errores durante toda la prueba. Maneja correctamente todas las peticiones incluso en el punto de saturación, pero con throughput limitado. Esto refuerza la hipótesis de un límite estructural controlado (rate limiting, pool de conexiones) y no un problema de estabilidad o fallos del servidor.

---

## 3. Análisis por Etapa de Carga — Comportamiento del Sistema de Referencia

### 3.1 Fase de Warm-up (0-1 min, 0→10 VUs)

- **TPS inicial**: Crecimiento progresivo de 0 a ~10 TPS
- **Tiempo de respuesta P95**: ~340 ms
- **Tasa de error**: 0%

**Observaciones**:
El sistema responde bien durante el calentamiento. El TPS escala linealmente con los VUs sin degradación. Comportamiento normal esperado.

### 3.2 Fase de Ramp-up (1-4 min, 10→30 VUs)

- **TPS**: Crece hasta ~18 TPS y se estanca
- **Tiempo de respuesta P95**: Aumenta ligeramente de 340ms a ~373ms
- **Tasa de error**: 0%

**Observaciones**:
A partir de los 25 VUs (~200 segundos de prueba) el TPS deja de crecer y se estabiliza en ~18 TPS. Este es el punto de saturación del sistema. No hay recuperación ni caída abrupta, solo un estancamiento.

### 3.3 Fase Steady-State (4-6 min, 30 VUs constantes)

- **TPS promedio**: 18.04 req/s
- **Tiempo de respuesta P95**: 373.15 ms
- **Tasa de error**: 0%

**Observaciones**:
El TPS permanece constante durante toda la fase de carga sostenida. No se observan recuperaciones ni mejoras: el sistema opera al límite de su capacidad (~18 TPS). Los tiempos de respuesta se mantienen estables.

### 3.4 Fase de Ramp-down (6-7 min, 30→0 VUs)

**Observaciones**:
El TPS disminuye proporcionalmente a la reducción de VUs, sin anomalías. El sistema se recupera sin errores residuales.

---

## 4. Análisis de la Gráfica de Referencia VUs vs TPS (`vus_vs_tps.png`)

> **Nota**: Este análisis corresponde a los datos provistos en el ejercicio (`results/vus_vs_tps.png` y `results/summary.txt`). Se identifican los patrones de comportamiento del sistema de referencia bajo carga.

### 4.1 Patrones Identificados

#### 4.1.1 Escalabilidad Lineal (Inicio)

Durante la fase de ramp-up (0-240s), el TPS crece proporcionalmente al aumento de VUs:

| Intervalo | VUs | TPS | Incremento |
|-----------|-----|-----|-----------|
| t=0-60s (warm-up) | 0→10 | 0→~4.2 req/s | ~0.7 TPS por VU |
| t=60-100s | 10→~14 | ~4.2→~7.6 req/s | ~0.85 TPS por VU |
| t=100-140s | ~14→~18 | ~7.6→~10.4 req/s | ~0.7 TPS por VU |
| t=140-180s | ~18→~22 | ~10.4→~13.3 req/s | ~0.73 TPS por VU |
| t=180-240s | ~22→30 | ~13.3→~17.5 req/s | ~0.7 TPS por VU |

**Pendiente promedio**: ~0.73 TPS por VU agregado

#### 4.1.2 Punto de Saturación

- **Inicio de saturación**: ~25 VUs (~200s de prueba)
- **TPS máximo alcanzado**: ~18 req/s
- **Naturaleza**: El cambio es gradual — el TPS deja de crecer suavemente, no hay un colapso abrupto

#### 4.1.3 Caídas de Rendimiento

| Tipo | ¿Observado? | Detalle |
|------|-------------|---------|
| Caída abrupta | No | No hay puntos donde el TPS disminuya mientras los VUs aumentan |
| Degradación progresiva | No | Durante el steady-state (240-360s) el TPS se mantiene estable en ~18 TPS sin degradarse |
| Estancamiento | Sí | A partir de 25 VUs, el TPS deja de escalar pero no cae |

**Interpretación**: La ausencia de caídas abruptas sugiere que el límite es un **rate limiting controlado** por el servidor, no una contención de recursos (CPU/memoria). Un bottleneck de recursos típicamente muestra caídas pronunciadas al competir por recursos compartidos.

#### 4.1.4 Recuperaciones o Estabilización

- **¿Recupera el TPS después de una caída?**: No aplica — no hay caídas previas
- **¿Se estabiliza en un nuevo nivel?**: Sí, el TPS se estabiliza en ~18 req/s durante toda la fase de carga sostenida (240-360s)
- **Meseta**: Entre 200-360s, el TPS permanece constante con variación mínima (17.5-18.0 TPS)
- **Ramp-down**: Al reducir VUs (360-420s), el TPS decrece proporcionalmente sin anomalías, indicando que el sistema se recupera correctamente

### 4.2 Resumen de Patrones

| Patrón | Estado | Descripción |
|--------|--------|-----------|
| Escalabilidad lineal | ✓ Observado | ~0.73 TPS/VU hasta ~25 VUs |
| Saturación | ✓ Identificada | A ~25 VUs, TPS máximo ~18 req/s |
| Caídas | ✗ Ausentes | No hay drops abruptos |
| Recuperaciones | ✗ No aplica | No hay caídas de las que recuperarse |
| Estabilización | ✓ Confirmada | Meseta plana en ~18 TPS durante 2 min |

### 4.3 Relación con Datos Numéricos

Los patrones observados en la gráfica son consistentes con las métricas de `results/summary.txt`:
- **TPS promedio**: 18.04 req/s (confirma la meseta observada en la gráfica)
- **P95**: 373.15ms (estable, sin correlación con degradación de TPS)
- **Error rate**: 0% (consistente con la estabilidad observada)
- **VUs máximos**: 30 (el sistema no se probó más allá de este punto)

---

## 5. Comparación: Datos de Referencia vs Criterios de Aceptación

### 5.1 Tabla Comparativa

| Métrica | Dato de Referencia | Criterio Esperado | Diferencia | Análisis |
|---------|-------------------|-------------------|-----------|----------|
| TPS promedio | 18.04 req/s | ≥ 20 req/s | -1.96 req/s (-9.8%) | No cumple: el sistema de referencia está por debajo del objetivo |
| P95 (steady-state) | 373.15 ms | < 1500 ms | -1126.85 ms | Cumple con amplio margen: la latencia no es un factor limitante |
| Tasa de error | 0% | < 3% | -3% | Cumple: sin errores incluso en el punto de saturación |
| VUs para saturación | ~25 VUs | - | - | El sistema se satura antes de alcanzar los 30 VUs máximos de la prueba |
| TPS máximo sostenido | ~18 req/s | - | - | El throughput se estanca en este valor durante toda la carga alta |

### 5.2 Interpretación de Diferencias

**Respecto al objetivo de TPS (≥ 20 req/s):**
El sistema de referencia alcanza 18.04 TPS, quedando un 9.8% por debajo del criterio. La gráfica `vus_vs_tps.png` confirma que el TPS se estanca a partir de ~25 VUs y nunca supera los ~18 req/s, incluso cuando se mantienen 30 VUs durante 2 minutos.

**Respecto a la latencia (P95 < 1500ms):**
El P95 de 373.15ms está muy por debajo del límite. La gráfica muestra que los tiempos de respuesta se mantienen estables durante toda la prueba, sin correlación con la saturación del TPS. Esto sugiere que el límite está en el servidor (conexiones concurrentes), no en la capacidad de procesamiento por request.

**Respecto a la tasa de error (< 3%):**
Con 0% de errores, el sistema opera de forma estable incluso en su punto de saturación. No se observan timeouts, rechazos de conexión ni respuestas 5xx.

### 5.3 Comparativa de Patrones entre Referencia y lo Esperado

| Aspecto | Comportamiento de Referencia | Comportamiento Esperado (Ideal) | Brecha |
|---------|------------------------------|--------------------------------|--------|
| Escalabilidad | Lineal hasta ~25 VUs | Lineal hasta 30+ VUs | El sistema se satura antes de lo deseable |
| Throughput pico | ~18 TPS | ≥ 20 TPS | 9.8% por debajo |
| Estabilidad | Alta (sin fluctuaciones) | Alta | Coincide |
| Capacidad de recuperación | Correcta (sin anomalías) | Correcta | Coincide |

---

## 6. Causa Raíz

El sistema de referencia no cumple el criterio de 20+ TPS debido a un **límite estructural del servidor API**, no a defectos en el script de pruebas:

- **Conexiones concurrentes limitadas**: El servidor restringe el número de conexiones simultáneas
- **Rate limiting**: Posible limitación de tasa en el endpoint de autenticación
- **Pool de workers**: El servidor tiene un número fijo de workers que procesan solicitudes
- **Sin errores ni degradación**: La ausencia de errores y la estabilidad del TPS indican un límite controlado, no una falla

El script K6 está correctamente implementado: las 5 validaciones (status, tiempo de respuesta, token, JSON, errores 5xx) pasan al 100%, y la tasa de login exitoso es del 100%.

---

## 7. Conclusión Final

**El sistema de referencia NO CUMPLE el criterio de rendimiento.**

| Métrica | Criterio | Referencia | Déficit |
|---------|---------|-----------|---------|
| TPS | ≥ 20 req/s | 18.04 req/s | -1.96 TPS (-9.8%) |
| P95 | < 1500 ms | 373.15 ms | ✓ Cumple |
| Error rate | < 3% | 0% | ✓ Cumple |

**Causa**: Bottleneck en servidor API por conexiones limitadas, rate limiting o pool de workers insuficiente.

**Análisis de gráfica**: Los patrones identificados en `vus_vs_tps.png` confirman:
- Escalabilidad lineal hasta ~25 VUs (~0.73 TPS/VU)
- Saturación a ~25 VUs con TPS máximo de ~18 req/s
- Meseta estable sin caídas ni degradación durante el steady-state
- Recuperación correcta durante el ramp-down

**Solución recomendada**: 
- Escalar horizontalmente el servidor API (más instancias)
- Aumentar el pool de conexiones/workers
- Revisar configuración de rate limiting
- Implementar balanceo de carga

**No se requieren cambios en el script de pruebas K6**, ya que está correctamente implementado y todas las validaciones pasan al 100%.
