import { Stats } from 'node:fs'
import { TTreeJson, TYPES } from './types'
import { lstat, readdir } from 'node:fs/promises'

/***
 * Вспомогательная функция для парсинга параметров с package.json
 */
export const parseArgs = (...args: string[]) =>
  [...args].reduce(
    (acc: Record<string, string | number | boolean>, item) => {
      if (item) {
        const [name, value] = item.split('=')
        const number = parseInt(value)

        if (isNaN(number))
          acc[name.slice(1)] = value !== undefined ? value : true
        else acc[name.slice(1)] = number
      }

      return acc
    },
    {
      depth: 999,
    },
  )

/***
 * Вспомогательная функция для определения типа item
 */
export const getItemType = (stats: Stats) =>
  stats.isDirectory() ? TYPES.folder : TYPES.file

/***
 * Функция рекурсивно собирает дерево папок и файлов в объект,
 * для последующей обработки.
 */
export const getFoldersTree = async (
  projectRoot: string,
  argsPath: string,
  callback?: (item: TTreeJson) => void,
): Promise<TTreeJson[]> => {
  const taskPath = `${projectRoot}/${argsPath}`
  const iterator = async (folderPath: string) => {
    const files = await readdir(folderPath)

    return await Promise.all(
      files.map(async (name) => {
        const path = `${folderPath}/${name}`
        const stats = await lstat(path)
        const item: TTreeJson = { name, path, is: getItemType(stats) }

        if (item.is === TYPES.folder) item.items = await iterator(path)

        callback && callback(item)

        return item
      }),
    )
  }

  return [
    {
      name: argsPath.slice(1),
      path: taskPath,
      is: TYPES.folder,
      items: await iterator(taskPath),
    },
  ]
}

/***
 * Функция рекурсивно из объекта рисует дерево,
 * для последующего показа в консоле.
 */
export const visualIterator = (
  items: TTreeJson[],
  depth: number,
  nesting = 0,
  prefix = '',
) =>
  items.reduce((acc, item, index) => {
    const padding = nesting > 1 ? ' '.repeat(nesting * 2) : ''
    const space = nesting === 0 ? '' : ' '

    if (prefix) acc += `${prefix}${padding.slice(1)}`
    else acc += `${padding}`

    if (nesting > 0) {
      acc += items[index + 1] !== undefined ? '├──' : '└──'
    }

    acc += `${space}${item.name}\n`

    if (item.items && item.items.length && nesting < depth) {
      acc += visualIterator(
        item.items,
        depth,
        nesting + 1,
        items[index + 1] !== undefined ? '│' : '',
      )
    }

    return acc
  }, '')
