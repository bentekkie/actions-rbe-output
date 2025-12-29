import { jest } from '@jest/globals'

export const onRBE = jest.fn<typeof import('../src/onrbe.js').onRBE>()
