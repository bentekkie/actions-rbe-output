import { existsSync } from 'node:fs'

/* istanbul ignore next */
export function onRBE() {
  if (!existsSync('/b/f/w')) {
    return false
  }
  return true
}
