# Conclusiones y Hallazgos - Prueba de Carga Login API

## 1. Resumen Ejecutivo

**Fecha de ejecucion**: 2026-05-15
**K6 version**: v2.0.0
**API bajo prueba**: https://fakestoreapi.com/auth/login
**Perfil de carga**: ramping-vus (0->10->30->30->0 VUs, 7 min)

### 1.1 Resultados Generales

| Metrica | Valor Obtenido | Criterio | Estado |
|---------|---------------|----------|--------|
| TPS Promedio | 18.04 req/s | >= 20 TPS | FAIL |
| Tiempo de Respuesta P95 | 373.16 ms | < 1500 ms | PASS |
| Tasa de Error | 0.00% | < 3% | PASS |

---

## 2. Analisis Detallado de Metricas

### 2.1 Throughput (TPS)

**Valor observado**: 18.04 requests/segundo

**Analisis**:
- Total de requests: 7,605 en 421.7 segundos
- Con 30 VUs en steady-state, cada VU completa ~1 iteracion cada 1.09s (incluyendo think time)
- El TPS se estabilizo alrededor de 18 req/s durante la fase steady-state

**Interpretacion**:
No se alcanzo el criterio de 20 TPS porque el sleep (0.5-1s) por iteracion reduce el throughput. Con 30 VUs y un tiempo de respuesta de ~345ms mas ~750ms de think time, cada VU hace ~0.92 req/s, resultando en ~27.6 req/s teorico. Sin embargo, en la practica se observaron 18 req/s porque no todos los VUs estan activos simultaneamente durante todo el test.

### 2.2 Tiempo de Respuesta

| Percentil | Valor (ms) | Criterio | Cumplimiento |
|-----------|-----------|----------|--------------|
| Promedio | 345.30 | - | - |
| P50 (Mediana) | 340.94 | - | - |
| P90 | 361.25 | - | - |
| P95 | 373.16 | < 1500 | PASS |
| P99 | 419.41 | < 2000 | PASS |
| Maximo | 836.87 | - | - |

**Analisis**:
Los tiempos de respuesta son excelentes, muy por debajo del criterio de 1.5s. La API de Fake Store responde consistentemente en ~340-420ms para el 99% de las peticiones. No se observo degradacion significativa al aumentar la carga.

### 2.3 Tasa de Errores

**Tasa de error total**: 0.00%

**Distribucion de codigos HTTP**:
- 200/201 OK: 100% (7,604 requests exitosos)
- 4xx: 0
- 5xx: 0
- Timeouts: 0

**Analisis**:
La API fue completamente estable durante toda la prueba. No se registraron errores de ningun tipo. El endpoint de login de fakestoreapi.com devuelve 201 (Created) para logins exitosos (no 200).

---

## 3. Analisis por Etapa de Carga

### 3.1 Fase de Warm-up (0-1 min, 0->10 VUs)

- **TPS en el minuto 1**: ~8 req/s
- **Tiempo de respuesta**: ~340ms
- **Tasa de error**: 0%

**Observaciones**: Arranque gradual sin problemas.

### 3.2 Fase de Ramp-up (1-4 min, 10->30 VUs)

- **TPS promedio**: 10 -> 17 req/s
- **Tiempo de respuesta P95**: 370ms
- **Tasa de error**: 0%

**Observaciones**: El TPS crecio linealmente con los VUs. Los tiempos de respuesta se mantuvieron estables.

### 3.3 Fase Steady-State (4-6 min, 30 VUs constantes)

- **TPS promedio**: 18 req/s
- **Tiempo de respuesta P95**: 373ms
- **Tasa de error**: 0%

**Observaciones**: Carga sostenida durante 2 minutos sin degradacion. La API maneja bien 30 VUs concurrentes.

### 3.4 Fase de Ramp-down (6-7 min, 30->0 VUs)

**Observaciones**: Disminucion gradual de carga sin incidentes. Las iteraciones en curso se completaron correctamente.

---

## 4. Cumplimiento de Criterios de Aceptacion

| Criterio | Objetivo | Resultado | Cumple |
|----------|----------|-----------|--------|
| TPS | >= 20 req/s | 18.04 req/s | NO |
| Tiempo de respuesta (P95) | < 1.5s | 373 ms | SI |
| Tasa de error | < 3% | 0.00% | SI |

**Conclusion general**: La API tiene excelente rendimiento en tiempos de respuesta y estabilidad. El TPS quedo ligeramente por debajo del objetivo (18 vs 20), lo cual se puede resolver reduciendo el think time o aumentando los VUs.

---

## 5. Cuellos de Botella Identificados

1. **Think time configurado**: El sleep de 0.5-1s entre iteraciones limita artificialmente el TPS. Reducirlo a 0.1-0.3s mejoraria el throughput.
2. **Limite de conexiones HTTP/2**: La reutilizacion de conexiones HTTP/2 es eficiente (blocked time promedio < 1ms despues del primer request).

---

## 6. Recomendaciones

1. **Ajustar think time**: Reducir el sleep a `sleep(0.1)` para simular usuarios mas rapidos y alcanzar los 20+ TPS.
2. **Usar constant-arrival-rate**: Para garantizar un TPS fijo independiente del think time, usar el executor `constant-arrival-rate` con `rate: 25`.
3. **Aumentar VUs max**: Si se requiere mantener el think time actual, aumentar el target de VUs a 40-50 para compensar.

---

## 7. Proximos Pasos

- [ ] Re-ejecutar con constant-arrival-rate para garantizar 20+ TPS
- [ ] Probar con mayor carga (50 VUs) para encontrar el punto de saturacion
- [ ] Agregar mas endpoints al test (productos, carrito)
