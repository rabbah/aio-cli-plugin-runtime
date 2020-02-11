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

const TheCommand = require('../../../../src/commands/runtime/route/get.js')
const RuntimeBaseCommand = require('../../../../src/RuntimeBaseCommand.js')
const { stdout } = require('stdout-stderr')
const rtAction = 'routes.get'
const RuntimeLib = require('@adobe/aio-lib-runtime')

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
  const args = TheCommand.args
  expect(args).toBeDefined()
  expect(args.length).toEqual(1)

  expect(args[0].name).toEqual('basePathOrApiName')
  expect(args[0].required).toBeTruthy()
  expect(args[0].description).toBeDefined()
})

// eslint-disable-next-line jest/expect-expect
test('base flags included in command flags',
  createTestBaseFlagsFunction(TheCommand, RuntimeBaseCommand)
)

describe('instance methods', () => {
  let command, handleError, rtLib
  beforeEach(async () => {
    command = new TheCommand([])
    handleError = jest.spyOn(command, 'handleError')
    rtLib = await RuntimeLib.init({ apihost: 'fakehost', api_key: 'fakekey' })
    rtLib.mockResolved('actions.client.options', '')
    RuntimeLib.mockReset()
  })

  describe('run', () => {
    test('exists', async () => {
      expect(command.run).toBeInstanceOf(Function)
    })

    test('error, throws exception', () => {
      return new Promise((resolve, reject) => {
        rtLib.mockRejected(rtAction, new Error('an error'))
        command.argv = ['/myapi']
        return command.run()
          .then(() => reject(new Error('should not succeed')))
          .catch(() => {
            expect(handleError).toHaveBeenLastCalledWith('failed to get the api', new Error('an error'))
            resolve()
          })
      })
    })

    test('simple get call', () => {
      const cmd = rtLib.mockResolvedFixture(rtAction, 'route/get.json')
      command.argv = ['/myapi']
      return command.run()
        .then(() => {
          expect(cmd).toHaveBeenCalledWith({ basepath: '/myapi' })
          expect(stdout.output).toMatchFixture('route/get.txt')
        })
    })

    test('get invalid api', () => {
      return new Promise((resolve, reject) => {
        const cmd = rtLib.mockResolved(rtAction, { apis: [] })
        command.argv = ['/myapi']
        return command.run()
          .catch(() => {
            expect(cmd).toHaveBeenCalledWith({ basepath: '/myapi' })
            expect(handleError).toHaveBeenLastCalledWith('failed to get the api', new Error('API does not exist for basepath /myapi'))
            resolve()
          })
      })
    })
  })
})
