import * as core from '@actions/core'
import { copy, mkdirs } from 'fs-extra'
import path from 'path'
import { stat } from 'fs/promises'
import { onRBE } from './onrbe.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(outputDir: string): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const pathStr: string = core.getInput('path')
    const type: string = core.getInput('type')

    if (!onRBE()) {
      core.warning('This does nothing when not running on RBE')
      return
    }

    core.debug(`Marking ${name} as an RBE output of type ${type} at ${pathStr}`)

    const nameOutputDir = `${outputDir}/${name}`

    await mkdirs(nameOutputDir, { mode: 0o777 }).catch((error) => {
      throw new Error(error)
    })

    console.log('made dir', nameOutputDir)

    const st = await stat(pathStr).catch((error) => {
      throw new Error(error)
    })
    console.log('stat', st)
    if (st.isDirectory()) {
      await mkdirs(path.join(nameOutputDir, path.basename(pathStr))).catch(
        (error) => {
          throw new Error(error)
        }
      )
      await copy(
        pathStr,
        path.join(nameOutputDir, path.basename(pathStr))
      ).catch((error) => {
        throw new Error(error)
      })
    } else {
      await copy(
        pathStr,
        path.join(nameOutputDir, path.basename(pathStr))
      ).catch((error) => {
        throw new Error(error)
      })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      /* istanbul ignore next */
      core.setFailed('unknown error')
    }
  }
}
