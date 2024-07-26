type Merge<T, U> = Omit<T, keyof U> & U;
/** 判断相等 */
type isEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
/**
 * 提取具有相应值类型的键名
 *
 * @template T 对象
 * @template U 值类型
 */
type ExtractKey<T extends {}, V, K = keyof T> = K extends keyof T
  ? isEqual<T[K], V> extends true
    ? K
    : never
  : never;

type EventType<T extends EventTarget, K = keyof T> = keyof T extends infer K
  ? K extends `on${infer ET}`
    ? ET
    : never
  : never;
type EventValue<T extends EventTarget, K extends EventType<T>> = Parameters<
  T[`on${K}`]
>[0];

type Selector<K extends keyof HTMLElementTagNameMap> =
  | K
  | `${'#' | '.' | ''}${string}${' ' | '>'}${K}`
  | `${K}${`[${string}]` | `${':' | '#' | '.'}${string}`}`;
type El = Document | DocumentFragment | Element;
