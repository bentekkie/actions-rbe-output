/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import path from 'path'
import * as tmp from 'tmp-promise'
import { onRBE } from '../__fixtures__/onrbe.js'
import { writeFile, mkdir, rm } from 'fs/promises'
import { exists } from 'fs-extra'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/onrbe.js', () => ({ onRBE }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  let buildDir: tmp.DirectoryResult
  let outputDir: tmp.DirectoryResult

  let sampleFile: string = ''
  let sampleDir: string = ''

  beforeEach(async () => {
    core.info.mockImplementation((message: string) => {
      console.log(message)
    })

    buildDir = await tmp.dir()
    outputDir = await tmp.dir()

    sampleFile = path.join(buildDir.path, 'some-file')
    await writeFile(sampleFile, 'some-content')
    sampleDir = path.join(buildDir.path, 'some-dir')
    await mkdir(sampleDir)
    await writeFile(path.join(sampleDir, 'some-file'), 'some-content')
  })

  afterEach(async () => {
    await rm(buildDir.path, { recursive: true })
    await rm(outputDir.path, { recursive: true })
    jest.resetAllMocks()
  })

  test.each`
    name   | type
    ${'a'} | ${'file'}
    ${'b'} | ${'dir'}
    ${'c'} | ${'file'}
    ${'d'} | ${'dir'}
  `('mark $type as an RBE output', async ({ name, type }) => {
    onRBE.mockImplementation(() => true)
    core.getInput.mockImplementation((inputName: string) => {
      if (inputName === 'name') return name
      if (inputName === 'path') {
        if (type === 'file') {
          return sampleFile
        } else {
          return sampleDir
        }
      }
      if (inputName === 'type') return type
      return ''
    })
    await run(outputDir.path)
    const base = path.basename(type === 'file' ? sampleFile : sampleDir)
    expect(await exists(path.join(outputDir.path, name))).toBe(true)
    expect(await exists(path.join(outputDir.path, name, base))).toBe(true)
  })

  test('do nothing if not on RBE', async () => {
    onRBE.mockImplementation(() => false)
    core.getInput.mockImplementation((inputName: string) => {
      if (inputName === 'name') return 'abc'
      if (inputName === 'path') return sampleFile
      if (inputName === 'type') return 'file'
      return ''
    })
    await run(outputDir.path)
    expect(await exists(path.join(outputDir.path, 'abc'))).toBe(false)
  })

  test('set failed', async () => {
    onRBE.mockImplementation(() => true)
    core.getInput.mockImplementation((inputName: string) => {
      if (inputName === 'name') return 'abc'
      if (inputName === 'path')
        return path.join(buildDir.path, 'does-not-exist')
      if (inputName === 'type') return 'file'
      return ''
    })
    await run(outputDir.path)
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('no such file or directory')
    )
  })
})
