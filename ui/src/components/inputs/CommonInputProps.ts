/**
 * All inputs must accept these props.
 * @param T The type of the input's value
 */
export type CommonInputProps<T> = {
  /**
   * The input's value, which must match the type returned by `getDefaultValue(InputType)`.
   */
  defaults: T;
};
