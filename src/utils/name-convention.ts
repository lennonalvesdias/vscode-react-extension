/**
 * Transform dashcase to PascalCase
 *
 * soma-button -> SomaButton
 * soma -> Soma
 * soma-button-group -> SomaButtonGroup
 */
export function dashToPascal(value: string) {
  return value
    .split('-')
    .map(x => x[0].toUpperCase() + x.slice(1))
    .join('');
}

/**
 * Transform PascalCase to dashcase
 *
 * SomaButton -> soma-button
 * SomaButtonGroup -> soma-button-group
 * Soma -> soma
 */
export function pascalToDash(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Transform camelCase to PascalCase
 */
export function cammelToPascal(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

/**
 * Transform dash-case to title case.
 * Example: test_value -> Test Value
 *
 * @param value
 */
export function dashToTitle(value: string) {
  return value
    .split('_')
    .map(x => x[0].toUpperCase() + x.slice(1))
    .join(' ');
}