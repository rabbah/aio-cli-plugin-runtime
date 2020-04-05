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
const { flags } = require('@oclif/command')
const RuntimeBaseCommand = require('../../../RuntimeBaseCommand')
const { printLogs } = require('@adobe/aio-lib-runtime').utils
const chalk = require('chalk')
const ActivationListLimits = require('./list').limits

class ActivationGet extends RuntimeBaseCommand {
  async run () {
    const { args, flags } = this.parse(ActivationGet)
    const ow = await this.wsk()
    const filter = flags.action
    const limit = Math.max(1, Math.min(flags.limit, ActivationListLimits.max))
    const options = { limit, skip: flags.skip }
    let id = args.activationId

    try {
      if (!id) {
        if (filter) {
          options.name = filter
        }
        const ax = await ow.activations.list(options)
        if (ax && ax.length > 0) {
          id = ax[0].activationId
        } else {
          return this.handleError('no activations were returned')
        }
      }

      if (!id) {
        this.error('missing required argument activationID')
      }

      if (flags.logs) {
        this.log('activation logs %s', id)
        const result = await ow.activations.logs(id)
        printLogs(result, true, this.log)
      } else {
        const result = await ow.activations.get(id)
        this.logJSON('', result)
      }
    } catch (err) {
      this.handleError('failed to retrieve the activation', err)
    }
  }
}

ActivationGet.args = [
  {
    name: 'activationID'
  }
]

ActivationGet.flags = {
  ...RuntimeBaseCommand.flags,
  last: flags.boolean({
    char: 'l',
    description: 'Fetch the most recent activation (default)'
  }),
  limit: flags.integer({
    char: 'n',
    description: `Fetch the last LIMIT activation (up to ${ActivationListLimits.max})`,
    default: 1
  }),
  skip: flags.integer({
    char: 's',
    description: 'SKIP number of activations',
    default: 0
  }),
  logs: flags.boolean({
    char: 'g',
    description: 'Emit only the logs, stripped of time stamps and stream identifier'
  }),
  result: flags.boolean({
    char: 'r',
    description: 'Emit only the result'
  }),
  action: flags.string({
    char: 'a',
    description: 'Fetch logs for a specific action'
  })
}

ActivationGet.description = 'Retrieves an Activation'
ActivationGet.aliases = [
  'rt:activation:get'
]

module.exports = ActivationGet
