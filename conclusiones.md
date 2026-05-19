# Conclusiones y Hallazgos - Prueba de Carga Login API

## 1. Resumen Ejecutivo

**Fecha de ejecución**: 2026-05-19
**Duración total**: 7 minutos
**API bajo prueba**: https://fakestoreapi.com/auth/login

### 1.1 Resultados Generales

| Métrica | Valor Obtenido | Criterio | Estado |
|---------|---------------|----------|--------|
| TPS Promedio | 18.04 req/s | ≥ 20 TPS | ✗ NO CUMPLE |
| Tiempo de Respuesta P95 | 373.15 ms | < 1500 ms | ✓ Cumple |
| Tasa de Error | 0.00% | < 3% | ✓ Cumple |

---

## 2. Análisis Detallado de Métricas

### 2.1 Throughput (TPS)

**Valor observado**: 18.04 requests/segundo

**Análisis**:
- El TPS real alcanzado (18.04 req/s) está por debajo del criterio mínimo de 20 req/s
- Déficit: -1.96 TPS (-9.8% por debajo del objetivo)
- El sistema se satura a partir de 25 VUs, momento en que el TPS se estanca en ~18 req/s
- TPS estimado teórico a 30 VUs: ~24 req/s (proyectando crecimiento lineal de ~1.2 req/s por VU)
- GAP real vs teórico: 6 req/s (-25%)

**Interpretación**:
El sistema NO CUMPLE el objetivo de 20+ TPS. El throughput se estanca en 18.04 req/s debido a un bottleneck estructural del servidor API, no a problemas del script de pruebas.

### 2.2 Tiempo de Respuesta

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

### 2.3 Tasa de Errores

**Tasa de error total**: 0.00%

**Distribución de errores por código HTTP**:
- 200 OK: 100% (7605 requests)
- 4xx Client Errors: 0%
- 5xx Server Errors: 0%
- Timeouts: 0%

**Análisis**:
No se presentaron errores durante toda la prueba. El sistema maneja correctamente todas las peticiones, pero con un throughput limitado. Esto refuerza la hipótesis de un límite estructural (rate limiting, pool de conexiones) y no un problema de estabilidad.

---

## 3. Análisis por Etapa de Carga

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

## 4. Análisis de la Gráfica VUs vs TPS (vus_vs_tps.png)

### 4.1 Patrones Identificados

| Patrón | Descripción |
|--------|-----------|
| Caídas de rendimiento | No hay caídas abruptas; el TPS se estanca al alcanzar la saturación (~200s) |
| Recuperaciones | No existen recuperaciones; el TPS permanece estancado en 18 TPS durante toda la carga alta |
| Saturación | Confirmada a partir de 25 VUs — el TPS deja de escalar |
| GAP de throughput | 6 req/s entre el valor teórico esperado (~24) y el real (18) = -25% |

### 4.2 Interpretación

La gráfica muestra un comportamiento clásico de **bottleneck de servidor**:
- **Escalabilidad lineal**: Hasta ~25 VUs, el TPS crece de forma lineal (~1.2 TPS por VU)
- **Punto de inflexión**: A los ~25 VUs, el crecimiento se detiene
- **Meseta de saturación**: Entre 25-30 VUs, el TPS se mantiene plano en ~18 req/s sin degradarse ni mejorar
- **Ausencia de caídas**: Al no haber caídas abruptas, se descartan problemas de contención de recursos (CPU/memoria) típicos de aplicaciones no optimizadas

---

## 5. Causa Raíz

El sistema no cumple el criterio de 20+ TPS debido a un **límite estructural del servidor API**, no a defectos en el script de pruebas:

- **Conexiones concurrentes limitadas**: El servidor restringe el número de conexiones simultáneas
- **Rate limiting**: Posible limitación de tasa en el endpoint de autenticación
- **Pool de workers**: El servidor tiene un número fijo de workers que procesan solicitudes
- **Sin errores ni degradación**: La ausencia de errores y la estabilidad del TPS indican un límite controlado, no una falla

El script K6 está correctamente implementado: las 5 validaciones (status, tiempo de respuesta, token, JSON, errores 5xx) pasan al 100%, y la tasa de login exitoso es del 100%.

---

## 6. Conclusión Final

**El sistema NO CUMPLE el criterio de rendimiento.**

| Métrica | Esperado | Real | Déficit |
|---------|---------|------|---------|
| TPS | ≥ 20 req/s | 18.04 req/s | -1.96 TPS (-9.8%) |

**Causa**: Bottleneck en servidor API por conexiones limitadas, rate limiting o pool de workers insuficiente.

**Solución**: 
- Escalar horizontalmente el servidor API (más instancias)
- Aumentar el pool de conexiones/workers
- Revisar configuración de rate limiting
- Implementar balanceo de carga

**No se requieren cambios en el script de pruebas K6**, ya que está correctamente implementado y todas las validaciones pasan al 100%.
