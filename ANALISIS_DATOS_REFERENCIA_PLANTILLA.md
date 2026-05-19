# Plantilla: Análisis de Datos de Referencia

> **NOTA IMPORTANTE**: Esta plantilla muestra qué debería contener la Sección 5 de conclusiones.md
> El candidato debería haber analizado los datos provistos en el ejercicio, NO sus propios resultados

---

## 📊 Análisis de VUs_vs_TPS.png (Gráfica de Referencia)

Esta gráfica muestra la relación entre Usuarios Virtuales (VUs) y Throughput (TPS) en el sistema de referencia.

### Patrones a Identificar:

#### 1. **Escalabilidad Lineal (Inicio)**
```
Preguntas a responder:
- ¿Hasta cuántos VUs crece linealmente el TPS?
- ¿Cuál es la pendiente del crecimiento?
- ¿Cuántos req/s adicionales por cada VU agregado?
```

**Ejemplo de análisis correcto:**
- "Entre 0-15 VUs, el TPS crece linealmente a ~1.2 req/s por VU"
- "El gráfico muestra una relación y = 1.2x hasta x=15"

---

#### 2. **Punto de Saturación**
```
Preguntas a responder:
- ¿A cuántos VUs comienza a degradarse el TPS?
- ¿Es gradual o abrupto el cambio?
- ¿Cuál es el TPS máximo alcanzado?
```

**Ejemplo de análisis correcto:**
- "La saturación comienza alrededor de los 25 VUs"
- "El TPS máximo es ~28 req/s, pero se estabiliza/degrada después de 25 VUs"

---

#### 3. **Caídas de Rendimiento**
```
Preguntas a responder:
- ¿Hay puntos donde el TPS disminuye aunque VUs aumenten?
- ¿A qué VU count ocurren estas caídas?
- ¿Cuánta es la caída (en req/s)?
- ¿Qué causa podrían explicarla? (límites de conexión, CPU, I/O)
```

**Ejemplo de análisis correcto:**
- "A los 40 VUs se observa una caída de 28→22 req/s"
- "Esto indica que el sistema alcanzó su límite de conexiones concurrentes"
- "Aumentar VUs más allá de este punto degrada el rendimiento"

---

#### 4. **Recuperaciones o Estabilización**
```
Preguntas a responder:
- ¿Recupera el TPS después de una caída?
- ¿Se estabiliza en un nuevo nivel?
- ¿Hay un "meseta" donde el TPS permanece constante?
```

**Ejemplo de análisis correcto:**
- "Después de la caída inicial, el TPS se estabiliza en ~22 req/s entre 40-60 VUs"
- "No hay recuperación: el sistema permanece degradado"

---

## 📄 Análisis de textSummary.txt (Datos Numéricos de Referencia)

Este archivo contiene métricas cuantificadas del sistema de referencia.

### Datos Críticos a Extraer:

#### 1. **Métricas de Éxito**
```
Qué buscar:
- TPS objetivo/esperado
- Tiempos de respuesta (p95, p99, máximo)
- Tasa de error aceptable
- Número de VUs probados
```

**Ejemplo:**
- TPS esperado: 25 req/s
- P95 esperado: < 500ms
- Tasa de error: < 1%
- VUs máximos de prueba: 60

---

#### 2. **Puntos Críticos Identificados**
```
Qué buscar:
- Límites de operación normal
- Umbrales donde comienza degradación
- Número de VUs "seguros" vs "peligrosos"
```

**Ejemplo:**
- "Operación normal: 0-25 VUs"
- "Zona gris (degradación): 25-40 VUs"
- "Fallo: > 40 VUs"

---

#### 3. **Comparativa de Comportamientos**
```
Qué extraer:
- Cómo escala el TPS con los VUs
- Qué métrica degrada primero (latencia, TPS, errores)
- Cuál es más sensible a cambios de carga
```

**Ejemplo:**
- "El TPS se estanca a los 25 VUs pero p95 sigue creciendo hasta 45 VUs"
- "Los errores comienzan a aparecer solo después de 50 VUs"

---

## 🔍 Comparación: Datos de Referencia vs Datos Propios

### Estructura esperada:

| Métrica | Referencia | Propio | Diferencia | Análisis |
|---------|-----------|--------|-----------|----------|
| TPS máximo | 28 req/s | 18 req/s | -10 req/s | -36% más lento |
| P95 en steady-state | 450ms | 373ms | -77ms | Mejor (API más rápida) |
| VUs para saturación | 25 | No alcanzado* | - | Prueba incompleta |
| Tasa error en pico | < 1% | 0% | Mejor | Sistema más estable |

**Interpretación:**
- "Mi prueba no alcanzó el punto de saturación porque máximo usé 30 VUs"
- "Mi P95 es mejor que la referencia, indicando mejor rendimiento actual"
- "Mi TPS es inferior porque reducí el throughput con think time artificial"

---

## ✅ Conclusión esperada

El análisis debería culminar con una conclusión tipo:

> **"Comparado con los datos de referencia, mi sistema alcanza patrones similares hasta los 25 VUs. Sin embargo, mi implementación muestra [ventajas/desventajas] en [métrica específica]. El punto crítico de saturación coincide alrededor de los [X] VUs, donde [describe qué sucede]. Estas diferencias sugieren que [interpretación de causas]."**

---

## ⚠️ Errores Comunes a Evitar

❌ **Analizar solo datos propios** (sin comparar con referencia)
❌ **Reportar números sin interpretación** (solo listar métricas)
❌ **No identificar patrones** (caídas, recuperaciones, saturación)
❌ **Conclusiones genéricas** ("el sistema funciona bien")
✅ **Análisis específico basado en patrones de referencia**
✅ **Identificación clara de puntos críticos**
✅ **Comparativa cuantificada**
✅ **Interpretación de causas y significado**

