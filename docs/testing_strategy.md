# Testing Strategy

## Overview
This document outlines the testing approach for the Analytics Service, covering unit tests, integration tests, load tests, and end-to-end validation.

---

## 1. Testing Layers

```
┌─────────────────────────────────────────────────────────┐
│                    E2E Tests                             │
│         (Full journey: SDK → Collector → DB → Dashboard) │
├─────────────────────────────────────────────────────────┤
│                 Integration Tests                        │
│            (Component interactions, API contracts)       │
├─────────────────────────────────────────────────────────┤
│                    Unit Tests                            │
│         (Individual functions, validation logic)         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Unit Tests

### 2.1 Client SDK

| Test Area | Test Cases |
|-----------|------------|
| **ID Generation** | UUID format valid, persistence in localStorage |
| **Session Logic** | Timeout triggers new session, activity resets timer |
| **Event Queue** | Events batched correctly, max size respected |
| **Context Builder** | Page info captured, user agent parsed |

**Framework**: Jest / Vitest

```typescript
describe('getOrCreateAnonymousId', () => {
  it('generates valid UUID on first call', () => {
    localStorage.clear();
    const id = getOrCreateAnonymousId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns same ID on subsequent calls', () => {
    const id1 = getOrCreateAnonymousId();
    const id2 = getOrCreateAnonymousId();
    expect(id1).toBe(id2);
  });
});
```

### 2.2 Collector API

| Test Area | Test Cases |
|-----------|------------|
| **Validation** | Required fields, type checking, max payload |
| **Auth** | Write key validation, origin check |
| **Rate Limiting** | Requests blocked after limit |

### 2.3 Processor Worker

| Test Area | Test Cases |
|-----------|------------|
| **Enrichment** | GeoIP lookup, UA parsing |
| **Deduplication** | Duplicate message_id rejected |
| **Schema Mapping** | Properties correctly flattened |

---

## 3. Integration Tests

### 3.1 SDK → Collector

**Test**: Events sent from SDK reach Collector and return 200.

```typescript
it('sends batch to collector', async () => {
  analytics.init('test-write-key');
  analytics.track('test_event', { foo: 'bar' });
  
  await analytics.flush();
  
  // Mock server assertion
  expect(mockCollector).toHaveReceivedEvent({
    event_name: 'test_event',
    properties: { foo: 'bar' }
  });
});
```

### 3.2 Collector → Queue

**Test**: Events are enqueued correctly with all metadata.

```typescript
it('enqueues event with correct structure', async () => {
  await request(app)
    .post('/capture')
    .send({ batch: [testEvent] })
    .expect(200);
  
  const queued = await redisClient.lrange('events_queue', 0, -1);
  expect(JSON.parse(queued[0])).toMatchObject({
    event_name: 'test_event',
    received_at: expect.any(String)
  });
});
```

### 3.3 Queue → Processor → Database

**Test**: Events are consumed, enriched, and inserted.

```typescript
it('processes and stores event', async () => {
  await enqueueEvent(testEvent);
  await runProcessor();
  
  const stored = await db.query(
    'SELECT * FROM events WHERE event_id = ?',
    [testEvent.event_id]
  );
  
  expect(stored.rows[0]).toMatchObject({
    event_name: 'test_event',
    country_code: 'KE',  // Enriched from IP
    device_type: 'mobile'  // Parsed from UA
  });
});
```

---

## 4. Load Testing

### 4.1 Collector Throughput

**Tool**: k6 or Artillery

**Target Metrics**:
| Metric | Target | Threshold |
|--------|--------|-----------|
| Requests/sec | 1000 | > 800 |
| P95 Latency | < 100ms | < 200ms |
| Error Rate | 0% | < 0.1% |

**k6 Script**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.001']
  }
};

export default function () {
  const payload = JSON.stringify({
    batch: [generateEvent()]
  });
  
  const res = http.post('http://collector:3000/capture', payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200
  });
}
```

### 4.2 Database Insert Rate

**Test**: Measure ClickHouse insert performance under load.

**Target**: 10,000 events/second sustained

---

## 5. End-to-End Tests

### 5.1 Funnel Tracking E2E

**Scenario**: Complete MRI filing journey

```typescript
describe('MRI Funnel E2E', () => {
  it('tracks complete journey', async () => {
    // 1. Visit home
    await page.goto('/');
    await waitForEvent('page_view', { path: '/' });
    
    // 2. Click MRI button
    await page.click('#btn-mri-start');
    await waitForEvent('click', { element: 'btn-mri-start' });
    
    // 3. Fill validation form
    await page.fill('#pin', 'A012345678X');
    await page.fill('#dob', '1990-01-01');
    await page.click('#validate-btn');
    await waitForEvent('validation_success');
    
    // 4. Verify OTP
    await page.fill('#otp', '123456');
    await page.click('#verify-btn');
    await waitForEvent('otp_verified');
    
    // 5. File return
    await page.fill('#gross-rent', '50000');
    await page.click('#file-btn');
    await waitForEvent('return_filed');
    
    // 6. Verify in dashboard
    const funnel = await getFunnelData('mri');
    expect(funnel.step_6_count).toBeGreaterThan(0);
  });
});
```

### 5.2 Identity Linking E2E

**Scenario**: Anonymous user becomes identified

```typescript
it('links anonymous to identified user', async () => {
  // Start anonymous
  await page.goto('/');
  const anonId = await page.evaluate(() => localStorage.getItem('analytics_anonymous_id'));
  
  // Complete login
  await loginAsUser('A012345678X');
  
  // Verify identity link
  const identity = await db.query(
    'SELECT * FROM identities WHERE anonymous_id = ?',
    [anonId]
  );
  expect(identity.rows[0].user_id).toBe('A012345678X');
});
```

---

## 6. Validation Checklist

### Pre-Launch Verification

- [ ] Events appear in DevTools Network tab
- [ ] Payload structure matches schema
- [ ] Collector returns 200 for valid events
- [ ] Events visible in database within 5 seconds
- [ ] Dashboard shows correct counts
- [ ] Funnel percentages calculate correctly
- [ ] Session timeout creates new session
- [ ] Identify call links anonymous_id to user_id

### Monitoring Alerts

| Alert | Trigger |
|-------|---------|
| Collector Down | Health check fails for 1 min |
| Queue Backlog | Queue size > 10,000 events |
| High Error Rate | > 1% 4xx/5xx in 5 min window |
| DB Insert Lag | Processing delay > 30 seconds |

---

## 7. Test Data Management

### Test Tenant
- `tenant_id`: `test-tenant`
- `write_key`: `test-write-key-12345`
- Allowed origins: `localhost`, `test.example.com`

### Data Cleanup
```sql
-- Run after test suite
DELETE FROM events WHERE tenant_id = 'test-tenant';
DELETE FROM sessions WHERE tenant_id = 'test-tenant';
DELETE FROM identities WHERE tenant_id = 'test-tenant';
```
