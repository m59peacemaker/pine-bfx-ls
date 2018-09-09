import { EOL } from 'os'

const identity = v => v

const comment = string => string.split(EOL)
  .map(line => `// ${line}`)
  .join(EOL)

const string = v => `"${v}"`

const listItem = value => typeof value == "string"
  ? string(value)
  : value

const list = array => `[ ${array.map(listItem).join(', ')} ]`

const lookup = (variable, map, lookupFn = identity, defaultValue) => Object
  .keys(map)
  .reduce(
    (acc, key) => `${acc}${variable} == ${string(key)} ? ${lookupFn(map[key], key, map)} : `,
    ''
  ) + defaultValue

export {
  comment,
  string,
  listItem,
  list,
  lookup
}
