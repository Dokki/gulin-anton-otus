import { Readable } from 'node:stream'
import { TCollect } from './types'

/***
 * Вспомогательная функция для парсинга параметров с package.json
 */
export const parseNames = (names: string) =>
  (names || '').trim().split(/\s*,\s*/)

// eslint-disable-next-line no-console
export const log = console.log.bind(console)

const regExps = {
  cleanNonWordCharacter: /\W/gm,
  cleanSpaces: /\s+/gm,
}
/***
 * Трансформируем чанки в строку.
 */
export async function* toString(source: Readable) {
  for await (const chunk of source) yield chunk.toString()
}
/***
 * Чистим строку от не нужных символов и лишних пробелов.
 * Трансформируем в массив.
 * Фильтруем от не валидных значений.
 */
export async function* clean(source: Readable) {
  for await (const chunk of source)
    yield {
      // Нужен оригинальный текст для дальнейшего вывода его в файл. Так нагляднее.
      text: chunk,
      cleaned: chunk
        .replaceAll(regExps.cleanNonWordCharacter, ' ')
        .replaceAll(regExps.cleanSpaces, ' ')
        .split(' ')
        .filter(Boolean),
    }
}

const stringify = (value: unknown) => JSON.stringify(value).replaceAll('"', "'")
const toVisual = (text: string, collected: TCollect) => `Text: ${text}
Words:
${stringify(collected)}
Result:
${stringify(Object.values(collected))}`
/***
 * Собираем чанки для изначального текста и сам результат.
 * Сортируем по алфавиту.
 * Подсчитываем слова и отдаем дальше как стрингу.
 */
export async function* collect(source: Readable) {
  const text: string[] = []
  const result: string[] = []

  for await (const chunk of source) {
    text.push(chunk.text)
    result.push(...chunk.cleaned)
  }

  result.sort()

  yield toVisual(
    text.join(''),
    result.reduce((acc, word) => {
      if (acc[word] === undefined) acc[word] = 1
      else acc[word]++

      return acc
    }, {} as TCollect),
  )
}
