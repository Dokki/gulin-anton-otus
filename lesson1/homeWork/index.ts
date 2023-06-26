import yargs from 'yargs'
import { resolve } from 'node:path'
import { hideBin } from 'yargs/helpers'
import { TYPES, TTreeJson, TArgs } from './types'
import { getFoldersTree, visualIterator, validateTree, log } from './helpers'

const args = yargs(hideBin(process.argv)).default({ depth: 999 })
  .argv as unknown as TArgs
const projectRoot = resolve(__dirname)
const isRunByJest = process.mainModule === undefined

/**
 * Функция для отображения в консоле дерева,
 * в таком виде.
 * 1
 * ├── 2
 * │   ├── 3
 * │   └── 4
 * └── 5
 *     └── 6
 */
const runTask1 = async (path: string) => {
  const tree = await getFoldersTree(projectRoot, path)
  const [root] = tree
  const message = validateTree(root)

  if (message) return message

  return visualIterator(tree, args.depth)
}
/**
 * Функция для отображения в консоле дерева,
 * в таком виде.
 * Node.js
 * ├── cluster
 * │   └── index.js
 * ├── domain
 * │   ├── error.js
 * │   ├── flow.js
 * │   └── run.js
 * ├── errors
 * │   ├── counter.js
 * │   └── try-catch.js
 * ├── index.js
 * └── worker
 *  4 directories, 7 files
 */
const runTask2 = async (path: string) => {
  const count = { folders: 0, files: 0 }
  const tree = await getFoldersTree(projectRoot, path, (item: TTreeJson) => {
    if (item.is === TYPES.folder) count.folders += 1
    else count.files += 1
  })
  const [root] = tree
  const message = validateTree(root)

  if (message) return message

  return `${visualIterator(tree, args.depth)}\n${count.folders} directories, ${
    count.files
  } files`
}

export const run = async (path: string, task: number) => {
  if (!path) return 'The path to folder must be a specified'

  switch (task) {
    case 1:
      return await runTask1(path)
    case 2:
      return await runTask2(path)
    default:
      return 'Nothing to show'
  }
}
// Нам не нужно запускать функцию если этот файл запустил Jest.
// А так же что бы как то отображалось в coverage.
/* istanbul ignore next */
if (!isRunByJest)
  (async () => {
    log(await run(args.path, args.task).catch(log))
  })()
