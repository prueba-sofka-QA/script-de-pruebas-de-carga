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

#### Paso 1: Verificar instalación de K6
```bash
k6 version
```

#### Paso 2: Ejecutar prueba smoke (validación)
```bash
k6 run --vus 1 --duration 1m scripts/login-load-test.js
```

#### Paso 3: Ejecutar prueba de carga completa
```bash
k6 run scripts/login-load-test.js
```

#### Paso 4: Ejecutar con salida JSON
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
