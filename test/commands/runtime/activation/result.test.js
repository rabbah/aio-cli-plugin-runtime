/*
Copyright 2019 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { stdout } = require('stdout-stderr')
const TheCommand = require('../../../../src/commands/runtime/activation/result.js')
const RuntimeBaseCommand = require('../../../../src/RuntimeBaseCommand.js')
const ow = require('openwhisk')()
const owAction = 'activations.result'

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof RuntimeBaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toBeDefined()
  expect(TheCommand.aliases).toBeInstanceOf(Array)
  expect(TheCommand.aliases.length).toBeGreaterThan(0)
})

test('args', async () => {
  const logName = TheCommand.args[0]
  expect(logName.name).toBeDefined()
  expect(logName.name).toEqual('activationId')
})

test('flags', async () => {
  const flag = TheCommand.flags.last
  expect(flag).toBeDefined()
  expect(flag.description).toBeDefined()
  expect(flag.char).toBe('l')
  const count = TheCommand.flags.count
  expect(count).toBeDefined()
  expect(count.description).toBeDefined()
  expect(count.char).toBe('c')
  const filter = TheCommand.flags.filter
  expect(filter).toBeDefined()
  expect(filter.description).toBeDefined()
  expect(filter.char).toBe('f')
})

describe('instance methods', () => {
  let command, handleError

  beforeEach(() => {
    command = new TheCommand([])
    handleError = jest.spyOn(command, 'handleError')
  })

  describe('run', () => {
    test('exists', async () => {
      expect(command.run).toBeInstanceOf(Function)
    })

    test('retrieve results of an activation', () => {
      const cmd = ow.mockResolved(owAction, '')
      command.argv = ['12345']
      return command.run()
        .then(() => {
          expect(cmd).toHaveBeenCalledWith('12345')
          expect(stdout.output).toMatch('')
        })
    })

    test('retrieve last activation results --last', () => {
      const axList = ow.mockResolved('activations.list', [{ activationId: '12345' }])
      const axGet = ow.mockResolved(owAction, '')
      command.argv = ['--last']
      return command.run()
        .then(() => {
          expect(axList).toHaveBeenCalled()
          expect(axGet).toHaveBeenCalledWith('12345')
          expect(stdout.output).toMatch('')
        })
    })

    test('retrieve last activation results --last --count', () => {
      const axList = ow.mockResolved('activations.list', [
        { activationId: '12' },
        { activationId: '34' }
      ])
      const axGet = ow.mockResolved(owAction, '')
      command.argv = ['--last', '--count', '2']
      return command.run()
        .then(() => {
          expect(axList).toHaveBeenCalledWith({ limit: 2, skip: 0 })
          expect(axGet).toHaveBeenCalledWith('12')
          expect(axGet).toHaveBeenCalledWith('34')
          expect(stdout.output).toMatch('')
        })
    })

    test('retrieve last activation results --last --count --filter', () => {
      const axList = ow.mockResolved('activations.list', [
        { activationId: '12' },
        { activationId: '34' }
      ])
      const axGet = ow.mockResolved(owAction, '')
      command.argv = ['--last', '--count', '2', '--filter', 'f/g']
      return command.run()
        .then(() => {
          expect(axList).toHaveBeenCalledWith({ limit: 2, skip: 0, name: 'f/g' })
          expect(axGet).toHaveBeenCalledWith('12')
          expect(axGet).toHaveBeenCalledWith('34')
          expect(stdout.output).toMatch('')
        })
    })

    test('map status code to string', () => {
      expect(TheCommand.statusToString(0)).toMatch('success')
      expect(TheCommand.statusToString(1)).toMatch('application error')
      expect(TheCommand.statusToString(2)).toMatch('developer error')
      expect(TheCommand.statusToString(3)).toMatch('system error')
    })

    test('should fail on get activation result w/ noflag, no activationId', async () => {
      const runResult = command.run()
      await expect(runResult instanceof Promise).toBeTruthy()
      await expect(runResult).rejects.toThrow('Missing required arg: `activationId`')
    })

    test('errors out on api error', () => {
      return new Promise((resolve, reject) => {
        ow.mockRejected(owAction, new Error('an error'))
        command.argv = ['hello']
        return command.run()
          .then(() => reject(new Error('does not throw error')))
          .catch(() => {
            expect(handleError).toHaveBeenLastCalledWith('failed to retrieve results for activation', new Error('an error'))
            resolve()
          })
      })
    })
  })
})
