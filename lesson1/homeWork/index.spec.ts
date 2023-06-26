import { Stats } from 'node:fs'
import { resolve } from 'node:path'
import mockFs from 'mock-fs'
import { TYPES, TTreeJson } from './types'
import {
  getItemType,
  getFoldersTree,
  visualIterator,
  validateTree,
} from './helpers'
import { run } from './index'

type TAllTypes = boolean | number | string | unknown

const projectRoot = resolve(__dirname)
const mocks = {
  getItemType: [
    {
      name: 'Node.js',
      is: 0,
      isExist: true,
      items: [
        {
          name: 'cluster',
          is: 0,
          items: [
            {
              name: 'index.js',
              is: 1,
            },
          ],
        },
        {
          name: 'domain',
          is: 0,
          items: [
            {
              name: 'error.js',
              is: 1,
            },
            {
              name: 'flow.js',
              is: 1,
            },
            {
              name: 'run.js',
              is: 1,
            },
          ],
        },
        {
          name: 'errors',
          is: 0,
          items: [
            {
              name: 'counter.js',
              is: 1,
            },
            {
              name: 'try-catch.js',
              is: 1,
            },
          ],
        },
        {
          name: 'index.js',
          is: 1,
        },
        {
          name: 'worker',
          is: 0,
          items: [],
        },
      ],
    },
  ],
  visualIterator: {
    task1: `1
├── 2
│   ├── 3
│   └── 4
└── 5
    └── 6`,
    withoutCount: `Node.js
├── cluster
│   └── index.js
├── domain
│   ├── error.js
│   ├── flow.js
│   └── run.js
├── errors
│   ├── counter.js
│   └── try-catch.js
├── index.js
└── worker`,
    withDeep: `Node.js
├── cluster
├── domain
├── errors
├── index.js
└── worker`,
    withCount: `Node.js
├── cluster
│   └── index.js
├── domain
│   ├── error.js
│   ├── flow.js
│   └── run.js
├── errors
│   ├── counter.js
│   └── try-catch.js
├── index.js
└── worker
4 directories, 7 files`,
  },
  messages: {
    notExist: 'Folder is not exist',
    empty: 'Empty folder',
    notSpecified: 'The path to folder must be a specified',
    nothingShow: 'Nothing to show',
  },
}
const countItems = (tree: TTreeJson[]): number =>
  tree.reduce((count, item): number => {
    if (item.items) count += countItems(item.items)

    return ++count
  }, 0)

beforeEach(() => {
  mockFs({
    [`${projectRoot}/1`]: {
      2: {
        3: {},
        4: {},
      },
      5: {
        6: {},
      },
    },
    [`${projectRoot}/Node.js`]: {
      cluster: {
        'index.js': '',
      },
      domain: {
        'error.js': '',
        'flow.js': '',
        'run.js': '',
      },
      errors: {
        'counter.js': '',
        'try-catch.js': '',
      },
      worker: {},
      'index.js': '',
    },
  })
})

afterEach(() => {
  mockFs.restore()
})

describe('Tree js', () => {
  describe('Helpers functions', () => {
    it('Функция getItemType должна возвращать тип файла, 0 или 1.', () => {
      // Имитируем объект Stats с Ноды.
      const stats = (result: TAllTypes) =>
        ({
          isDirectory: () => result,
        } as Stats)

      expect(getItemType(stats(true))).toBe(TYPES.folder)
      expect(getItemType(stats(999))).toBe(TYPES.folder)
      expect(getItemType(stats('2'))).toBe(TYPES.folder)
      expect(getItemType(stats(false))).toBe(TYPES.file)
      expect(getItemType(stats(0))).toBe(TYPES.file)
      expect(getItemType(stats(''))).toBe(TYPES.file)
      expect(getItemType(stats(undefined))).toBe(TYPES.file)
    })

    it('Функция validateTree должна вернуть сообщение либо пустую строку.', () => {
      const item = { name: 'some name', is: TYPES.folder, items: [] }
      const resultNotExist = validateTree({
        isExist: false,
        items: [item],
      })
      const resultIsEmpty = validateTree({ isExist: true, items: [] })
      const resultIsNormal = validateTree({ isExist: true, items: [item] })
      // Проверка на существование папки.
      expect(resultNotExist).toBe(mocks.messages.notExist)
      // Проверка на пустоту папки.
      expect(resultIsEmpty).toBe(mocks.messages.empty)
      // Проверка на пустоту папки.
      expect(resultIsNormal).toBe('')
    })

    it('Функция getFoldersTree должна возвращать дерево.', async () => {
      // Колбэк для подсчета файлов.
      const callback = jest.fn((item) => item)
      // На входе путь до папки и папка из которой будем собирать дерево и callback.
      const result = await getFoldersTree(projectRoot, 'Node.js', callback)
      // Сама папка Node.js
      const [root] = result
      // Рутовая папка не считается, считаем все что внутри.
      const count = countItems(root?.items ?? [])
      // Результат должен совпадать.
      expect(result).toEqual(mocks.getItemType)
      // Кол-во вызовов функции и кол-во файлов и папок должно совпадать.
      expect(callback).toBeCalledTimes(count)
    })

    it('Функция visualIterator должна возвращать дерево в виде string. Без deep ограничения.', () => {
      // Передаем моки дерева.
      const result = visualIterator(mocks.getItemType)

      expect(result).toEqual(mocks.visualIterator.withoutCount)
    })

    it('Функция visualIterator должна возвращать дерево в виде string. С deep ограничением.', () => {
      // Передаем моки дерева и deep === 1. Ищем только первый уровень.
      const result = visualIterator(mocks.getItemType, 1)

      expect(result).toEqual(mocks.visualIterator.withDeep)
    })
  })

  describe('Catch errors', () => {
    it('Функция run должна возвращать сообщение если переданы не правильные параметры.', async () => {
      const resultWrongPath = await run('', 1)
      const resultWrongTask = await run('1', 3)
      // Проверка на path.
      expect(resultWrongPath).toBe(mocks.messages.notSpecified)
      // Проверка на task.
      expect(resultWrongTask).toBe(mocks.messages.nothingShow)
    })

    it('Функция runTask1 должна возвращать сообщение если папка пуста или не существует.', async () => {
      const resultNotExist = await run('2', 1)
      const resultIsEmpty = await run('1/2/3', 1)
      // Проверка на существование папки.
      expect(resultNotExist).toBe(mocks.messages.notExist)
      // Проверка на пустоту папки.
      expect(resultIsEmpty).toBe(mocks.messages.empty)
    })

    it('Функция runTask2 должна возвращать сообщение если папка пуста или не существует.', async () => {
      const resultNotExist = await run('2', 2)
      const resultIsEmpty = await run('1/2/3', 2)
      // Проверка на существование папки.
      expect(resultNotExist).toBe(mocks.messages.notExist)
      // Проверка на пустоту папки.
      expect(resultIsEmpty).toBe(mocks.messages.empty)
    })
  })

  describe('Main functions', () => {
    it('Функция run должна возвращать дерево в виде string. Без подсчета папок и файлов.', async () => {
      const result = await run('1', 1)

      expect(result).toEqual(mocks.visualIterator.task1)
    })

    it('Функция run должна возвращать дерево в виде string. С подсчетом папок и файлов.', async () => {
      const result = await run('Node.js', 2)

      expect(result).toEqual(mocks.visualIterator.withCount)
    })
  })
})
