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

const fs = require('fs')
const moment = require('moment')
const RuntimeBaseCommand = require('../../../RuntimeBaseCommand')
const { fileExtensionForKind } = require('../../../kinds')
const { flags } = require('@oclif/command')

class ActionGet extends RuntimeBaseCommand {
  async run () {
    const { args, flags } = this.parse(ActionGet)
    const name = args.actionName
    const ow = await this.wsk()

    try {
      if ((flags['save-as'] !== undefined && flags['save-as'].length === 0) ||
          (flags['save-env'] !== undefined && flags['save-env'].length === 0)) {
        throw (new Error(ActionGet.invalidFilename))
      }

      const result = await ow.actions.get(name)
      // rewrite updated to human readable form
      result.date = moment(result.updated).format('YYYY-MM-DD HH:mm:ss')

      if (flags.url) {
        /*
          wsk go client uses :
          Properties.APIHost
          DefaultOpenWhiskApiPath = "/api"
          Properties.APIVersion
          qualifiedName.GetPackageName()
        */
        const opts = ow.actions.client.options
        const webFlag = result.annotations.find(elem => elem.key === 'web-export')
        const webAction = webFlag !== undefined && webFlag.value === true

        let [namespace, packageName] = result.namespace.split('/')
        const actionPartOfPackage = !!packageName

        if (webAction) {
          const web = 'web'
          packageName = actionPartOfPackage ? packageName : 'default'
          this.log(`${opts.api}${web}/${namespace}/${packageName}/${result.name}`)
        } else {
          const nsPrefix = 'namespaces'
          const actionPrefix = 'actions'
          packageName = actionPartOfPackage ? packageName + '/' : ''
          this.log(`${opts.api}${nsPrefix}/${namespace}/${actionPrefix}/${packageName}${result.name}`)
        }
      } else {
        const saveFile = flags['save-as']
        const saveEnv = flags['save-env']
        const saveEnvJson = flags['save-env-json']

        if (flags.save || saveFile || saveEnv || saveEnvJson) {
          // allow env and code to be saved together
          if (saveEnv) {
            const saveEnvFileName = saveEnv
            const envVars = result.parameters.filter(_ => _.init).map(_ => `${_.key}=${_.value}`)
            fs.writeFileSync(saveEnvFileName, envVars.join('\n'))
          }
          if (saveEnvJson) {
            const saveEnvFileName = saveEnvJson
            const envVars = {}
            result.parameters.filter(_ => _.init).map(_ => { envVars[_.key] = _.value })
            fs.writeFileSync(saveEnvFileName, JSON.stringify(envVars, null, 2))
          }
          if (result.exec.binary) {
            const saveFileName = saveFile || `${result.name}.zip`
            const data = Buffer.from(result.exec.code, 'base64')
            fs.writeFileSync(saveFileName, data, 'buffer')
          } else {
            const extension = fileExtensionForKind(result.exec.kind)
            const saveFileName = saveFile || `${result.name}${extension}`
            fs.writeFileSync(saveFileName, result.exec.code)
          }
        } else if (ActionGet.fullGet) {
          this.logJSON('', result)
        } else if (flags.code) {
          if (!result.exec.binary) {
            this.log(result.exec.code)
          } else {
            throw new Error(ActionGet.codeNotText)
          }
        } else {
          // destructure getAction to remove the exec.code
          this.logJSON('', { ...result,
            exec: { ...result.exec,
              code: undefined
            }
          })
        }
      }
    } catch (err) {
      if (err.message === ActionGet.codeNotText || err.message === ActionGet.invalidFilename) {
        this.handleError(err.message)
      } else {
        this.handleError('failed to retrieve the action', err)
      }
    }
  }
}

ActionGet.fullGet = false

ActionGet.args = [
  {
    name: 'actionName',
    required: true
  }
]

ActionGet.flags = {
  ...RuntimeBaseCommand.flags,
  url: flags.boolean({
    char: 'r',
    description: 'get action url'
  }),
  code: flags.boolean({
    char: 'c',
    description: 'show action code (only works if code is not a zip file'
  }),
  'save-env': flags.string({
    char: 'E',
    description: 'save environment variables to FILE as key-value pairs'
  }),
  'save-env-json': flags.string({
    char: 'J',
    description: 'save environment variables to FILE as JSON'
  }),
  save: flags.boolean({
    description: 'save action code to file corresponding with action name'
  }),
  'save-as': flags.string({
    description: 'file to save action code to'
  })
}

ActionGet.codeNotText = 'Cannot display code because it is not plaintext.'
ActionGet.invalidFilename = 'Must specify a valid file name.'

ActionGet.description = 'Retrieves an Action'

ActionGet.aliases = ['rt:action:get']

module.exports = ActionGet
