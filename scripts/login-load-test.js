import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const loginDuration = new Trend('login_duration', true);
const loginSuccessRate = new Rate('login_success');
const loginAttempts = new Counter('login_attempts');

const users = new SharedArray('users', function () {
  const csvData = open('../data/users.csv');
  const parsedData = papaparse.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });
  return parsedData.data;
});

export const options = {
  scenarios: {
    load_test_login: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<2000'],
    'http_req_failed': ['rate<0.03'],
    'checks': ['rate>0.97'],
    'login_success': ['rate>0.97'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = 'https://fakestoreapi.com';
const LOGIN_ENDPOINT = '/auth/login';

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      name: 'LoginRequest',
      username: user.username,
    },
  };

  const loginUrl = `${BASE_URL}${LOGIN_ENDPOINT}`;
  const response = http.post(loginUrl, payload, params);

  loginAttempts.add(1);

  const checkResults = check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
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

  loginDuration.add(response.timings.duration);
  loginSuccessRate.add(response.status === 200 || response.status === 201);

  if (response.status !== 200 && response.status !== 201) {
    console.error(`[ERROR] Login failed for user: ${user.username}`);
    console.error(`Status: ${response.status}, Body: ${response.body}`);
  }

  sleep(Math.random() * 0.5 + 0.5);
}

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

export function handleSummary(data) {
  console.log('Generando resumen personalizado...');

  const totalRequests = data.metrics.http_reqs.values.count;
  const totalDuration = data.state.testRunDurationMs / 1000;
  const actualTPS = (totalRequests / totalDuration).toFixed(2);

  console.log('='.repeat(70));
  console.log('RESULTADOS FINALES');
  console.log('='.repeat(70));
  console.log(`Total de requests: ${totalRequests}`);
  console.log(`TPS real: ${actualTPS} req/s`);
  console.log(`Tiempo promedio: ${data.metrics.http_req_duration.values.avg.toFixed(2)} ms`);
  console.log(`P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)} ms`);
  console.log(`P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)} ms`);
  console.log(`Tasa de error: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log('='.repeat(70));

  const criteriosTPS = actualTPS >= 20;
  const criteriosP95 = data.metrics.http_req_duration.values['p(95)'] < 1500;
  const criteriosError = data.metrics.http_req_failed.values.rate < 0.03;

  console.log('VALIDACIÓN DE CRITERIOS:');
  console.log(`  ✓ TPS ≥ 20: ${criteriosTPS ? '✓ PASS' : '✗ FAIL'} (${actualTPS} req/s)`);
  console.log(`  ✓ P95 < 1.5s: ${criteriosP95 ? '✓ PASS' : '✗ FAIL'} (${data.metrics.http_req_duration.values['p(95)'].toFixed(2)} ms)`);
  console.log(`  ✓ Error < 3%: ${criteriosError ? '✓ PASS' : '✗ FAIL'} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)`);
  console.log('='.repeat(70));

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
  };
}
