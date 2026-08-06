import { loadConfig, getConfig, setConfig } from '@spakjs/config'
import kleur from 'kleur'
import { CommandDeclaration } from '@spakjs/util'
import { T } from '@spakjs/i18n'

const configCommands: CommandDeclaration[] = [
  {
    command: 'config',
    description: 'Manage Spak configuration',
    args: [],
    action: () => {
      console.log(T('spak.ccmd.config.help'))
    },
  },
  {
    command: 'config list',
    description: 'List all configuration',
    action: () => {
      const cfg = loadConfig()
      console.log(JSON.stringify(cfg, null, 2))
    },
  },
  {
    command: 'config get',
    description: 'Get a configuration value',
    args: [{ name: 'key', description: 'Configuration key', required: true }],
    action: (args) => {
      if (!args.key) {
        console.log(kleur.red(T('spak.ccmd.config.get_usage')))
        return
      }
      const val = getConfig(args.key)
      if (val === undefined) {
        console.log(kleur.red(T('spak.ccmd.config.key_not_found', { key: args.key })))
      } else {
        console.log(`${args.key} = ${JSON.stringify(val)}`)
      }
    },
  },
  {
    command: 'config set',
    description: 'Set a configuration value',
    args: [
      { name: 'key', description: 'Configuration key', required: true },
      { name: 'value', description: 'Configuration value' },
    ],
    action: (args) => {
      if (!args.key) {
        console.log(kleur.red(T('spak.ccmd.config.set_usage')))
        return
      }
      if (args.key === 'language') {
        const validLangs = ['zh', 'en']
        if (!args.value || typeof args.value !== 'string' || !validLangs.includes(args.value)) {
          console.log(kleur.red(T('spak.ccmd.config.language_invalid', { lang: String(args.value), options: validLangs.join(' / ') })))
          return
        }
        setConfig('language', args.value)
        console.log(kleur.green(T('spak.ccmd.config.language_set', { lang: args.value })))
        return
      }
      let parsedValue: any = args.value
      try { parsedValue = JSON.parse(args.value) } catch {}
      setConfig(args.key, parsedValue)
      console.log(kleur.green(T('spak.ccmd.config.set_success', { key: args.key, value: JSON.stringify(parsedValue) })))
    },
  },
]

export default configCommands
