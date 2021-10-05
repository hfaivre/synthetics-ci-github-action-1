import {execFile} from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import * as runTests from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {config} from '../src/fixtures'
import * as core from '@actions/core'
import run from '../src/main'
import { Summary } from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

const emptySummary: Summary = {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 0}
const inputs = {
  'INPUT_API_KEY': 'xxx', 
  'INPUT_APP_KEY': 'yyy', 
  'INPUT_PUBLIC_IDS' : 'public_id1'
}

describe('execute Github Action', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = {}
    process.stdout.write = jest.fn()
    process.env = {...inputs}

    const emptySummary: Summary = {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 0}
  })
  test('Github Action called with dummy parameter fails with core.setFailed', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Running Datadog Synthetics tests failed.'
    )
  })

  test('Github Action core.getInput parameters are passed on to runTests', async () => {
    jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))

    await run()
    expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {
      ...config,
      apiKey: 'xxx',
      appKey: 'yyy',
      publicIds: ['public_id1']
    })
  })

  test('Github Action fails if Synthetics tests fail ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(Promise.resolve({summary: {...emptySummary, failed:1}} as any))

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 1, skipped: 0, notFound: 0, timedOut: 0}'
    )
  })

  test('Github Action fails if Synthetics tests timed out ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(Promise.resolve({summary: {...emptySummary, timedOut:1}} as any))

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 1}'
    )
  })

  test('Github Action fails if Synthetics tests not found ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(Promise.resolve({summary: {...emptySummary, notFound:1}} as any))

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 1, timedOut: 0}'
    )
  })

  test('Github Action succeeds if Synthetics tests do not fail', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(Promise.resolve({summary: {...emptySummary, passed:1}} as any))

    await run()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  test('Github Action parses out publicIds string', async () => {
    process.env = {...inputs,'INPUT_PUBLIC_IDS' : 'public_id1, public_id2, public_id3'}
    jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))

    await run()
    expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {
      ...config,
      apiKey: 'xxx',
      appKey: 'yyy',
      publicIds: ['public_id1', 'public_id2', 'public_id3']
    })

  })

  test('Github Action runs from js file', async () => {
    const nodePath = process.execPath
    const scriptPath = path.join(__dirname, '..', 'lib', 'main.js')
    try {
      const result = await new Promise<string>((resolve, reject) =>
        execFile(nodePath, [scriptPath], (error, stdout, stderr) =>
          error ? reject(error) : resolve(stdout.toString())
        )
      )
    } catch (error) {
      expect(error.code).toBe(1)
    }
  })
})
