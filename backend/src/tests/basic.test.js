import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { buildApp } from '../app.js'

const app = buildApp()

describe('Health', () => {
  it('GET /api/health -> 200', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body?.success).toBe(true)
    expect(res.body?.data?.status).toBe('ok')
  })
})

describe('Auth guard', () => {
  it('GET /api/produtos without Authorization -> 401', async () => {
    const res = await request(app).get('/api/produtos')
    expect(res.status).toBe(401)
    expect(res.body?.success).toBe(false)
  })

  it('GET /api/produtos with invalid Bearer -> 401', async () => {
    const res = await request(app).get('/api/produtos').set('Authorization', 'Bearer invalid')
    expect(res.status).toBe(401)
    expect(res.body?.success).toBe(false)
  })
})
