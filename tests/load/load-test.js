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

const BASE_URL = __ENV.BASE_URL || 'https://analytics.chatnationbot.com';

function generateEvent() {
  return {
    event_name: 'test_load_event',
    timestamp: new Date().toISOString(),
    properties: {
      url: '/test-page',
      referrer: 'https://google.com',
      browser: 'k6-load-tester',
    },
    context: {
      page: {
        path: '/test-page',
        title: 'Test Page',
        url: BASE_URL + '/test-page',
      },
      userAgent: 'k6/1.0',
    },
    messageId: uuidv4(),
    anonymousId: uuidv4(),
  };
}

export default function () {
  const payload = JSON.stringify({
    batch: [generateEvent()],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/capture`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
