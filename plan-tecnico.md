# Plan Técnico - Prueba de Carga con K6

## Ejercicio de Login API - fakestoreapi.com

---

## 1. Información General del Proyecto

### 1.1 Objetivo
Implementar una prueba de carga para el servicio de autenticación (login) de la API `fakestoreapi.com`, validando el rendimiento bajo carga y cumpliendo con los criterios de aceptación establecidos.

### 1.2 Alcance

- Prueba de carga del endpoint `/auth/login`
- Parametrización de credenciales desde archivo CSV
- Validación de tiempos de respuesta y tasas de error
- Generación de reportes y métricas
- Documentación completa del proceso

### 1.3 Criterios de Aceptación

| Métrica | Valor Objetivo |
|---------|---------------|
| TPS (Transacciones por Segundo) | ≥ 20 TPS |
| Tiempo de Respuesta Máximo | ≤ 1.5 segundos |
| Tasa de Error | < 3% |

---

## 2. Arquitectura de la Solución

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────┐
│                   K6 Load Test                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐      ┌──────────────────────┐   │
│  │  users.csv   │─────▶│  K6 Test Script      │   │
│  │  (credenciales)     │  (login-load-test.js)│   │
│  └──────────────┘      └──────────┬───────────┘   │
│                                    │               │
│                                    ▼               │
│                        ┌──────────────────────┐   │
│                        │  Threshold Checks     │   │
│                        │  - Response Time      │   │
│                        │  - Error Rate         │   │
│                        └──────────┬───────────┘   │
│                                    │               │
│                                    ▼               │
│                        ┌──────────────────────┐   │
│                        │  Report Generation    │   │
│                        │  - HTML Dashboard     │   │
│                        │  - JSON Summary       │   │
│                        └──────────────────────┘   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  fakestoreapi.com      │
              │  POST /auth/login      │
              └────────────────────────┘
```

### 2.2 Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Load Testing Tool | K6 | v0.49.0+ |
| Runtime | Node.js (opcional para xk6) | v18+ |
| Data Format | CSV | - |
| Report Format | HTML, JSON | - |
| Version Control | Git | - |

---

## 3. Diseño del Script de Prueba

### 3.1 Estructura de Archivos

```
k6-login-load-test/
│
├── data/
│   └── users.csv                    # Credenciales parametrizadas
│
├── scripts/
│   └── login-load-test.js          # Script principal de K6
│
├── results/
│   ├── summary.json                # Resultados en JSON
│   └── report.html                 # Reporte HTML
│
├── README.md                        # Instrucciones de ejecución
├── conclusiones.md                  # Hallazgos y conclusiones
└── package.json                     # (Opcional) Para dependencias
```

### 3.2 Archivo CSV - users.csv

**Estructura:**
```csv
username,password
donero,ewedon
kevinryan,kev02937@
johnd,m38rmF$
derek,jklg*_56
mor_2314,83r5^_
```

**Ubicación:** `/data/users.csv`

### 3.3 Script K6 - Diseño Conceptual

**Archivo:** `scripts/login-load-test.js`

#### 3.3.1 Configuración de Opciones

```javascript
// Configuración de la prueba
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },    // Ramp-up a 10 VUs
        { duration: '3m', target: 30 },    // Incremento a 30 VUs (para alcanzar 20+ TPS)
        { duration: '2m', target: 30 },    // Mantener carga
        { duration: '1m', target: 0 },     // Ramp-down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p95<1500'],       // 95% de requests < 1.5s
    http_req_failed: ['rate<0.03'],        // Tasa de error < 3%
  },
};
```

**Justificación de VUs:**
- Para alcanzar 20+ TPS con tiempos de respuesta ~500ms, necesitamos aproximadamente:
  - `VUs = TPS × (Response Time + Think Time)`
  - `VUs ≈ 20 × (0.5s + 0.5s) = 20-30 VUs`

#### 3.3.2 Parametrización de Datos

```javascript
// Leer datos del CSV
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  const csvData = open('./data/users.csv');
  return papaparse.parse(csvData, { header: true }).data;
});
```

**Nota:** K6 requiere que los datos CSV sean compartidos entre VUs usando `SharedArray` para optimizar memoria.

#### 3.3.3 Función de Test

```javascript
export default function () {
  // Seleccionar usuario aleatorio
  const user = users[Math.floor(Math.random() * users.length)];
  
  // Configurar request
  const url = 'https://fakestoreapi.com/auth/login';
  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Ejecutar request
  const response = http.post(url, payload, params);
  
  // Validaciones adicionales
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1.5s': (r) => r.timings.duration < 1500,
    'has token': (r) => r.json('token') !== undefined,
  });
  
  // Think time simulado
  sleep(Math.random() * 0.5 + 0.5); // 0.5-1s
}
```

#### 3.3.4 Métricas Personalizadas

```javascript
import { Trend, Rate, Counter } from 'k6/metrics';

const loginDuration = new Trend('login_duration');
const loginSuccessRate = new Rate('login_success');
const loginCount = new Counter('login_attempts');
```

---

## 4. Estrategia de Carga

### 4.1 Perfil de Carga - Ramping VUs

| Etapa | Duración | VUs Target | Objetivo |
|-------|----------|------------|----------|
| **1. Warm-up** | 1 min | 10 VUs | Calentamiento del sistema |
| **2. Ramp-up** | 3 min | 30 VUs | Alcanzar carga objetivo (20+ TPS) |
| **3. Steady State** | 2 min | 30 VUs | Mantener carga estable para métricas |
| **4. Ramp-down** | 1 min | 0 VUs | Detener carga gradualmente |

**Duración Total:** 7 minutos

### 4.2 Cálculo de TPS Esperado

```
TPS = VUs / (Response Time + Think Time)
TPS = 30 / (0.5s + 0.75s) ≈ 24 TPS
```

Esto nos asegura superar los 20 TPS requeridos.

### 4.3 Estrategias Alternativas (Si es necesario)

**Opción 2 - Constant Arrival Rate:**
```javascript
constant_arrival_rate: {
  executor: 'constant-arrival-rate',
  rate: 25,              // 25 requests/segundo
  timeUnit: '1s',
  duration: '5m',
  preAllocatedVUs: 40,
  maxVUs: 60,
}
```

Esta opción garantiza una tasa constante de 25 TPS independiente del tiempo de respuesta.

---

## 5. Validaciones y Thresholds

### 5.1 Thresholds Obligatorios

```javascript
thresholds: {
  // Tiempo de respuesta: 95% de requests < 1.5s
  'http_req_duration': ['p95<1500'],
  
  // Tasa de error < 3%
  'http_req_failed': ['rate<0.03'],
  
  // Validaciones adicionales recomendadas
  'checks': ['rate>0.97'],              // 97% de checks exitosos
  'http_req_duration{status:200}': ['p99<2000'], // P99 para requests exitosos
}
```

### 5.2 Checks en Tiempo de Ejecución

```javascript
check(response, {
  // Validación de código HTTP
  'status is 200': (r) => r.status === 200,
  
  // Validación de tiempo de respuesta
  'response time OK': (r) => r.timings.duration < 1500,
  
  // Validación de contenido de respuesta
  'has token': (r) => r.json('token') !== undefined,
  
  // Validación de estructura JSON
  'valid JSON': (r) => {
    try {
      const json = r.json();
      return json !== null;
    } catch {
      return false;
    }
  },
});
```

---

## 6. Generación de Reportes

### 6.1 Reportes Nativos de K6

**Comando de ejecución con salida JSON:**
```bash
k6 run --out json=results/summary.json scripts/login-load-test.js
```

**Comando con salida CSV:**
```bash
k6 run --out csv=results/metrics.csv scripts/login-load-test.js
```

### 6.2 Dashboard HTML con xk6-dashboard

**Instalación:**
```bash
# Opción 1: Instalar xk6-dashboard
go install go.k6.io/xk6/cmd/xk6@latest
xk6 build --with github.com/szkiba/xk6-dashboard@latest

# Opción 2: Usar imagen Docker con extensión
docker run --rm -v $(pwd):/scripts grafana/k6:latest-with-browser \
  run --out web-dashboard scripts/login-load-test.js
```

**Ejecución con Dashboard:**
```bash
./k6 run --out web-dashboard=export=results/report.html scripts/login-load-test.js
```

### 6.3 Integración con Grafana Cloud (Opcional)

```bash
k6 run --out cloud scripts/login-load-test.js
```

### 6.4 Métricas Clave a Reportar

| Métrica | Descripción | Threshold |
|---------|-------------|-----------|
| `http_req_duration` | Tiempo de respuesta end-to-end | p95 < 1.5s |
| `http_req_failed` | Tasa de errores HTTP | < 3% |
| `http_reqs` | Total de requests | N/A |
| `vus` | Usuarios virtuales activos | 30 max |
| `iteration_duration` | Tiempo total por iteración | N/A |
| `data_received` | Datos recibidos | N/A |
| `data_sent` | Datos enviados | N/A |

---

## 7. Implementación Paso a Paso

### 7.1 Fase 1: Configuración del Entorno

**Paso 1.1 - Instalación de K6**

**Linux (Ubuntu/Debian):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**
```bash
brew install k6
```

**Windows:**
```bash
choco install k6
# O descargar desde: https://github.com/grafana/k6/releases
```

**Docker (Alternativa):**
```bash
docker pull grafana/k6:latest
```

**Verificar instalación:**
```bash
k6 version
# Output esperado: k6 v0.49.0 (o superior)
```

**Paso 1.2 - Clonar/Crear Estructura del Proyecto**

```bash
mkdir k6-login-load-test
cd k6-login-load-test
mkdir -p data scripts results
```

**Paso 1.3 - Inicializar Git**

```bash
git init
echo "results/" >> .gitignore
echo "*.log" >> .gitignore
```

### 7.2 Fase 2: Desarrollo del Script

**Paso 2.1 - Crear archivo users.csv**

```bash
cat > data/users.csv << 'EOF'
username,password
donero,ewedon
kevinryan,kev02937@
johnd,m38rmF$
derek,jklg*_56
mor_2314,83r5^_
EOF
```

**Paso 2.2 - Crear script de K6 completo**

Ver sección 8 para el código completo del script.

**Paso 2.3 - Validar sintaxis del script**

```bash
k6 run --vus 1 --duration 10s scripts/login-load-test.js
```

### 7.3 Fase 3: Ejecución de Pruebas

**Paso 3.1 - Prueba Smoke (Validación inicial)**

```bash
k6 run --vus 1 --duration 1m scripts/login-load-test.js
```

**Objetivo:** Verificar que el script funciona correctamente sin carga significativa.

**Paso 3.2 - Prueba de Carga Completa**

```bash
k6 run --out json=results/summary.json scripts/login-load-test.js
```

**Paso 3.3 - Prueba con Reporte HTML (si tienes xk6-dashboard)**

```bash
./k6 run --out web-dashboard=export=results/report.html scripts/login-load-test.js
```

**Paso 3.4 - Ejecución con Docker (Alternativa)**

```bash
docker run --rm -v $(pwd):/scripts -v $(pwd)/results:/results \
  grafana/k6:latest run --out json=/results/summary.json /scripts/scripts/login-load-test.js
```

### 7.4 Fase 4: Análisis de Resultados

**Paso 4.1 - Revisar salida en consola**

K6 muestra un resumen automático al final de la ejecución con:
- Total de requests
- Duración promedio, p95, p99
- Tasa de error
- Validación de thresholds (✓ o ✗)

**Paso 4.2 - Analizar archivo JSON**

```bash
cat results/summary.json | jq '.metrics.http_req_duration'
cat results/summary.json | jq '.metrics.http_req_failed'
```

**Paso 4.3 - Verificar cumplimiento de criterios**

| Criterio | Métrica K6 | Comando de Verificación |
|----------|-----------|-------------------------|
| TPS ≥ 20 | `http_reqs` / duración | `cat results/summary.json \| jq '.metrics.http_reqs.values.rate'` |
| Tiempo < 1.5s | `http_req_duration.p95` | `cat results/summary.json \| jq '.metrics.http_req_duration.values.p95'` |
| Error < 3% | `http_req_failed.rate` | `cat results/summary.json \| jq '.metrics.http_req_failed.values.rate'` |

### 7.5 Fase 5: Documentación

**Paso 5.1 - Crear README.md**

Incluir:
- Requisitos del sistema
- Versiones de herramientas
- Instrucciones de instalación
- Comandos de ejecución
- Interpretación de resultados

**Paso 5.2 - Crear conclusiones.md**

Incluir:
- Resultados obtenidos vs. criterios
- Análisis de métricas clave
- Cuellos de botella identificados
- Recomendaciones de optimización
- Gráficas (si aplica)

**Paso 5.3 - Preparar repositorio GitHub**

```bash
git add .
git commit -m "feat: Implementación de prueba de carga con K6 para login API"
git remote add origin https://github.com/<usuario>/k6-login-load-test.git
git push -u origin main
```

---

## 8. Script Completo de K6

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// ============================================================================
// CONFIGURACIÓN DE MÉTRICAS PERSONALIZADAS
// ============================================================================

const loginDuration = new Trend('login_duration', true);
const loginSuccessRate = new Rate('login_success');
const loginAttempts = new Counter('login_attempts');

// ============================================================================
// CARGA DE DATOS PARAMETRIZADOS
// ============================================================================

const users = new SharedArray('users', function () {
  // Leer archivo CSV con credenciales
  const csvData = open('./data/users.csv');
  const parsedData = papaparse.parse(csvData, { 
    header: true,
    skipEmptyLines: true 
  });
  return parsedData.data;
});

// ============================================================================
// CONFIGURACIÓN DE LA PRUEBA
// ============================================================================

export const options = {
  scenarios: {
    load_test_login: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Warm-up: 0 → 10 VUs
        { duration: '3m', target: 30 },   // Ramp-up: 10 → 30 VUs
        { duration: '2m', target: 30 },   // Steady state: 30 VUs
        { duration: '1m', target: 0 },    // Ramp-down: 30 → 0 VUs
      ],
      gracefulRampDown: '30s',
    },
  },
  
  // ============================================================================
  // THRESHOLDS (CRITERIOS DE ACEPTACIÓN)
  // ============================================================================
  
  thresholds: {
    // REQUISITO 1: Tiempo de respuesta máximo 1.5 segundos (p95)
    'http_req_duration': [
      'p95<1500',                         // 95% de requests < 1.5s
      'p99<2000',                         // 99% de requests < 2s
    ],
    
    // REQUISITO 2: Tasa de error < 3%
    'http_req_failed': ['rate<0.03'],     // Menos del 3% de errores
    
    // Validaciones adicionales
    'checks': ['rate>0.97'],              // 97% de checks exitosos (100% - 3% error)
    'login_success': ['rate>0.97'],       // 97% de logins exitosos
    
    // Validación de throughput (opcional, pero útil)
    'http_reqs': ['count>2000'],          // Al menos 2000 requests totales
  },
  
  // Configuración de salida
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ============================================================================
// CONFIGURACIÓN DE ENTORNO
// ============================================================================

const BASE_URL = 'https://fakestoreapi.com';
const LOGIN_ENDPOINT = '/auth/login';

// ============================================================================
// FUNCIÓN PRINCIPAL DE TEST
// ============================================================================

export default function () {
  // Seleccionar usuario aleatorio del CSV
  const user = users[Math.floor(Math.random() * users.length)];
  
  // Preparar payload de login
  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });
  
  // Configurar headers
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      name: 'LoginRequest',
      username: user.username,
    },
  };
  
  // ============================================================================
  // EJECUTAR REQUEST DE LOGIN
  // ============================================================================
  
  const loginUrl = `${BASE_URL}${LOGIN_ENDPOINT}`;
  const response = http.post(loginUrl, payload, params);
  
  // Registrar intento de login
  loginAttempts.add(1);
  
  // ============================================================================
  // VALIDACIONES
  // ============================================================================
  
  const checkResults = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
    'has token in response': (r) => {
      try {
        const body = r.json();
        return body.token !== undefined && body.token !== null;
      } catch {
        return false;
      }
    },
    'response is valid JSON': (r) => {
      try {
        r.json();
        return true;
      } catch {
        return false;
      }
    },
    'no server errors (5xx)': (r) => r.status < 500,
  });
  
  // Registrar duración del login
  loginDuration.add(response.timings.duration);
  
  // Registrar éxito/fallo del login
  loginSuccessRate.add(response.status === 200);
  
  // ============================================================================
  // LOGGING CONDICIONAL (Solo para errores)
  // ============================================================================
  
  if (response.status !== 200) {
    console.error(`[ERROR] Login failed for user: ${user.username}`);
    console.error(`Status: ${response.status}, Body: ${response.body}`);
  }
  
  // ============================================================================
  // THINK TIME (Simular comportamiento de usuario real)
  // ============================================================================
  
  // Tiempo de espera aleatorio entre 0.5s y 1s
  sleep(Math.random() * 0.5 + 0.5);
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log('='.repeat(70));
  console.log('INICIANDO PRUEBA DE CARGA - LOGIN API');
  console.log('='.repeat(70));
  console.log(`Endpoint: ${BASE_URL}${LOGIN_ENDPOINT}`);
  console.log(`Usuarios parametrizados: ${users.length}`);
  console.log(`Criterios de aceptación:`);
  console.log(`  - TPS objetivo: ≥ 20 TPS`);
  console.log(`  - Tiempo de respuesta: p95 < 1.5s`);
  console.log(`  - Tasa de error: < 3%`);
  console.log('='.repeat(70));
  
  // Validar que el endpoint está disponible (healthcheck)
  const healthCheck = http.get(BASE_URL);
  if (healthCheck.status !== 200) {
    throw new Error(`API no disponible. Status: ${healthCheck.status}`);
  }
  
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('='.repeat(70));
  console.log('PRUEBA FINALIZADA');
  console.log(`Inicio: ${data.startTime}`);
  console.log(`Fin: ${new Date().toISOString()}`);
  console.log('='.repeat(70));
}

// ============================================================================
// CUSTOM SUMMARY (Opcional)
// ============================================================================

export function handleSummary(data) {
  console.log('Generando resumen personalizado...');
  
  // Calcular TPS real
  const totalRequests = data.metrics.http_reqs.values.count;
  const totalDuration = data.state.testRunDurationMs / 1000; // en segundos
  const actualTPS = (totalRequests / totalDuration).toFixed(2);
  
  console.log('='.repeat(70));
  console.log('RESULTADOS FINALES');
  console.log('='.repeat(70));
  console.log(`Total de requests: ${totalRequests}`);
  console.log(`TPS real: ${actualTPS} req/s`);
  console.log(`Tiempo promedio: ${data.metrics.http_req_duration.values.avg.toFixed(2)} ms`);
  console.log(`P95: ${data.metrics.http_req_duration.values.p95.toFixed(2)} ms`);
  console.log(`P99: ${data.metrics.http_req_duration.values.p99.toFixed(2)} ms`);
  console.log(`Tasa de error: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log('='.repeat(70));
  
  // Verificar cumplimiento de criterios
  const criteriosTPS = actualTPS >= 20;
  const criteriosP95 = data.metrics.http_req_duration.values.p95 < 1500;
  const criteriosError = data.metrics.http_req_failed.values.rate < 0.03;
  
  console.log('VALIDACIÓN DE CRITERIOS:');
  console.log(`  ✓ TPS ≥ 20: ${criteriosTPS ? '✓ PASS' : '✗ FAIL'} (${actualTPS} req/s)`);
  console.log(`  ✓ P95 < 1.5s: ${criteriosP95 ? '✓ PASS' : '✗ FAIL'} (${data.metrics.http_req_duration.values.p95.toFixed(2)} ms)`);
  console.log(`  ✓ Error < 3%: ${criteriosError ? '✓ PASS' : '✗ FAIL'} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)`);
  console.log('='.repeat(70));
  
  // Retornar reportes en diferentes formatos
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
  };
}

// Importar la función textSummary para el resumen
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
```

---

## 9. Archivos de Documentación

### 9.1 README.md

```markdown
# Prueba de Carga - Login API
## Fake Store API - K6 Load Testing

### Requisitos del Sistema

- **K6**: v0.49.0 o superior
- **Sistema Operativo**: Linux, macOS, o Windows
- **Memoria RAM**: Mínimo 4GB (recomendado 8GB)
- **Conexión a Internet**: Requerida para acceder a la API

### Instalación de K6

#### Linux (Ubuntu/Debian)
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### macOS
```bash
brew install k6
```

#### Windows
```bash
choco install k6
```

#### Docker
```bash
docker pull grafana/k6:latest
```

### Estructura del Proyecto

```
k6-login-load-test/
├── data/
│   └── users.csv              # Credenciales de usuarios
├── scripts/
│   └── login-load-test.js    # Script principal de K6
├── results/
│   ├── summary.json          # Resultados en JSON
│   └── summary.txt           # Resumen en texto
├── README.md                  # Este archivo
└── conclusiones.md           # Análisis de resultados
```

### Ejecución de la Prueba

#### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/<usuario>/k6-login-load-test.git
cd k6-login-load-test
```

#### Paso 2: Verificar instalación de K6
```bash
k6 version
```

#### Paso 3: Ejecutar prueba smoke (validación)
```bash
k6 run --vus 1 --duration 1m scripts/login-load-test.js
```

#### Paso 4: Ejecutar prueba de carga completa
```bash
k6 run scripts/login-load-test.js
```

#### Paso 5: Ejecutar con salida JSON
```bash
k6 run --out json=results/summary.json scripts/login-load-test.js
```

### Ejecución con Docker

```bash
docker run --rm -v $(pwd):/scripts -v $(pwd)/results:/results \
  grafana/k6:latest run --out json=/results/summary.json /scripts/scripts/login-load-test.js
```

### Interpretación de Resultados

Al finalizar la prueba, K6 mostrará un resumen con:

- **http_reqs**: Total de requests realizados
- **http_req_duration**: Tiempo de respuesta (avg, p95, p99)
- **http_req_failed**: Tasa de errores
- **vus**: Usuarios virtuales activos
- **Thresholds**: Validación de criterios (✓ o ✗)

### Criterios de Aceptación

| Métrica | Objetivo | Threshold K6 |
|---------|----------|--------------|
| TPS | ≥ 20 req/s | - |
| Tiempo de respuesta (P95) | < 1.5s | `p95<1500` |
| Tasa de error | < 3% | `rate<0.03` |

### Análisis de Resultados

Ver archivo `conclusiones.md` para el análisis detallado de los resultados obtenidos.

### Troubleshooting

**Error: "Cannot find module papaparse"**
```bash
# K6 descarga automáticamente las dependencias de jslib.k6.io
# Si hay problemas de red, verificar conectividad
```

**Error: "ECONNREFUSED" o timeout**
```bash
# Verificar que la API esté disponible
curl https://fakestoreapi.com/products
```

**Los thresholds fallan**
```bash
# Revisar los resultados y ajustar el perfil de carga si es necesario
# Puede ser necesario aumentar o disminuir los VUs
```

### Contribuciones

Si encuentras problemas o tienes sugerencias, abre un issue en el repositorio.

### Licencia

MIT License
```

### 9.2 conclusiones.md (Template)

```markdown
# Conclusiones y Hallazgos - Prueba de Carga Login API

## 1. Resumen Ejecutivo

**Fecha de ejecución**: [Completar]
**Duración total**: 7 minutos
**API bajo prueba**: https://fakestoreapi.com/auth/login

### 1.1 Resultados Generales

| Métrica | Valor Obtenido | Criterio | Estado |
|---------|----------------|----------|--------|
| TPS Promedio | [Completar] | ≥ 20 TPS | ✓ / ✗ |
| Tiempo de Respuesta P95 | [Completar] ms | < 1500 ms | ✓ / ✗ |
| Tasa de Error | [Completar] % | < 3% | ✓ / ✗ |

---

## 2. Análisis Detallado de Métricas

### 2.1 Throughput (TPS)

**Valor observado**: [Completar] requests/segundo

**Análisis**:
- Durante la fase de warm-up (1min): [X] TPS
- Durante la fase de ramp-up (3min): [X] TPS
- Durante la fase steady-state (2min): [X] TPS
- Pico máximo de TPS: [X] TPS en el minuto [X]

**Interpretación**:
[Análisis de si se cumplió el objetivo de 20+ TPS y por qué]

### 2.2 Tiempo de Respuesta

| Percentil | Valor (ms) | Criterio | Cumplimiento |
|-----------|-----------|----------|--------------|
| Promedio | [X] | - | - |
| P50 (Mediana) | [X] | - | - |
| P90 | [X] | - | - |
| P95 | [X] | < 1500 | ✓ / ✗ |
| P99 | [X] | - | - |
| Máximo | [X] | - | - |

**Análisis**:
[Descripción de la distribución de tiempos de respuesta]

### 2.3 Tasa de Errores

**Tasa de error total**: [X]%

**Distribución de errores por código HTTP**:
- 200 OK: [X]% ([X] requests)
- 4xx Client Errors: [X]% ([X] requests)
- 5xx Server Errors: [X]% ([X] requests)
- Timeouts: [X]% ([X] requests)

**Análisis**:
[Explicación de por qué ocurrieron errores, si los hubo]

---

## 3. Análisis por Etapa de Carga

### 3.1 Fase de Warm-up (0-1 min, 0→10 VUs)

- **TPS promedio**: [X]
- **Tiempo de respuesta P95**: [X] ms
- **Tasa de error**: [X]%

**Observaciones**:
[Comportamiento del sistema durante el calentamiento]

### 3.2 Fase de Ramp-up (1-4 min, 10→30 VUs)

- **TPS promedio**: [X]
- **Tiempo de respuesta P95**: [X] ms
- **Tasa de error**: [X]%

**Observaciones**:
[Comportamiento del sistema durante el incremento de carga]

### 3.3 Fase Steady-State (4-6 min, 30 VUs constantes)

- **TPS promedio**: [X]
- **Tiempo de respuesta P95**: [X] ms
- **Tasa de error**: [X]%

**Observaciones**:
[Comportamiento del sistema bajo carga sostenida]

### 3.4 Fase de Ramp-down (6-7 min, 30→0 VUs)

**Observaciones