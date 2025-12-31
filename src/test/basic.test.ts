import { describe, it, expect } from 'vitest'
import { validateTenderId, validateEmail, validateBudget } from '../utils/validation'
import { successResponse, errorResponse } from '../utils/response'

describe('Validation Utils', () => {
  it('should validate tender ID correctly', () => {
    expect(validateTenderId('valid-id-123')).toBe(true)
    expect(validateTenderId('invalid id with spaces')).toBe(false)
    expect(validateTenderId('')).toBe(false)
  })

  it('should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('invalid-email')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })

  it('should validate budget correctly', () => {
    expect(validateBudget(1000000)).toBe(true)
    expect(validateBudget(-1000)).toBe(false)
    expect(validateBudget(0)).toBe(false)
  })
})

describe('Response Utils', () => {
  it('should create success response correctly', () => {
    const response = successResponse({ id: 1 }, 'Success')
    expect(response.success).toBe(true)
    expect(response.data).toEqual({ id: 1 })
    expect(response.message).toBe('Success')
    expect(response.timestamp).toBeDefined()
  })

  it('should create error response correctly', () => {
    const response = errorResponse('Error occurred', 'Details')
    expect(response.success).toBe(false)
    expect(response.error).toBe('Error occurred')
    expect(response.message).toBe('Details')
    expect(response.timestamp).toBeDefined()
  })
})