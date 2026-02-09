import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm up
    { duration: '1m', target: 100 }, // Load
    { duration: '30s', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.001'],  // Error rate should be less than 0.1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WRITE_KEY = __ENV.WRITE_KEY || 'test-write-key';

function generateEvent() {
  return {
    event_id: uuidv4(),
    event_name: 'test_load_event',
    timestamp: new Date().toISOString(),
    anonymous_id: uuidv4(),
    session_id: uuidv4(),
    context: {
      page: {
        path: '/test-page',
        title: 'Test Page',
        url: BASE_URL + '/test-page',
      },
      userAgent: 'k6/1.0',
    },
    properties: {
      url: '/test-page',
      referrer: 'https://google.com',
      browser: 'k6-load-tester',
    },
  };
}

export default function () {
  const payload = JSON.stringify({
    batch: [generateEvent()],
    sent_at: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Write-Key': WRITE_KEY,
    },
  };

  const res = http.post(`${BASE_URL}/v1/capture`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
